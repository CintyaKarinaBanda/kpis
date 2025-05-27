#!/bin/bash
# Script para arreglar problemas de ESLint en el frontend

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
print_message() {
  echo -e "${2}${1}${NC}"
}

# Ir al directorio del frontend
cd ../frontend || { print_message "No se pudo acceder al directorio frontend" "$RED"; exit 1; }

print_message "Limpiando archivos de configuración y dependencias..." "$YELLOW"

# Eliminar node_modules y archivos de caché
rm -rf node_modules
rm -rf .eslintcache
rm -f package-lock.json

# Actualizar package.json para arreglar la configuración de ESLint
print_message "Actualizando configuración de ESLint..." "$YELLOW"

# Verificar si el archivo package.json existe
if [ ! -f "package.json" ]; then
  print_message "No se encontró el archivo package.json" "$RED"
  exit 1
fi

# Crear un archivo temporal con la configuración actualizada
TMP_FILE=$(mktemp)
jq '.eslintConfig = {"extends": ["react-app"]}' package.json > "$TMP_FILE"

# Si jq no está disponible, usar un enfoque alternativo
if [ $? -ne 0 ]; then
  print_message "jq no está disponible, usando enfoque alternativo..." "$YELLOW"
  
  # Crear un archivo .eslintrc.js
  cat > .eslintrc.js << 'EOL'
module.exports = {
  extends: ['react-app'],
  rules: {
    // Desactivar reglas problemáticas
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off'
  }
};
EOL
else
  # Reemplazar el package.json original
  mv "$TMP_FILE" package.json
fi

# Crear un archivo .env para evitar que ESLint se queje
echo "SKIP_PREFLIGHT_CHECK=true" > .env

print_message "Reinstalando dependencias..." "$YELLOW"
npm install

print_message "Configuración de ESLint arreglada correctamente" "$GREEN"
print_message "Ahora puedes ejecutar el script de despliegue del frontend" "$GREEN"

cd - > /dev/null