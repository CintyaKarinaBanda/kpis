const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Configuración de la API de Monday.com
const MONDAY_API_URL = 'https://api.monday.com/v2';
const MONDAY_API_KEY = process.env.MONDAY_API_KEY;

// Cliente para realizar consultas a la API de Monday.com
const mondayClient = axios.create({
  baseURL: MONDAY_API_URL,
  headers: {
    // 'Authorization': MONDAY_API_KEY ? `Bearer ${MONDAY_API_KEY}` : '',
    'Authorization': MONDAY_API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 30000  // 30 segundos en lugar del predeterminado
});

// Verificar si la API key está configurada
if (!MONDAY_API_KEY) {
  console.warn('ADVERTENCIA: MONDAY_API_KEY no está configurada en las variables de entorno');
}

/**
 * Obtiene los datos de un tablero específico de Monday.com
 * @param {string} boardId - ID del tablero en Monday.com
 * @returns {Promise<Object>} - Datos del tablero
 */
const getBoardData = async (boardId) => {
  try {
    // Verificar que la API key esté configurada
    if (!MONDAY_API_KEY) {
      throw new Error('MONDAY_API_KEY no está configurada en las variables de entorno');
    }

    // Verificar que el ID del tablero sea válido
    if (!boardId) {
      throw new Error('ID del tablero no proporcionado');
    }

    console.log(`Obteniendo datos del tablero ${boardId} de Monday.com`);

    try {
      console.log('Verificando conectividad con Monday.com...');
      const pingResponse = await axios.get('https://api.monday.com', {
        timeout: 5000,
        validateStatus: () => true // Acepta cualquier código de estado
      });
      console.log(`Conectividad con Monday.com: código ${pingResponse.status}`);
    } catch (pingError) {
      console.warn('No se pudo conectar con Monday.com para el ping de prueba:', pingError.message);
      // Continuamos de todos modos con la consulta real
    }

    const query = `
      query {
        boards(ids: ${boardId}) {
          name
          id
          description
          columns {
            title
            id
            type
          }
          
          groups {
            title
            id
          }
          items_page (limit: 500){
            items {
              id 
              name  # Esto capturará las fechas (ej: "01-05-2025")
              
              column_values {
                id
                # title
                text  # Capturará los valores "OK" o "NO"
                value
                
                # Para identificar a qué columna pertenece este valor
                column {
                  id
                  title  # Nombres de columnas como "Ventas por Tienda y Division"
                }
              }
            }
          }
        }
      }
    `;

    // Mostrar la petición que se va a realizar (sin mostrar la API key completa)
    const apiKeyPreview = MONDAY_API_KEY ? `${MONDAY_API_KEY.substring(0, 5)}...` : 'no configurada';
    console.log(`Realizando petición a ${MONDAY_API_URL} con API key: ${apiKeyPreview}`);

    const response = await mondayClient.post('', { query }, {
      timeout: 60000, // 60 segundos
      retry: 3,
      retryDelay: 1000
    });

    // console.log('Respuesta recibida de Monday.com:', JSON.stringify(response.data).substring(0, 200) + '...');

    if (!response.data.data || !response.data.data.boards || !response.data.data.boards[0]) {
      throw new Error('No se encontró el tablero o la respuesta de Monday.com no tiene el formato esperado');
    }

    return response.data.data.boards[0];
  } catch (error) {
    console.error('Error al obtener datos de Monday.com:', error);

    // Mostrar más detalles del error para facilitar la depuración
    // if (error.response) {
    //   console.error('Detalles de la respuesta de error:', {
    //     status: error.response.status,
    //     headers: error.response.headers,
    //     // data: error.response.data
    //   });
    // }
    // Mostrar el mensaje de error específico si existe
    // if (error.response.data && error.response.data.errors && error.response.data.errors.length > 0) {
    //   console.error('Mensaje de error de Monday.com:', JSON.stringify(error.response.data.errors));
    // }
    // Diagnóstico mejorado
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('Problema de conectividad detectado: Tiempo de espera agotado.');
      console.error('Por favor verifica:');
      console.error('1. Tu conexión a Internet');
      console.error('2. Si hay restricciones de firewall');
      console.error('3. Si estás utilizando una VPN que podría estar bloqueando la conexión');
      console.error('4. Si Monday.com está experimentando problemas de servicio');
    } else if (error.response) {
      console.error('Detalles de la respuesta de error:', {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      });

      if (error.response.data && error.response.data.errors && error.response.data.errors.length > 0) {
        console.error('Mensaje de error específico:', JSON.stringify(error.response.data.errors));
      }
    }

    throw new Error(`Error al obtener datos de Monday.com: ${error.message}`);
  }
};

