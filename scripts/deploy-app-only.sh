#!/bin/bash
# Script principal para desplegar toda la aplicación en AWS usando un stack existente
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

# Parámetros
STACK_NAME="kpi-dashboard"
REGION="us-east-1"
ENVIRONMENT="dev"
ADMIN_EMAIL="admin@example.com"  # Cambia esto a tu email

# Verificar si los scripts necesarios existen
SCRIPT_DIR="$(dirname "$0")"
DEPLOY_BACKEND_SCRIPT="$SCRIPT_DIR/deploy-backend.sh"
DEPLOY_FRONTEND_SCRIPT="$SCRIPT_DIR/deploy-frontend.sh"

if [ ! -f "$DEPLOY_BACKEND_SCRIPT" ] || [ ! -f "$DEPLOY_FRONTEND_SCRIPT" ]; then
  print_message "No se encontraron todos los scripts necesarios en $SCRIPT_DIR" "$RED"
  exit 1
fi

# Verificar que el stack existe
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].StackStatus" --output text --region $REGION 2>/dev/null || echo "STACK_NOT_EXIST")
if [[ "$STACK_STATUS" == "STACK_NOT_EXIST" ]]; then
  print_message "El stack $STACK_NAME no existe. Por favor, crea el stack primero." "$RED"
  exit 1
fi

print_message "Stack $STACK_NAME encontrado con estado: $STACK_STATUS" "$GREEN"

# Paso 1: Desplegar el backend
print_message "Paso 1: Desplegando el backend..." "$YELLOW"
$DEPLOY_BACKEND_SCRIPT

if [ $? -ne 0 ]; then
  print_message "Error al desplegar el backend." "$RED"
  exit 1
fi

# Paso 2: Configurar el frontend para evitar errores de ESLint
print_message "Paso 2: Configurando el frontend..." "$YELLOW"
cd ../frontend
echo "SKIP_PREFLIGHT_CHECK=true" >> .env
cd - > /dev/null

# Paso 3: Desplegar el frontend
print_message "Paso 3: Desplegando el frontend..." "$YELLOW"
$DEPLOY_FRONTEND_SCRIPT --stack-name "$STACK_NAME" --region "$REGION" --env "$ENVIRONMENT"

if [ $? -ne 0 ]; then
  print_message "Error al desplegar el frontend." "$RED"
  exit 1
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
