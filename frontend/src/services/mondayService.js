import axios from 'axios';
import { apiService } from './serviceConfig';
import { uploadCSV } from './localCsvService';

/**
 * Servicio para interactuar con la integración de Monday.com
 */
class MondayService {
  /**
   * Obtiene la lista de tableros configurados
   * @returns {Promise<Array>} Lista de tableros
   */
  async getConfiguredBoards() {
    try {
      const response = await apiService.get('/api/monday/boards');
      return response.data.boards || [];
    } catch (error) {
      console.error('Error al obtener tableros configurados:', error);
      throw error;
    }
  }

  /**
   * Obtiene los datos de un tablero específico
   * @param {string} boardId - ID del tablero
   * @returns {Promise<Object>} Datos del tablero
   */
  async getBoardData(boardId) {
    try {
      const response = await apiService.get(`/api/monday/board/${boardId}`);
      console.log(response.data.boardData);
      return response.data.boardData;
    } catch (error) {
      console.error(`Error al obtener datos del tablero ${boardId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el mapeo de columnas configurado para un tablero
   * @param {string} boardId - ID del tablero
   * @returns {Promise<Object>} Mapeo de columnas
   */
  async getColumnMapping(boardId) {
    try {
      const response = await apiService.get(`/api/monday/board/${boardId}/mapping`);
      console.log(response.data.columnMapping);
      return response.data.columnMapping || {};
    } catch (error) {
      console.error(`Error al obtener mapeo de columnas para tablero ${boardId}:`, error);
      throw error;
    }
  }

  /**
   * Configura el mapeo de columnas para un tablero
   * @param {string} boardId - ID del tablero
   * @param {string} boardName - Nombre del tablero
   * @param {Object} columnMapping - Mapeo de columnas
   * @returns {Promise<Object>} Resultado de la operación
   */
  async configureColumnMapping(boardId, boardName, columnMapping) {
    console.log(boardId,
      boardName,
      columnMapping);
    try {
      const response = await apiService.post(`/api/monday/board/${boardId}/mapping`, {
        boardId,
        boardName,
        columnMapping
      });
      return response;
    } catch (error) {
      console.error(`Error al configurar mapeo de columnas para tablero ${boardId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene los datos transformados de un tablero
   * @param {string} boardId - ID del tablero
   * @returns {Promise<Object>} Datos transformados y CSV
   */
  async getTransformedData(boardId) {
    try {
      const response = await apiService.get(`/api/monday/board/${boardId}/data`);
      return response;
    } catch (error) {
      console.error(`Error al obtener datos transformados del tablero ${boardId}:`, error);
      throw error;
    }
  }

  /**
   * Importa los datos de un tablero directamente al dashboard
   * @param {string} boardId - ID del tablero
   * @returns {Promise<Object>} Resultado de la importación
   */
  async importToDashboard(boardId) {
    try {
      const response = await apiService.post(`/api/monday/board/${boardId}/import`);

      //Nuevo
      if (!response.data.filePath) {
        throw new Error('No se recibió la ruta del archivo CSV en la respuesta');
      }

      // Obtener la ruta del archivo CSV
      const filePath = response.data.filePath;
      console.log(`Archivo CSV generado en: ${filePath}`);

      // Descargar el archivo CSV
      const fileResponse = await apiService.get(`/api/monday/files?path=${encodeURIComponent(filePath)}`, {
        responseType: 'blob' // Importante: especificar que queremos un blob
      });

      console.log('Archivo descargado');

      // Crear un objeto File a partir del blob descargado
      const fileName = filePath.split('/').pop(); // Extraer el nombre del archivo de la ruta
      const fileBlob = new Blob([fileResponse.data], { type: 'text/csv' });
      const file = new File([fileBlob], fileName, { type: 'text/csv' });

      // Procesar el archivo descargado
      const uploadResult = await uploadCSV(file);

      return response;
    } catch (error) {
      console.error(`Error al importar datos del tablero ${boardId} al dashboard:`, error);
      throw error;
    }
  }
}

export const mondayService = new MondayService();