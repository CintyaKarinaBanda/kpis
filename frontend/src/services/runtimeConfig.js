/**
 * Configuración en tiempo de ejecución
 * Este archivo obtiene la configuración del objeto window.ENV_CONFIG si existe,
 * o utiliza las variables de entorno de proceso como respaldo
 */

// Obtener configuración del objeto window.ENV_CONFIG si existe
const getEnvConfig = () => {
  if (typeof window !== 'undefined' && window.ENV_CONFIG) {
    console.log('Usando configuración de env-config.js');
    return window.ENV_CONFIG;
  }
  
  console.log('Usando configuración de variables de entorno de proceso');
  return {
    API_URL: process.env.REACT_APP_API_URL,
    USE_LOCAL_API: process.env.REACT_APP_USE_LOCAL_API === 'true',
    USE_BACKEND: process.env.REACT_APP_USE_BACKEND === 'true',
    USE_COGNITO: process.env.REACT_APP_USE_COGNITO === 'true',
    DEPLOYMENT_ENV: process.env.NODE_ENV
  };
};

// Configuración de producción forzada
const PRODUCTION_CONFIG = {
  API_URL: 'https://vbpdqwho21.execute-api.us-east-1.amazonaws.com/dev',
  USE_LOCAL_API: false,
  USE_BACKEND: true,
  USE_COGNITO: true,
  DEPLOYMENT_ENV: 'production'
};

// Obtener la configuración
const envConfig = getEnvConfig();

// En producción, forzar la configuración de producción
const config = process.env.NODE_ENV === 'production' 
  ? { ...envConfig, ...PRODUCTION_CONFIG } 
  : envConfig;

// Exportar la configuración
export const API_URL = config.API_URL || 'https://vbpdqwho21.execute-api.us-east-1.amazonaws.com/dev';
export const USE_LOCAL_API = config.USE_LOCAL_API === true ? true : false;
export const USE_BACKEND = config.USE_BACKEND === false ? false : true;
export const USE_COGNITO = config.USE_COGNITO === false ? false : true;
export const DEPLOYMENT_ENV = config.DEPLOYMENT_ENV || process.env.NODE_ENV;

// Mostrar la configuración en la consola
console.log('=== Configuración en tiempo de ejecución ===');
console.log('API_URL:', API_URL);
console.log('USE_LOCAL_API:', USE_LOCAL_API);
console.log('USE_BACKEND:', USE_BACKEND);
console.log('USE_COGNITO:', USE_COGNITO);
console.log('DEPLOYMENT_ENV:', DEPLOYMENT_ENV);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Exportar la configuración completa
export default {
  API_URL,
  USE_LOCAL_API,
  USE_BACKEND,
  USE_COGNITO,
  DEPLOYMENT_ENV
};