// Datos de demostración para simular KPIs
const DEMO_SUMMARY = {
  totalRecords: 30,
  okCount: 20,
  noCount: 8,
  naCount: 2,
  complianceRate: "71.43",
  byCategory: {
    "Ventas por Tienda": {
      ok: 10,
      no: 0,
      na: 0,
      complianceRate: "100.00"
    },
    "Ventas Presidencia": {
      ok: 10,
      no: 0,
      na: 0,
      complianceRate: "100.00"
    },
    "Operativo Diario": {
      ok: 8,
      no: 2,
      na: 0,
      complianceRate: "80.00"
    },
    "Restaurantes": {
      ok: 10,
      no: 0,
      na: 0,
      complianceRate: "100.00"
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
    }
  ],
  uniqueErrors: [
    "[05/05/2023] Todo funcionando correctamente. El sistema está operando sin problemas y todos los indicadores muestran valores normales.",
    "[04/05/2023] Problemas con el sistema de ventas. Se detectaron inconsistencias en los datos de ventas que requieren revisión urgente.",
    "[03/05/2023] Error en la carga de datos. El proceso de carga falló debido a problemas de formato en los archivos fuente.",
    "[02/05/2023] Actualización completada sin errores. La migración de datos se realizó exitosamente y todos los sistemas están funcionando correctamente.",
    "[01/05/2023] Falla en el servidor de reportes. El servidor principal presentó problemas de conectividad que afectaron la generación de reportes diarios."
  ]
};

// Datos de demostración para simular comentarios
const DEMO_COMMENTS = [
  {
    id: "comment-1",
    userId: "demo-user-123",
    userName: "Usuario Demo",
    date: "2023-05-05",
    comment: "Todo funcionando correctamente",
    createdAt: "2023-05-05T15:30:00Z"
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
 * Obtiene los datos de KPI (simulado)
 * @param {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha de fin (YYYY-MM-DD)
 * @returns {Promise} - Promesa con los datos
 */
export const getKPIData = async (startDate, endDate) => {
  console.log(`[SIMULADO] Obteniendo datos KPI desde ${startDate} hasta ${endDate}`);
  
  // Simular un retraso
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Filtrar datos por fecha
  const filteredData = DEMO_SUMMARY.trend
    .filter(item => item.date >= startDate && item.date <= endDate)
    .map(item => ({
      id: `kpi-${item.date}`,
      date: item.date,
      userId: 'demo-user',
      ...item
    }));
  
  return {
    data: filteredData
  };
};

/**
 * Obtiene el resumen de KPIs (simulado)
 * @param {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha de fin (YYYY-MM-DD)
 * @returns {Promise} - Promesa con el resumen
 */
export const getKPISummary = async (startDate, endDate) => {
  console.log(`[SIMULADO] Obteniendo resumen KPI desde ${startDate} hasta ${endDate}`);
  
  // Simular un retraso
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    summary: DEMO_SUMMARY
  };
};

/**
 * Agrega un comentario (simulado)
 * @param {string} date - Fecha del comentario (YYYY-MM-DD)
 * @param {string} comment - Texto del comentario
 * @returns {Promise} - Promesa con la respuesta
 */
export const addComment = async (date, comment) => {
  console.log(`[SIMULADO] Añadiendo comentario para la fecha ${date}`);
  
  // Simular un retraso
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newComment = {
    id: `comment-${Date.now()}`,
    userId: 'demo-user',
    userName: 'Usuario Demo',
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
};

/**
 * Obtiene los comentarios (simulado)
 * @param {string} startDate - Fecha de inicio (YYYY-MM-DD) (opcional)
 * @param {string} endDate - Fecha de fin (YYYY-MM-DD) (opcional)
 * @returns {Promise} - Promesa con los comentarios
 */
export const getComments = async (startDate, endDate) => {
  console.log('[SIMULADO] Obteniendo comentarios');
  
  // Simular un retraso
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Filtrar por fecha si se proporciona
  let filteredComments = [...DEMO_COMMENTS];
  if (startDate && endDate) {
    filteredComments = filteredComments.filter(
      comment => comment.date >= startDate && comment.date <= endDate
    );
  }
  
  return {
    comments: filteredComments
  };
};

// Exportar el servicio completo
export const localApiService = {
  getKPIData,
  getKPISummary,
  addComment,
  getComments
};