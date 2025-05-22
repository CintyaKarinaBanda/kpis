import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Amplify } from 'aws-amplify';

// Limpiar localStorage al iniciar la aplicación para evitar persistencia entre sesiones
const clearLocalStorageData = () => {
  // Obtener todas las claves que comienzan con 'kpi_dashboard_'
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('kpi_dashboard_')) {
      keysToRemove.push(key);
    }
  }
  
  // Eliminar las claves encontradas
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`Limpiando datos previos: ${key}`);
  });
  
  console.log('Datos de sesión anterior limpiados correctamente');
};

// Mostrar información del entorno
console.log('=== KPI Dashboard Iniciando ===');
console.log('Entorno:', process.env.NODE_ENV);

// Configurar Amplify para Cognito
Amplify.configure({
  Auth: {
    region: process.env.REACT_APP_REGION || 'us-east-1',
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
    authenticationFlowType: 'USER_SRP_AUTH'
  }
});
console.log('Amplify configurado para autenticación con Cognito');

// Ejecutar limpieza al iniciar
clearLocalStorageData();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();