#!/bin/bash
# Script para desplegar el stack de CloudFormation para el frontend

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
    *)
      print_message "Opción desconocida: $1" "$RED"
      exit 1
      ;;
  esac
done

# Ruta al template de CloudFormation
TEMPLATE_PATH="../infrastructure/frontend-stack.yaml"

# Verificar si el template existe
if [ ! -f "$TEMPLATE_PATH" ]; then
  print_message "El template de CloudFormation no existe en: $TEMPLATE_PATH" "$RED"
  exit 1
fi

print_message "Desplegando stack de CloudFormation..." "$YELLOW"
print_message "Stack: $STACK_NAME" "$YELLOW"
print_message "Región: $REGION" "$YELLOW"
print_message "Ambiente: $ENVIRONMENT" "$YELLOW"

# Verificar si el stack ya existe
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" 2>&1 || echo "STACK_NOT_FOUND")

if [[ $STACK_EXISTS == *"STACK_NOT_FOUND"* ]]; then
  # Crear el stack
  print_message "Creando nuevo stack..." "$YELLOW"
  aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE_PATH" \
    --parameters ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
    --capabilities CAPABILITY_IAM \
    --region "$REGION"
else
  # Actualizar el stack
  print_message "Actualizando stack existente..." "$YELLOW"
  aws cloudformation update-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE_PATH" \
    --parameters ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
    --capabilities CAPABILITY_IAM \
    --region "$REGION" || echo "No hay cambios para aplicar"
fi

# Esperar a que el stack se complete
print_message "Esperando a que el stack se complete..." "$YELLOW"
aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$REGION" 2>/dev/null || \
aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$REGION"

# Verificar si el stack se completó correctamente
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].StackStatus" --output text --region "$REGION")

if [[ $STACK_STATUS == *"COMPLETE"* ]]; then
  print_message "Stack desplegado exitosamente. Estado: $STACK_STATUS" "$GREEN"
  
  # Mostrar las salidas del stack
  print_message "Outputs del stack:" "$GREEN"
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs" --output table --region "$REGION"
  
  print_message "Ahora puedes desplegar el frontend con:" "$GREEN"
  print_message "./deploy-frontend.sh -s $STACK_NAME -r $REGION -e $ENVIRONMENT" "$GREEN"
else
  print_message "Error al desplegar el stack. Estado: $STACK_STATUS" "$RED"
  print_message "Revisa los eventos del stack para más detalles:" "$RED"
  aws cloudformation describe-stack-events --stack-name "$STACK_NAME" --query "StackEvents[?ResourceStatus=='CREATE_FAILED' || ResourceStatus=='UPDATE_FAILED'].{Resource:LogicalResourceId, Status:ResourceStatus, Reason:ResourceStatusReason}" --output table --region "$REGION"
  exit 1
fi