/**
 * Transforma los datos de Monday.com al formato esperado por el dashboard
 * @param {Object} boardData - Datos del tablero de Monday.com
 * @param {Object} columnMapping - Mapeo de columnas de Monday.com a categorías del dashboard
 * @returns {Array} - Datos transformados listos para el dashboard
 */
// const transformBoardData = (boardData, columnMapping) => {
//   if (!boardData || !boardData.items) {
//     return [];
//   }

//   return boardData.items.map(item => {
//     // Objeto base con la fecha (asumiendo que hay una columna de fecha)
//     const transformedItem = {
//       Name: '' // Se llenará con la fecha
//     };

//     // Procesar cada valor de columna según el mapeo
//     item.column_values.forEach(column => {
//       // Si esta columna está en nuestro mapeo
//       if (columnMapping[column.id]) {
//         const categoryName = columnMapping[column.id];

//         // Si es la columna de fecha, formatearla como DD/MM/YYYY
//         if (categoryName === 'Name' && column.value) {
//           try {
//             const dateValue = JSON.parse(column.value).date;
//             const date = new Date(dateValue);
//             transformedItem[categoryName] = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
//           } catch (e) {
//             transformedItem[categoryName] = column.text || '';
//           }
//         } else {
//           // Para otras columnas, mapear los valores según el formato esperado
//           // Asumiendo que en Monday.com usas etiquetas o estados que pueden mapearse a OK, NO, N/A
//           let value = column.text || '';

//           // Mapeo de valores de Monday.com a los valores esperados por el dashboard
//           switch (value.toLowerCase()) {
//             case 'completado':
//             case 'completo':
//             case 'hecho':
//             case 'ok':
//             case 'sí':
//             case 'yes':
//               value = 'OK';
//               break;
//             case 'pendiente':
//             case 'incompleto':
//             case 'no':
//             case 'fallo':
//               value = 'NO';
//               break;
//             case 'n/a':
//             case 'no aplica':
//             case 'na':
//               value = 'N/A';
//               break;
//             default:
//               // Si es un comentario o ID, dejarlo como está
//               if (categoryName === 'Commentario' || categoryName === 'Item ID (auto generated)') {
//                 // No transformar
//               } else {
//                 // Para columnas de categorías, valor por defecto es N/A
//                 value = 'N/A';
//               }
//           }

//           transformedItem[categoryName] = value;
//         }
//       }
//     });

//     return transformedItem;
//   });
// };

const transformBoardData = (boardData, columnMapping) => {
  if (!boardData || !boardData.items_page.items) {
    return [];
  }

  // Estructura exacta de columnas según el README
  const expectedColumns = [
    'Name',
    'Ventas por Tienda y Division',
    'Ventas Presidencia',
    'Operativo Diario',
    'Indicadores Presidencia',
    'Tendencia Firme / No Firme, Ecommerce, Outlet',
    'Ventas Viajes Palacio',
    'Ventas Restaurantes',
    'Operativo Mensual',
    'Operativo Fin de Semana y Semanal',
    'Operativo Anual',
    'Item ID (auto generated)',
    'Commentario'
  ];

  // Función para formatear fecha a DD/MM/YYYY
  const formatToDesiredDateFormat = (dateStr) => {
    try {
      // Si la fecha ya está en formato DD-MM-YYYY
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      }

      // Para otros formatos, convertir a Date y formatear
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      }
    } catch (e) {}
    return dateStr;
  };

  return boardData.items_page.items.map(item => {
    // Crear objeto con estructura exacta y valores por defecto
    const transformedItem = expectedColumns.reduce((acc, col) => {
      acc[col] = col === 'Name' ? '' : 'N/A';
      return acc;
    }, {});

    // Establecer fecha en formato DD/MM/YYYY
    transformedItem.Name = formatToDesiredDateFormat(item.name);

    // Mapear valores de columnas
    const columnValuesMap = {};
    item.column_values.forEach(cv => {
      columnValuesMap[cv.column.id] = cv;
    });

    // Procesar columnas combinadas
    const combinedColumnValue = 'N/A';
    let hasCombinedValue = false;

    Object.entries(columnMapping).forEach(([columnId, categoryName]) => {
      const columnValue = columnValuesMap[columnId];
      if (!columnValue) return;

      let value = columnValue.text || '';

      // Manejar columnas combinadas
      if (categoryName === 'Tendencia Firme / No Firme' || 
          categoryName === 'Ecommerce' || 
          categoryName === 'Outlet') {
        if (!hasCombinedValue && value.toLowerCase().match(/ok|completado|completo|hecho|sí|yes/)) {
          transformedItem['Tendencia Firme / No Firme, Ecommerce, Outlet'] = 'OK';
          hasCombinedValue = true;
        } else if (!hasCombinedValue && value.toLowerCase().match(/no|pendiente|incompleto|fallo/)) {
          transformedItem['Tendencia Firme / No Firme, Ecommerce, Outlet'] = 'NO';
          hasCombinedValue = true;
        }
        return;
      }

      // Procesar resto de columnas
      if (!expectedColumns.includes(categoryName)) return;

      if (categoryName !== 'Commentario' && categoryName !== 'Item ID (auto generated)') {
        switch (value.toLowerCase()) {
          case 'completado':
          case 'completo':
          case 'hecho':
          case 'ok':
          case 'sí':
          case 'yes':
            value = 'OK';
            break;
          case 'pendiente':
          case 'incompleto':
          case 'no':
          case 'fallo':
            value = 'NO';
            break;
          default:
            value = 'N/A';
        }
      }

      transformedItem[categoryName] = value;
    });

    return transformedItem;
  });
};
/**
 * Genera un archivo CSV a partir de los datos transformados
 * @param {Array} data - Datos transformados
 * @returns {string} - Contenido del archivo CSV
 */
