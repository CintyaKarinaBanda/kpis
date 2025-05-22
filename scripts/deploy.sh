#!/bin/bash
# Script para desplegar la aplicación en AWS

# Importar scripts de plantillas
source "$(dirname "$0")/frontend_templates.sh"
source "$(dirname "$0")/frontend_templates_part2.sh"
source "$(dirname "$0")/frontend_templates_part3.sh"

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Configuración
STACK_NAME="kpi-dashboard"
TEMPLATE_FILE="../infrastructure/cloudformation.yaml"
REGION="us-east-1"
ENVIRONMENT="dev"
DOMAIN_NAME=""
CERTIFICATE_ARN=""
ADMIN_EMAIL=""
SKIP_FRONTEND_BUILD=false

# Función para mostrar mensajes
print_message() {
  echo -e "${2}${1}${NC}"
}

# Función para mostrar ayuda
show_help() {
  echo "Uso: $0 [opciones]"
  echo ""
  echo "Opciones:"
  echo "  -h, --help                Muestra esta ayuda"
  echo "  -s, --stack-name NOMBRE   Nombre del stack de CloudFormation (default: kpi-dashboard)"
  echo "  -r, --region REGIÓN       Región de AWS (default: us-east-1)"
  echo "  -e, --env ENTORNO         Entorno de despliegue (dev, test, prod) (default: dev)"
  echo "  -d, --domain DOMINIO      Nombre de dominio para el frontend"
  echo "  -c, --cert ARN            ARN del certificado SSL para CloudFront"
  echo "  -a, --admin-email EMAIL   Email del administrador para notificaciones"
  echo "  --skip-frontend           Omitir la construcción y despliegue del frontend"
  echo ""
}

# Procesar argumentos
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -h|--help)
      show_help
      exit 0
      ;;
    -s|--stack-name)
      STACK_NAME="$2"
      shift
      shift
      ;;
    -r|--region)
      REGION="$2"
      shift
      shift
      ;;
    -e|--env)
      ENVIRONMENT="$2"
      shift
      shift
      ;;
    -d|--domain)
      DOMAIN_NAME="$2"
      shift
      shift
      ;;
    -c|--cert)
      CERTIFICATE_ARN="$2"
      shift
      shift
      ;;
    -a|--admin-email)
      ADMIN_EMAIL="$2"
      shift
      shift
      ;;
    --skip-frontend)
      SKIP_FRONTEND_BUILD=true
      shift
      ;;
    *)
      print_message "Opción desconocida: $1" "$RED"
      show_help
      exit 1
      ;;
  esac
done

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
  print_message "AWS CLI no está instalado. Por favor, instálalo primero." "$RED"
  exit 1
fi

# Verificar si el usuario está autenticado en AWS
if ! aws sts get-caller-identity &> /dev/null; then
  print_message "No estás autenticado en AWS. Por favor, ejecuta 'aws configure' primero." "$RED"
  exit 1
fi

# Solicitar parámetros obligatorios si no se proporcionaron
if [ -z "$ADMIN_EMAIL" ]; then
  print_message "Ingresa el email del administrador para notificaciones:" "$YELLOW"
  read ADMIN_EMAIL
  if [ -z "$ADMIN_EMAIL" ]; then
    print_message "El email del administrador es obligatorio." "$RED"
    exit 1
  fi
fi

# Verificar si el template existe
if [ ! -f "$TEMPLATE_FILE" ]; then
  print_message "El archivo de plantilla CloudFormation no existe: $TEMPLATE_FILE" "$RED"
  exit 1
fi

# Construir los parámetros para CloudFormation
PARAMS="ParameterKey=Environment,ParameterValue=$ENVIRONMENT ParameterKey=AdminEmail,ParameterValue=$ADMIN_EMAIL"

# Agregar parámetros opcionales si se proporcionaron
if [ ! -z "$DOMAIN_NAME" ]; then
  PARAMS="$PARAMS ParameterKey=DomainName,ParameterValue=$DOMAIN_NAME"
fi

if [ ! -z "$CERTIFICATE_ARN" ]; then
  PARAMS="$PARAMS ParameterKey=CertificateArn,ParameterValue=$CERTIFICATE_ARN"
fi

# Desplegar el stack de CloudFormation usando el archivo local
print_message "Desplegando stack de CloudFormation: $STACK_NAME" "$YELLOW"
aws cloudformation deploy \
  --template-file "$TEMPLATE_FILE" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides $PARAMS \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region "$REGION"

