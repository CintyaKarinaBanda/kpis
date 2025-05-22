#!/bin/bash
# Script para actualizar la plantilla CloudFormation con los archivos Lambda reales

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

# Parámetros
STACK_NAME="kpi-dashboard"
REGION="us-east-1"
ENVIRONMENT="dev"
S3_BUCKET=""
ADMIN_EMAIL=""

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
      S3_BUCKET="$2"
      shift
      shift
      ;;
    -a|--admin-email)
      ADMIN_EMAIL="$2"
      shift
      shift
      ;;
    *)
      print_message "Opción desconocida: $1" "$RED"
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

# Crear un bucket S3 para almacenar los archivos Lambda si no se proporcionó
if [ -z "$S3_BUCKET" ]; then
  S3_BUCKET="${ENVIRONMENT}-kpi-dashboard-deployment-$(date +%s)"
  print_message "Creando bucket S3 para el despliegue: $S3_BUCKET" "$YELLOW"
  
  # Crear el bucket
  aws s3 mb "s3://$S3_BUCKET" --region "$REGION"
  
  if [ $? -ne 0 ]; then
    print_message "Error al crear el bucket S3. Verifica los permisos y el nombre del bucket." "$RED"
    exit 1
  fi
  
  # Configurar el bucket para eliminar automáticamente después de 1 día
  aws s3api put-bucket-lifecycle-configuration \
    --bucket "$S3_BUCKET" \
    --lifecycle-configuration '{
      "Rules": [
        {
          "ID": "Delete-after-1-day",
          "Status": "Enabled",
          "Expiration": {
            "Days": 1
          }
        }
      ]
    }' \
    --region "$REGION"
fi

# Verificar que el directorio de despliegue existe
DEPLOYMENT_DIR="../deployment"
LAMBDA_DIR="$DEPLOYMENT_DIR/lambda"

if [ ! -d "$LAMBDA_DIR" ]; then
  print_message "El directorio de despliegue no existe. Ejecuta prepare-lambda.sh primero." "$RED"
  exit 1
fi

# Subir archivos Lambda a S3
print_message "Subiendo archivos Lambda a S3..." "$YELLOW"
for zip_file in "$LAMBDA_DIR"/*.zip; do
  file_name=$(basename "$zip_file")
  print_message "Subiendo $file_name..." "$YELLOW"
  aws s3 cp "$zip_file" "s3://$S3_BUCKET/lambda/$file_name" --region "$REGION"
done

# Crear una copia de la plantilla CloudFormation original
TEMPLATE_FILE="../infrastructure/cloudformation.yaml"
UPDATED_TEMPLATE_FILE="../infrastructure/cloudformation-updated.yaml"

cp "$TEMPLATE_FILE" "$UPDATED_TEMPLATE_FILE"

# Actualizar la plantilla CloudFormation para usar los archivos Lambda de S3
print_message "Actualizando la plantilla CloudFormation..." "$YELLOW"

# Función para reemplazar el código en línea por una referencia a S3
update_lambda_code() {
  local function_name="$1"
  local s3_key="$2"
  
  # Buscar la sección de la función Lambda y reemplazar el código en línea
  sed -i '' "s|Code:\\n        ZipFile: |Code:\\n        S3Bucket: $S3_BUCKET\\n        S3Key: lambda/$s3_key|g" "$UPDATED_TEMPLATE_FILE"
}

# Actualizar cada función Lambda en la plantilla
update_lambda_code "AuthFunction" "auth.zip"
update_lambda_code "CSVProcessorFunction" "process-csv.zip"
update_lambda_code "APIFunction" "api.zip"

print_message "Plantilla CloudFormation actualizada con éxito: $UPDATED_TEMPLATE_FILE" "$GREEN"
print_message "Ahora puedes desplegar el stack con:" "$GREEN"
echo "cd $(dirname "$0")"
echo "./deploy.sh --stack-name $STACK_NAME --region $REGION --env $ENVIRONMENT --admin-email $ADMIN_EMAIL --template-file $UPDATED_TEMPLATE_FILE"