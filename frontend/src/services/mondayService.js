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
      console.log(response.request.path);
      
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

      console.log("RESPONSEEEEEEEEEEEEEEEEEEEEEEEEEEEEEES");
      console.log(response);
      

      //Nuevo
      if (!response.data.fileUrl) {
        throw new Error('No se recibió la URL del archivo CSV en la respuesta');
      }

      // Obtener la ruta del archivo CSV
      const fileUrl = response.data.fileUrl;

      // Descargar el archivo CSV
      // Descargar el archivo CSV directamente desde S3 usando fetch
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error('Error al descargar el archivo desde S3');
      }

      const fileBlob = await fileResponse.blob();

      // Extraer el nombre del archivo sin query params
      const fileName = fileUrl.split('/').pop().split('?')[0];
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