// const generateCSV = (data) => {
//   if (!data || data.length === 0) {
//     return '';
//   }

//   // Obtener encabezados (todas las claves posibles de todos los objetos)
//   const headers = Array.from(
//     new Set(
//       data.flatMap(item => Object.keys(item))
//     )
//   );

//   // Crear línea de encabezados
//   const csvContent = [
//     headers.join(',')
//   ];

//   // Agregar líneas de datos
//   data.forEach(item => {
//     const row = headers.map(header => {
//       // Escapar comas y comillas en los valores
//       const value = item[header] || '';
//       if (value.includes(',') || value.includes('"')) {
//         return `"${value.replace(/"/g, '""')}"`;
//       }
//       return value;
//     });
//     csvContent.push(row.join(','));
//   });

//   return csvContent.join('\n');
// };
const generateCSV = (transformedData) => {
  console.log("Generando CSV...");

  if (!transformedData || !Array.isArray(transformedData) || transformedData.length === 0) {
    console.error("⚠️ Datos inválidos o vacíos para generar CSV");
    return "";
  }

  try {
    // Estructura exacta de columnas según el README
    const expectedColumns = [
      'Name',
      'Ventas por Tienda y Division',
      'Ventas Presidencia',
      'Operativo Diario',
      'Indicadores Presidencia',
      'Tendencia Firme / No Firme, Ecommerce, Outlet',
      'Ventas Viajes Palacio',
      'Ventas Restaurantes',
      'Operativo Mensual',
      'Operativo Fin de Semana y Semanal',
      'Operativo Anual',
      'Item ID (auto generated)',
      'Commentario'
    ];

    // Crear encabezado
    const headerRow = expectedColumns.join(',');

    // Crear filas de datos
    const rows = transformedData.map(item => {
      const rowValues = expectedColumns.map(column => {
        const value = item[column] || '';
        return value.includes(',') ? `"${value}"` : value;
      });
      return rowValues.join(',');
    });

    // Generar CSV
    const csvContent = [headerRow, ...rows].join('\n');
    console.log(`CSV generado exitosamente con ${rows.length} filas`);
    return csvContent;

  } catch (error) {
    console.error("Error al generar CSV:", error);
    return "";
  }
};

/**
 * Obtiene datos de Monday.com y los transforma al formato del dashboard
 * @param {string} boardId - ID del tablero en Monday.com
 * @param {Object} columnMapping - Mapeo de columnas de Monday.com a categorías del dashboard
 * @returns {Object} - Datos transformados y CSV generado
 */
const getMondayDataForDashboard = async (boardId, columnMapping) => {
  try {
    const boardData = await getBoardData(boardId);
    // console.log(`Datos obtenidos de Monday.com:`, {
    //   tablero: boardData.name,
    //   columnas: boardData.columns ? boardData.columns.length : 0,
    //   filas: boardData.items_page.items ? boardData.items_page.items.length : 0
    // });
    const transformedData = transformBoardData(boardData, columnMapping);
    const csvContent = generateCSV(transformedData);

    return {
      boardName: boardData.name,
      rawData: boardData,
      transformedData,
      csvContent
    };
  } catch (error) {
    console.error('Error al procesar datos de Monday.com:', error);
    throw error;
  }
};

module.exports = {
  getBoardData,
  transformBoardData,
  generateCSV,
  getMondayDataForDashboard
};