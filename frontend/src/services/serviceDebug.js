/**
 * Utilidad para depurar problemas de servicios y configuración
 */

// Exponer servicios y configuración para depuración
import { apiService, csvService } from './serviceConfig';
import { localApiService } from './localApiService';
import { localCsvService } from './localCsvService';

// Exponer en window para depuración
window.apiService = apiService;
window.csvService = csvService;
window.localApiService = localApiService;
window.localCsvService = localCsvService;

// Función para mostrar la configuración actual
export const logServiceConfig = () => {
  console.group('Configuración de Servicios');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  console.log('REACT_APP_USE_BACKEND:', process.env.REACT_APP_USE_BACKEND);
  console.log('REACT_APP_USE_LOCAL_API:', process.env.REACT_APP_USE_LOCAL_API);
  console.log('REACT_APP_USE_COGNITO:', process.env.REACT_APP_USE_COGNITO);
  console.log('Servicio API activo:', apiService === localApiService ? 'Local' : 'Remoto');
  console.log('Servicio CSV activo:', csvService === localCsvService ? 'Local' : 'Remoto');
  console.groupEnd();
};

// Ejecutar al cargar
logServiceConfig();