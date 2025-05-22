#!/bin/bash
# Script principal para desplegar toda la aplicación en AWS
echo "✅ Script iniciado"

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

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

# Parámetros
STACK_NAME="kpi-dashboard"
REGION="us-east-1"
ENVIRONMENT="dev"
DOMAIN_NAME=""
CERTIFICATE_ARN=""
ADMIN_EMAIL=""
SKIP_FRONTEND=false

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
      SKIP_FRONTEND=true
      shift
      ;;
    *)
      print_message "Opción desconocida: $1" "$RED"
      show_help
      exit 1
      ;;
  esac
done

# Solicitar parámetros obligatorios si no se proporcionaron
if [ -z "$ADMIN_EMAIL" ]; then
  print_message "Ingresa el email del administrador para notificaciones:" "$YELLOW"
  read ADMIN_EMAIL
  if [ -z "$ADMIN_EMAIL" ]; then
    print_message "El email del administrador es obligatorio." "$RED"
    exit 1
  fi
fi

# Verificar si los scripts necesarios existen
SCRIPT_DIR="$(dirname "$0")"
PREPARE_LAMBDA_SCRIPT="$SCRIPT_DIR/prepare-lambda.sh"
UPDATE_CF_SCRIPT="$SCRIPT_DIR/update-cloudformation.sh"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-modified.sh"
DEPLOY_FRONTEND_SCRIPT="$SCRIPT_DIR/deploy-frontend.sh"

if [ ! -f "$PREPARE_LAMBDA_SCRIPT" ] || [ ! -f "$UPDATE_CF_SCRIPT" ] || [ ! -f "$DEPLOY_SCRIPT" ] || [ ! -f "$DEPLOY_FRONTEND_SCRIPT" ]; then
  print_message "No se encontraron todos los scripts necesarios en $SCRIPT_DIR" "$RED"
  exit 1
fi

# Paso 1: Preparar los archivos Lambda
print_message "Paso 1: Preparando los archivos Lambda..." "$YELLOW"
$PREPARE_LAMBDA_SCRIPT

if [ $? -ne 0 ]; then
  print_message "Error al preparar los archivos Lambda." "$RED"
  exit 1
fi

# Paso 2: Actualizar la plantilla CloudFormation
print_message "Paso 2: Actualizando la plantilla CloudFormation..." "$YELLOW"
$UPDATE_CF_SCRIPT --stack-name "$STACK_NAME" --region "$REGION" --env "$ENVIRONMENT" --admin-email "$ADMIN_EMAIL"

if [ $? -ne 0 ]; then
  print_message "Error al actualizar la plantilla CloudFormation." "$RED"
  exit 1
fi

# Paso 3: Desplegar la infraestructura
print_message "Paso 3: Desplegando la infraestructura..." "$YELLOW"

# Construir los parámetros para el script de despliegue
DEPLOY_PARAMS="--stack-name $STACK_NAME --region $REGION --env $ENVIRONMENT --admin-email $ADMIN_EMAIL --template-file ../infrastructure/cloudformation-updated.yaml"

if [ ! -z "$DOMAIN_NAME" ]; then
  DEPLOY_PARAMS="$DEPLOY_PARAMS --domain $DOMAIN_NAME"
fi

if [ ! -z "$CERTIFICATE_ARN" ]; then
  DEPLOY_PARAMS="$DEPLOY_PARAMS --cert $CERTIFICATE_ARN"
fi

if [ "$SKIP_FRONTEND" = true ]; then
  DEPLOY_PARAMS="$DEPLOY_PARAMS --skip-frontend"
fi

# Ejecutar el script de despliegue
$DEPLOY_SCRIPT $DEPLOY_PARAMS

if [ $? -ne 0 ]; then
  print_message "Error al desplegar la infraestructura." "$RED"
  exit 1
fi

# Paso 4: Desplegar el frontend (si no se omitió)
if [ "$SKIP_FRONTEND" = false ]; then
  print_message "Paso 4: Desplegando el frontend..." "$YELLOW"
  $DEPLOY_FRONTEND_SCRIPT --stack-name "$STACK_NAME" --region "$REGION" --env "$ENVIRONMENT"
  
  if [ $? -ne 0 ]; then
    print_message "Error al desplegar el frontend." "$RED"
    exit 1
  fi
fi

print_message "¡Despliegue completo! La aplicación estará disponible en unos minutos." "$GREEN"

# Obtener la URL del frontend
FRONTEND_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='FrontendURL'].OutputValue" --output text --region "$REGION")
if [ ! -z "$FRONTEND_URL" ] && [ "$FRONTEND_URL" != "None" ]; then
  print_message "URL del frontend: $FRONTEND_URL" "$GREEN"
else
  FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text --region "$REGION")
  print_message "URL del frontend: https://$FRONTEND_BUCKET.s3.$REGION.amazonaws.com/index.html" "$GREEN"
fi

print_message "Credenciales de administrador:" "$GREEN"
echo "Email: $ADMIN_EMAIL"
echo "Contraseña: Verifica en la salida del script de despliegue"
echo ""
print_message "IMPORTANTE: Deberás cambiar esta contraseña en el primer inicio de sesión" "$YELLOW"