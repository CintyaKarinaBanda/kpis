/**
 * Configuración centralizada de servicios
 * Este archivo determina qué implementación de servicios se debe utilizar
 */
import axios from 'axios';
import { apiService as remoteApiService } from './apiService';
import { localApiService } from './localApiService';
import { localCsvService } from './localCsvService';
const API_URL = process.env.REACT_APP_API_URL || 'https://f15rf7qk0g.execute-api.us-east-1.amazonaws.com/dev';


// FORZAR el uso de servicios locales para procesar CSV localmente
const useLocalServices = true;

console.log('Entorno:', process.env.NODE_ENV);
console.log('FORZANDO uso de servicios locales para procesamiento de CSV:', useLocalServices);

// Exportar los servicios adecuados
export const apiService = axios.create({
  baseURL: API_URL
});; 

// Usar localCsvService para ambos servicios
export const csvService = localCsvService;

// Exportar información de configuración para depuración
export const serviceConfig = {
  useLocalServices,
  environment: process.env.NODE_ENV,
  apiServiceType: 'local-csv',
  csvServiceType: 'local-csv'
};