#!/bin/bash
# Script para construir y desplegar el frontend en S3

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
print_message() {
  echo -e "${2}${1}${NC}"
}

# Verificar si AWS CLI está instalado
if ! command -v aws &> /dev/null; then
  print_message "AWS CLI no está instalado. Por favor, instálalo primero." "$RED"
  exit 1
fi

# Verificar si el usuario está autenticado en AWS
if ! aws sts get-caller-identity &> /dev/null; then
  print_message "No estás autenticado en AWS. Por favor, ejecuta 'aws configure' primero." "$RED"
  exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
  print_message "npm no está instalado. Por favor, instálalo primero." "$RED"
  exit 1
fi

# Parámetros
STACK_NAME="kpi-dashboard"
REGION="us-east-1"
ENVIRONMENT="dev"
FRONTEND_BUCKET=""
API_ENDPOINT=""
USER_POOL_ID=""
USER_POOL_CLIENT_ID=""

# Procesar argumentos
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
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
    -b|--bucket)
      FRONTEND_BUCKET="$2"
      shift
      shift
      ;;
    -a|--api-endpoint)
      API_ENDPOINT="$2"
      shift
      shift
      ;;
    -p|--user-pool-id)
      USER_POOL_ID="$2"
      shift
      shift
      ;;
    -c|--client-id)
      USER_POOL_CLIENT_ID="$2"
      shift
      shift
      ;;
    *)
      print_message "Opción desconocida: $1" "$RED"
      exit 1
      ;;
  esac
done

# Si no se proporcionaron parámetros, intentar obtenerlos del stack de CloudFormation
if [ -z "$FRONTEND_BUCKET" ] || [ -z "$API_ENDPOINT" ] || [ -z "$USER_POOL_ID" ] || [ -z "$USER_POOL_CLIENT_ID" ]; then
  print_message "Obteniendo información del stack de CloudFormation..." "$YELLOW"
  
  # Obtener el bucket de frontend
  if [ -z "$FRONTEND_BUCKET" ]; then
    FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text --region "$REGION")
    if [ -z "$FRONTEND_BUCKET" ]; then
      print_message "No se pudo obtener el nombre del bucket de frontend del stack. Proporciona el parámetro --bucket." "$RED"
      exit 1
    fi
  fi
  
  # Obtener el endpoint de la API
  if [ -z "$API_ENDPOINT" ]; then
    API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text --region "$REGION")
    if [ -z "$API_ENDPOINT" ]; then
      print_message "No se pudo obtener el endpoint de la API del stack. Proporciona el parámetro --api-endpoint." "$RED"
      exit 1
    fi
  fi
  
  # Obtener el ID del User Pool
  if [ -z "$USER_POOL_ID" ]; then
    USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text --region "$REGION")
    if [ -z "$USER_POOL_ID" ]; then
      print_message "No se pudo obtener el ID del User Pool del stack. Proporciona el parámetro --user-pool-id." "$RED"
      exit 1
    fi
  fi
  
  # Obtener el ID del cliente del User Pool
  if [ -z "$USER_POOL_CLIENT_ID" ]; then
    USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text --region "$REGION")
    if [ -z "$USER_POOL_CLIENT_ID" ]; then
      print_message "No se pudo obtener el ID del cliente del User Pool del stack. Proporciona el parámetro --client-id." "$RED"
      exit 1
    fi
  fi
fi

print_message "Información para el despliegue del frontend:" "$GREEN"
echo "REACT_APP_API_URL=$API_ENDPOINT"
echo "S3_BUCKET=$FRONTEND_BUCKET"
echo "USER_POOL_ID=$USER_POOL_ID"
echo "USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID"

# Crear archivo .env para el frontend
print_message "Creando archivo .env para el frontend..." "$YELLOW"
cat > "../frontend/.env" << EOF
REACT_APP_API_URL=$API_ENDPOINT
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_REGION=$REGION
REACT_APP_USE_COGNITO=true
EOF

# Instalar aws-amplify si no está instalado
print_message "Verificando dependencias..." "$YELLOW"
cd ../frontend
if ! grep -q "aws-amplify" package.json; then
  print_message "Instalando aws-amplify..." "$YELLOW"
  npm install --save aws-amplify
fi

# Construir el frontend
print_message "Construyendo el frontend..." "$YELLOW"
npm install
npm run build

if [ $? -ne 0 ]; then
  print_message "Error al construir el frontend." "$RED"
  exit 1
fi

# Desplegar el frontend en S3
print_message "Desplegando el frontend en S3..." "$YELLOW"
aws s3 sync build/ "s3://$FRONTEND_BUCKET/" --delete --region "$REGION"

if [ $? -ne 0 ]; then
  print_message "Error al desplegar el frontend en S3." "$RED"
  exit 1
fi

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

print_message "Despliegue del frontend completado." "$GREEN"