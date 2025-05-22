import axios from 'axios';
import { getAuthHeaders, getUserId } from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'https://vbpdqwho21.execute-api.us-east-1.amazonaws.com/dev';

// Datos de demostración para simular KPIs
const DEMO_SUMMARY = {
  totalRecords: 30,
  okCount: 20,
  noCount: 8,
  naCount: 2,
  complianceRate: "71.43",
  byCategory: {
    "Ventas por Tienda": {
      ok: 8,
      no: 2,
      na: 0,
      complianceRate: "80.00"
    },
    "Ventas Presidencia": {
      ok: 6,
      no: 3,
      na: 1,
      complianceRate: "66.67"
    },
    "Reportes Operativos": {
      ok: 6,
      no: 3,
      na: 1,
      complianceRate: "66.67"
    }
  },
  byDate: {
    "2023-05-01": {
      ok: 2,
      no: 1,
      na: 0,
      complianceRate: "66.67"
    },
    "2023-05-02": {
      ok: 3,
      no: 0,
      na: 0,
      complianceRate: "100.00"
    },
    "2023-05-03": {
      ok: 1,
      no: 2,
      na: 0,
      complianceRate: "33.33"
    },
    "2023-05-04": {
      ok: 1,
      no: 1,
      na: 1,
      complianceRate: "50.00"
    },
    "2023-05-05": {
      ok: 3,
      no: 0,
      na: 0,
      complianceRate: "100.00"
    },
    "2023-06-01": {
      ok: 3,
      no: 0,
      na: 0,
      complianceRate: "100.00"
    },
    "2023-06-02": {
      ok: 3,
      no: 0,
      na: 0,
      complianceRate: "100.00"
    },
    "2023-06-03": {
      ok: 2,
      no: 1,
      na: 0,
      complianceRate: "66.67"
    },
    "2023-06-04": {
      ok: 1,
      no: 2,
      na: 0,
      complianceRate: "33.33"
    },
    "2023-06-05": {
      ok: 3,
      no: 0,
      na: 0,
      complianceRate: "100.00"
    }
  },
  trend: [
    {
      date: "2023-05-01",
      complianceRate: 66.67,
      ok: 2,
      no: 1,
      na: 0
    },
    {
      date: "2023-05-02",
      complianceRate: 100,
      ok: 3,
      no: 0,
      na: 0
    },
    {
      date: "2023-05-03",
      complianceRate: 33.33,
      ok: 1,
      no: 2,
      na: 0
    },
    {
      date: "2023-05-04",
      complianceRate: 50,
      ok: 1,
      no: 1,
      na: 1
    },
    {
      date: "2023-05-05",
      complianceRate: 100,
      ok: 3,
      no: 0,
      na: 0
    },
    {
      date: "2023-06-01",
      complianceRate: 100,
      ok: 3,
      no: 0,
      na: 0
    },
    {
      date: "2023-06-02",
      complianceRate: 100,
      ok: 3,
      no: 0,
      na: 0
    },
    {
      date: "2023-06-03",
      complianceRate: 66.67,
      ok: 2,
      no: 1,
      na: 0
    },
    {
      date: "2023-06-04",
      complianceRate: 33.33,
      ok: 1,
      no: 2,
      na: 0
    },
    {
      date: "2023-06-05",
      complianceRate: 100,
      ok: 3,
      no: 0,
      na: 0
    }
  ]
};

// Datos de demostración para simular comentarios
const DEMO_COMMENTS = [
  {
    id: "comment-1",
    userId: "demo-user-123",
    userName: "Usuario Demo",
    date: "2023-06-05",
    comment: "Todo funcionando correctamente en junio",
    createdAt: "2023-06-05T15:30:00Z"
  },
  {
    id: "comment-2",
    userId: "demo-user-123",
    userName: "Usuario Demo",
    date: "2023-05-03",
    comment: "Problemas detectados en ventas",
    createdAt: "2023-05-03T10:15:00Z"
  }
];

/**
 * Obtiene los datos de KPI
 * @param {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha de fin (YYYY-MM-DD)
 * @param {string} category - Categoría (opcional)
 * @param {number} limit - Límite de resultados (opcional)
 * @returns {Promise} - Promesa con los datos
 */
