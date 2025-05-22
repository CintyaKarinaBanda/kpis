/**
 * Configuración de entorno para la aplicación
 * Este archivo se carga antes que cualquier otro JavaScript en la página
 * y permite configurar variables de entorno en tiempo de ejecución
 */

window.ENV_CONFIG = {
  // En producción, siempre usar la API remota
  API_URL: 'https://vbpdqwho21.execute-api.us-east-1.amazonaws.com/dev',
  USE_LOCAL_API: false,
  USE_BACKEND: true,
  USE_COGNITO: true,
  
  // Información de despliegue
  DEPLOYMENT_TIME: new Date().toISOString(),
  DEPLOYMENT_ENV: 'production'
};