# Verificar si el despliegue fue exitoso
if [ $? -eq 0 ]; then
  print_message "Stack de CloudFormation desplegado exitosamente!" "$GREEN"
  
  # Obtener las salidas del stack
  print_message "Obteniendo información del stack..." "$YELLOW"
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs" --output table --region "$REGION"
  
  # Obtener el bucket de frontend para desplegar la aplicación
  FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text --region "$REGION")
  API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text --region "$REGION")
  USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text --region "$REGION")
  USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text --region "$REGION")
  
  print_message "Información para el despliegue del frontend:" "$GREEN"
  echo "REACT_APP_API_URL=$API_ENDPOINT"
  echo "S3_BUCKET=$FRONTEND_BUCKET"
  echo "USER_POOL_ID=$USER_POOL_ID"
  echo "USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID"
  
  # Actualizar la configuración del cliente de Cognito con una configuración simplificada
  print_message "Actualizando configuración del cliente de Cognito..." "$YELLOW"
  
  # Definir la URL base del bucket S3
  BUCKET_URL="https://$FRONTEND_BUCKET.s3.$REGION.amazonaws.com"
  
  # Actualizar el cliente de Cognito con una configuración simplificada
  aws cognito-idp update-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$USER_POOL_CLIENT_ID" \
    --callback-urls "$BUCKET_URL/callback.html" \
    --logout-urls "$BUCKET_URL/index.html" \
    --explicit-auth-flows "ALLOW_USER_SRP_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" \
    --supported-identity-providers "COGNITO" \
    --prevent-user-existence-errors "ENABLED" \
    --region "$REGION"
  
  print_message "Configuración del cliente de Cognito actualizada correctamente" "$GREEN"
  
  # Generar una contraseña temporal que cumpla con la política de contraseñas de Cognito
  print_message "Creando usuario administrador en Cognito..." "$YELLOW"
  
  # Usar una contraseña fija que sabemos que cumple con todos los requisitos
  TEMP_PASSWORD="Temp123!@#$(date +%s | md5 | head -c 4)"
  
  aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true Name=name,Value="Administrador" \
    --temporary-password "$TEMP_PASSWORD" \
    --region "$REGION"
  
  print_message "Usuario administrador creado con éxito:" "$GREEN"
  echo "Email: $ADMIN_EMAIL"
  echo "Contraseña temporal: $TEMP_PASSWORD"
  echo ""
  print_message "IMPORTANTE: Deberás cambiar esta contraseña en el primer inicio de sesión" "$YELLOW"
  
  # Desplegar el frontend si no se omitió
  if [ "$SKIP_FRONTEND_BUILD" = false ]; then
    print_message "Preparando el despliegue del frontend..." "$YELLOW"
    
    # Crear directorio temporal para el frontend
    TEMP_DIR="/tmp/kpi-dashboard-frontend-build"
    mkdir -p "$TEMP_DIR"
    
    # Crear los archivos HTML directamente usando las funciones importadas
    create_frontend_files "$TEMP_DIR" "$API_ENDPOINT" "$FRONTEND_BUCKET" "$USER_POOL_ID" "$USER_POOL_CLIENT_ID" "$ADMIN_EMAIL"
    create_frontend_files_part2 "$TEMP_DIR" "$USER_POOL_ID" "$USER_POOL_CLIENT_ID"
    create_frontend_files_part3 "$TEMP_DIR" "$USER_POOL_ID" "$USER_POOL_CLIENT_ID"
    
    # Subir archivos al bucket S3
    print_message "Subiendo archivos al bucket S3: $FRONTEND_BUCKET" "$YELLOW"
    aws s3 sync "$TEMP_DIR/" "s3://$FRONTEND_BUCKET/" --delete --region "$REGION"
    
    # Limpiar directorio temporal
    rm -rf "$TEMP_DIR"
    
    # Configurar notificaciones de S3 para el bucket CSV
    CSV_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='CSVBucketName'].OutputValue" --output text --region "$REGION")
    CSV_PROCESSOR_ARN=$(aws lambda get-function --function-name "${ENVIRONMENT}-kpi-dashboard-csv-processor" --query 'Configuration.FunctionArn' --output text --region "$REGION")
    
    print_message "Configurando notificaciones para el bucket CSV: $CSV_BUCKET" "$YELLOW"
    aws s3api put-bucket-notification-configuration \
      --bucket "$CSV_BUCKET" \
      --notification-configuration "{\"LambdaFunctionConfigurations\":[{\"LambdaFunctionArn\":\"$CSV_PROCESSOR_ARN\",\"Events\":[\"s3:ObjectCreated:*\"],\"Filter\":{\"Key\":{\"FilterRules\":[{\"Name\":\"suffix\",\"Value\":\".csv\"}]}}}]}" \
      --region "$REGION"
    
    print_message "Frontend desplegado exitosamente en: https://$FRONTEND_BUCKET.s3.$REGION.amazonaws.com/index.html" "$GREEN"
    
    # Obtener la URL de CloudFront si está disponible
    CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='FrontendURL'].OutputValue" --output text --region "$REGION")
    if [ ! -z "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "None" ]; then
      print_message "URL de CloudFront: $CLOUDFRONT_URL" "$GREEN"
      
      # Obtener el ID de la distribución de CloudFront
      CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='${CLOUDFRONT_URL#https://}'].Id" --output text --region "$REGION")
      
      if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ] && [ "$CLOUDFRONT_DISTRIBUTION_ID" != "None" ]; then
        print_message "Invalidando caché de CloudFront..." "$YELLOW"
        
        # Crear una invalidación para todos los archivos
        INVALIDATION_ID=$(aws cloudfront create-invalidation \
          --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
          --paths "/*" \
          --query "Invalidation.Id" \
          --output text \
          --region "$REGION")
        
        print_message "Invalidación de CloudFront iniciada (ID: $INVALIDATION_ID)" "$GREEN"
        print_message "La invalidación puede tardar unos minutos en completarse." "$YELLOW"
      else
        print_message "No se pudo obtener el ID de la distribución de CloudFront para invalidar la caché." "$YELLOW"
      fi
    fi
  else
    print_message "Para desplegar el frontend, ejecuta:" "$GREEN"
    echo "cd ../frontend && npm run build && aws s3 sync build/ s3://$FRONTEND_BUCKET --delete"
  fi
  
  print_message "Despliegue completado. La aplicación estará disponible en unos minutos." "$GREEN"
else
  print_message "Error al desplegar el stack de CloudFormation." "$RED"
  exit 1
fi