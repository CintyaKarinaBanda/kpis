#!/bin/bash
# Script para preparar los archivos Lambda para el despliegue

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
print_message() {
  echo -e "${2}${1}${NC}"
}

# Crear directorio para el despliegue
DEPLOYMENT_DIR="../deployment"
LAMBDA_DIR="$DEPLOYMENT_DIR/lambda"

print_message "Creando directorios para el despliegue..." "$YELLOW"
mkdir -p "$LAMBDA_DIR"

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
  print_message "npm no está instalado. Por favor, instálalo primero." "$RED"
  exit 1
fi

# Preparar función get-kpi-data
print_message "Preparando función get-kpi-data..." "$YELLOW"
mkdir -p "$LAMBDA_DIR/get-kpi-data"
cp ../backend/lambda/get-kpi-data.js "$LAMBDA_DIR/get-kpi-data/index.js"
cd "$LAMBDA_DIR/get-kpi-data"
npm init -y
npm install aws-sdk --save
cd - > /dev/null

# Preparar función get-kpi-summary
print_message "Preparando función get-kpi-summary..." "$YELLOW"
mkdir -p "$LAMBDA_DIR/get-kpi-summary"
cp ../backend/lambda/get-kpi-summary.js "$LAMBDA_DIR/get-kpi-summary/index.js"
cd "$LAMBDA_DIR/get-kpi-summary"
npm init -y
npm install aws-sdk --save
cd - > /dev/null

# Preparar función process-csv
print_message "Preparando función process-csv..." "$YELLOW"
mkdir -p "$LAMBDA_DIR/process-csv"
cp ../backend/lambda/process-csv.js "$LAMBDA_DIR/process-csv/index.js"
cd "$LAMBDA_DIR/process-csv"
npm init -y
npm install aws-sdk --save
cd - > /dev/null

# Preparar función upload-csv
print_message "Preparando función upload-csv..." "$YELLOW"
mkdir -p "$LAMBDA_DIR/upload-csv"
cp ../backend/lambda/upload-csv.js "$LAMBDA_DIR/upload-csv/index.js"
cd "$LAMBDA_DIR/upload-csv"
npm init -y
npm install aws-sdk --save
cd - > /dev/null

# Preparar función auth
print_message "Preparando función auth..." "$YELLOW"
mkdir -p "$LAMBDA_DIR/auth"
cp ../backend/auth/index.js "$LAMBDA_DIR/auth/index.js"
cd "$LAMBDA_DIR/auth"
npm init -y
npm install aws-sdk jsonwebtoken --save
cd - > /dev/null

# Preparar función api
print_message "Preparando función api..." "$YELLOW"
mkdir -p "$LAMBDA_DIR/api"
cp ../backend/api/index.js "$LAMBDA_DIR/api/index.js"
cd "$LAMBDA_DIR/api"
npm init -y
npm install aws-sdk --save
cd - > /dev/null

# Comprimir cada función Lambda
print_message "Comprimiendo funciones Lambda..." "$YELLOW"
cd "$LAMBDA_DIR"
for dir in */; do
  dir=${dir%*/}
  print_message "Comprimiendo $dir..." "$YELLOW"
  cd "$dir"
  # Usar zip estándar
  zip -r "../$dir.zip" ./*
  cd ..
done
cd - > /dev/null

print_message "Funciones Lambda preparadas con éxito en $LAMBDA_DIR" "$GREEN"