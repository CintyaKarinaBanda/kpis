#!/bin/bash

# Script para desplegar las funciones Lambda y actualizar la infraestructura

# Configuración
ENVIRONMENT="dev"
REGION="us-east-1"
STACK_NAME="${ENVIRONMENT}-kpi-dashboard"
TEMPLATE_FILE="../infrastructure/cloudformation-update.yaml"
LAMBDA_DIR="../backend/lambda"
OUTPUT_DIR="./build"

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando despliegue del backend para KPI Dashboard...${NC}"

# Crear directorio de salida si no existe
mkdir -p $OUTPUT_DIR

# Empaquetar funciones Lambda
echo -e "${YELLOW}Empaquetando funciones Lambda...${NC}"

# Función para empaquetar una función Lambda
package_lambda() {
    FUNCTION_NAME=$1
    HANDLER_FILE=$2
    
    echo -e "${YELLOW}Empaquetando $FUNCTION_NAME...${NC}"
    
    # Crear directorio temporal
    TMP_DIR=$(mktemp -d)
    
    # Copiar archivo de handler
    cp $LAMBDA_DIR/$HANDLER_FILE $TMP_DIR/index.js
    
    # Instalar dependencias si hay package.json
    if [ -f "$LAMBDA_DIR/package.json" ]; then
        cp $LAMBDA_DIR/package.json $TMP_DIR/
        (cd $TMP_DIR && npm install --production)
    fi
    
    # Crear archivo ZIP
    (cd $TMP_DIR && zip -r $OUTPUT_DIR/$FUNCTION_NAME.zip .)
    
    # Verificar que el archivo ZIP se creó correctamente
    if [ ! -f "$OUTPUT_DIR/$FUNCTION_NAME.zip" ]; then
        echo -e "${RED}Error: No se pudo crear el archivo $OUTPUT_DIR/$FUNCTION_NAME.zip${NC}"
        exit 1
    fi
    
    # Limpiar
    rm -rf $TMP_DIR
    
    echo -e "${GREEN}$FUNCTION_NAME empaquetado correctamente.${NC}"
}

# Empaquetar cada función
package_lambda "process-csv" "process-csv.js"
package_lambda "get-kpi-data" "get-kpi-data.js"
package_lambda "get-kpi-summary" "get-kpi-summary.js"
package_lambda "upload-csv" "upload-csv.js"

# Actualizar la pila de CloudFormation
echo -e "${YELLOW}Actualizando la pila de CloudFormation...${NC}"

# Verificar si la pila existe
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION 2>&1 || echo "STACK_NOT_EXIST")

if [[ $STACK_EXISTS == *"STACK_NOT_EXIST"* ]]; then
    echo -e "${YELLOW}La pila no existe. Creando nueva pila...${NC}"
    
    # Crear la pila
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --capabilities CAPABILITY_NAMED_IAM \
        --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
        --region $REGION
    
    # Esperar a que se complete la creación
    echo -e "${YELLOW}Esperando a que se complete la creación de la pila...${NC}"
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
    
    # Verificar si la creación fue exitosa
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: La creación de la pila falló. Revisa los logs de CloudFormation.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}La pila existe. Actualizando...${NC}"
    
    # Actualizar la pila
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --capabilities CAPABILITY_NAMED_IAM \
        --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
        --region $REGION
    
    # Esperar a que se complete la actualización
    echo -e "${YELLOW}Esperando a que se complete la actualización de la pila...${NC}"
    aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION
    
    # Verificar si la actualización fue exitosa
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: La actualización de la pila falló. Revisa los logs de CloudFormation.${NC}"
        exit 1
    fi
fi

# Verificar si la pila existe antes de continuar
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION 2>&1 || echo "STACK_NOT_EXIST")

if [[ $STACK_EXISTS == *"STACK_NOT_EXIST"* ]]; then
    echo -e "${RED}Error: La pila no existe después de la creación/actualización.${NC}"
    exit 1
fi

# Actualizar el código de las funciones Lambda
echo -e "${YELLOW}Actualizando el código de las funciones Lambda...${NC}"

# Función para actualizar una función Lambda
update_lambda() {
    FUNCTION_NAME="${ENVIRONMENT}-kpi-dashboard-$1"
    ZIP_FILE="$OUTPUT_DIR/$1.zip"
    
    # Verificar que el archivo ZIP existe
    if [ ! -f "$ZIP_FILE" ]; then
        echo -e "${RED}Error: El archivo $ZIP_FILE no existe.${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Actualizando $FUNCTION_NAME...${NC}"
    
    # Verificar si la función Lambda existe
    FUNCTION_EXISTS=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>&1 || echo "FUNCTION_NOT_EXIST")
    
    if [[ $FUNCTION_EXISTS == *"FUNCTION_NOT_EXIST"* ]]; then
        echo -e "${RED}Error: La función $FUNCTION_NAME no existe.${NC}"
        return 1
    fi
    
    # Actualizar el código de la función
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://$ZIP_FILE \
        --region $REGION
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: No se pudo actualizar la función $FUNCTION_NAME.${NC}"
        return 1
    fi
    
    echo -e "${GREEN}$FUNCTION_NAME actualizado correctamente.${NC}"
    return 0
}

# Actualizar cada función
update_lambda "process-csv" || echo -e "${YELLOW}Omitiendo actualización de process-csv...${NC}"
update_lambda "get-kpi-data" || echo -e "${YELLOW}Omitiendo actualización de get-kpi-data...${NC}"
update_lambda "get-kpi-summary" || echo -e "${YELLOW}Omitiendo actualización de get-kpi-summary...${NC}"
update_lambda "upload-csv" || echo -e "${YELLOW}Omitiendo actualización de upload-csv...${NC}"

# Obtener información de la pila
echo -e "${YELLOW}Obteniendo información de la pila...${NC}"

STACK_INFO=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs" --region $REGION 2>&1)

if [[ $STACK_INFO == *"error"* ]]; then
    echo -e "${RED}Error al obtener información de la pila.${NC}"
else
    echo -e "${GREEN}Información de la pila:${NC}"
    echo "$STACK_INFO"
fi

echo -e "${GREEN}Despliegue completado.${NC}"