export const getKPIData = async (startDate, endDate, category, limit) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    // Para la versión de demostración, devolvemos datos simulados
    console.log(`Obteniendo datos KPI desde ${startDate} hasta ${endDate}`);

    // Simular un retraso para la carga
    await new Promise(resolve => setTimeout(resolve, 800));

    // Filtrar datos por fecha si se proporciona
    const filteredData = DEMO_SUMMARY.trend
      .filter(item => item.date >= startDate && item.date <= endDate)
      .map(item => ({
        id: `kpi-${item.date}`,
        date: item.date,
        userId,
        ...item
      }));

    return {
      data: filteredData
    };
  } catch (error) {
    console.error('Error al obtener datos de KPI:', error);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene el resumen de KPIs
 * @param {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha de fin (YYYY-MM-DD)
 * @returns {Promise} - Promesa con el resumen
 */
export const getKPISummary = async (startDate, endDate) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    // Para la versión de demostración, devolvemos el resumen simulado
    console.log(`Obteniendo resumen KPI desde ${startDate} hasta ${endDate}`);

    // Simular un retraso para la carga
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Filtrar datos por fecha
    const filteredTrend = DEMO_SUMMARY.trend.filter(
      item => item.date >= startDate && item.date <= endDate
    );

    // Filtrar fechas en byDate
    const filteredByDate = {};
    Object.keys(DEMO_SUMMARY.byDate).forEach(date => {
      if (date >= startDate && date <= endDate) {
        filteredByDate[date] = DEMO_SUMMARY.byDate[date];
      }
    });

    // Crear un resumen filtrado
    const filteredSummary = {
      ...DEMO_SUMMARY,
      trend: filteredTrend,
      byDate: filteredByDate
    };

    return {
      summary: filteredSummary
    };
  } catch (error) {
    console.error('Error al obtener resumen de KPI:', error);
    throw error.response?.data || error;
  }
};

/**
 * Agrega un comentario
 * @param {string} date - Fecha del comentario (YYYY-MM-DD)
 * @param {string} comment - Texto del comentario
 * @returns {Promise} - Promesa con la respuesta
 */
export const addComment = async (date, comment) => {
  try {
    const userId = getUserId();
    const user = JSON.parse(localStorage.getItem('kpi_dashboard_user'));

    if (!userId || !user) {
      throw new Error('Usuario no autenticado');
    }

    // Para la versión de demostración, añadimos el comentario a la lista
    console.log(`Añadiendo comentario para la fecha ${date}`);

    // Simular un retraso
    await new Promise(resolve => setTimeout(resolve, 500));

    const newComment = {
      id: `comment-${Date.now()}`,
      userId,
      userName: user.name,
      date,
      comment,
      createdAt: new Date().toISOString()
    };

    // Añadir el comentario a la lista de demostración
    DEMO_COMMENTS.unshift(newComment);

    return {
      message: 'Comentario agregado correctamente',
      comment: newComment
    };
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene los comentarios
 * @param {string} startDate - Fecha de inicio (YYYY-MM-DD) (opcional)
 * @param {string} endDate - Fecha de fin (YYYY-MM-DD) (opcional)
 * @param {number} limit - Límite de resultados (opcional)
 * @returns {Promise} - Promesa con los comentarios
 */
export const getComments = async (startDate, endDate, limit = 20) => {
  try {
    // Para la versión de demostración, devolvemos los comentarios simulados
    console.log('Obteniendo comentarios');

    // Simular un retraso
    await new Promise(resolve => setTimeout(resolve, 500));

    // Filtrar por fecha si se proporciona
    let filteredComments = [...DEMO_COMMENTS];
    if (startDate && endDate) {
      filteredComments = filteredComments.filter(
        comment => comment.date >= startDate && comment.date <= endDate
      );
    }

    // Limitar resultados
    filteredComments = filteredComments.slice(0, limit);

    return {
      comments: filteredComments
    };
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    throw error.response?.data || error;
  }
};

// Exportar el servicio completo
export const apiService = {
  get: (url, config) => axios.get(url, config),
  post: (url, data, config) => axios.post(url, data, config),
  getKPIData,
  getKPISummary,
  addComment,
  getComments
};