const fs = require('fs');
const AWS = require('aws-sdk');
const path = require('path');
const mondayService = require('../services/mondayService');
const csvController = require('./csvController');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const CONFIG_FILE_KEY = 'monday_config.json';

// Cargar configuración de Monday.com
async function loadMondayConfig() {
  try {
    const params = { Bucket: BUCKET_NAME, Key: CONFIG_FILE_KEY };
    const data = await s3.getObject(params).promise();
    return JSON.parse(data.Body.toString('utf-8'));
  } catch (error) {
    console.error('Error cargando config desde S3:', error);
    return { boards: [], columnMappings: {} };
  }
}

async function saveMondayConfig(config) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: CONFIG_FILE_KEY,
      Body: JSON.stringify(config, null, 2),
      ContentType: 'application/json'
    };
    await s3.putObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error guardando config en S3:', error);
    return false;
  }
}

// Controlador para obtener datos de un tablero de Monday.com
exports.getMondayBoardData = async (req, res) => {
  try {
    const { boardId } = req.params;

    if (!boardId) {
      return res.status(400).json({ error: 'Se requiere ID del tablero' });
    }

    // Obtener configuración de mapeo para este tablero
    const config = loadMondayConfig();
    const columnMapping = config.columnMappings[boardId] || {};

    // Obtener datos del tablero
    const boardData = await mondayService.getBoardData(boardId);

    res.json({ boardData });
  } catch (error) {
    console.error('Error al obtener datos del tablero de Monday.com:', error);
    res.status(500).json({ error: `Error al obtener datos del tablero` });
  }
};

// Controlador para configurar el mapeo de columnas
exports.configureColumnMapping = (req, res) => {
  try {
    const { boardId, columnMapping } = req.body;

    if (!boardId || !columnMapping) {
      return res.status(400).json({ error: 'Se requieren ID del tablero y mapeo de columnas' });
    }

    // Cargar configuración actual
    const config = loadMondayConfig();

    // Actualizar mapeo para este tablero
    config.columnMappings[boardId] = columnMapping;

    // Añadir el tablero a la lista si no existe
    if (!config.boards.some(board => board.id === boardId)) {
      config.boards.push({ id: boardId, name: req.body.boardName || `Tablero ${boardId}` });
    }

    // Guardar configuración actualizada
    if (saveMondayConfig(config)) {
      res.json({
        message: 'Configuración de mapeo guardada correctamente',
        columnMapping
      });
    } else {
      res.status(500).json({ error: 'Error al guardar la configuración de mapeo' });
    }
  } catch (error) {
    console.error('Error al configurar mapeo de columnas:', error);
    res.status(500).json({ error: 'Error al configurar mapeo de columnas' });
  }
};

// Controlador para obtener datos transformados y generar CSV
exports.getTransformedData = async (req, res) => {
  try {
    const { boardId } = req.params;

    if (!boardId) {
      return res.status(400).json({ error: 'Se requiere ID del tablero' });
    }

    // Obtener configuración de mapeo para este tablero
    const config = loadMondayConfig();
    const columnMapping = config.columnMappings[boardId];

    if (!columnMapping) {
      return res.status(400).json({ error: 'No existe configuración de mapeo para este tablero' });
    }

    // Obtener datos transformados
    const result = await mondayService.getMondayDataForDashboard(boardId, columnMapping);

    res.json({
      boardName: result.boardName,
      transformedData: result.transformedData,
      csvContent: result.csvContent
    });
  } catch (error) {
    console.error('Error al obtener datos transformados:', error);
    res.status(500).json({ error: 'Error al obtener datos transformados' });
  }
};

// Controlador para importar datos directamente al dashboard
exports.importToKPIDashboard = async (req, res) => {
  try {
    const { boardId } = req.params;

    if (!boardId) {
      return res.status(400).json({ error: 'Se requiere ID del tablero' });
    }

    // Obtener configuración de mapeo para este tablero
    const config = loadMondayConfig();
    const columnMapping = config.columnMappings[boardId];

    if (!columnMapping) {
      return res.status(400).json({ error: 'No existe configuración de mapeo para este tablero' });
    }

    // Obtener datos transformados y CSV
    const result = await mondayService.getMondayDataForDashboard(boardId, columnMapping);

    // Crear un archivo CSV temporal
    const tempFilePath = path.join(__dirname, '../uploads', `monday_import_${Date.now()}.csv`);
    fs.writeFileSync(tempFilePath, result.csvContent);

    // Procesar el CSV utilizando el controlador existente
    // Simulamos un objeto req con el archivo
    const mockReq = {
      file: {
        path: tempFilePath,
        originalname: `${result.boardName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      }
    };

    // Procesamos el CSV
    // const processResult = await new Promise((resolve, reject) => {
    //   csvController.processCSV(mockReq, {
    //     json: (data) => resolve(data),
    //     status: (code) => ({
    //       json: (data) => {
    //         data.statusCode = code;
    //         reject(data);
    //       }
    //     })
    //   });
    // });
    // En mondayController.js
    // Función para procesar directamente el archivo CSV generado
    const processCsvDirectly = async (filePath) => {
      try {
        const csvData = fs.readFileSync(filePath, 'utf8');
        const lines = csvData.split('\n');

        if (lines.length <= 1) {
          throw new Error('El CSV no contiene datos suficientes');
        }

        const headers = parseCSVLine(lines[0]);
        const rows = [];

        // Índices para los contadores de OK, NO, N/A
        const totalOKIndex = headers.indexOf('Total_OK');
        const totalNOIndex = headers.indexOf('Total_NO');
        const totalNAIndex = headers.indexOf('Total_NA');
        const totalKPIsIndex = headers.indexOf('Total_KPIs');

        // Estadísticas globales
        const stats = {
          totalRows: lines.length - 1,
          totalOK: 0,
          totalNO: 0,
          totalNA: 0,
          totalKPIs: 0,
          // Estadísticas por fecha
          byDate: {}
        };

        // Procesar cada línea de datos
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue; // Saltar líneas vacías

          const values = parseCSVLine(lines[i]);

          if (values.length !== headers.length) {
            console.warn(`Advertencia: La línea ${i} tiene ${values.length} valores pero se esperaban ${headers.length}`);
            continue;
          }

          // Convertir la línea en un objeto
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx];
          });

          // Añadir la fila procesada
          rows.push(row);

          // Actualizar estadísticas globales
          if (totalOKIndex >= 0) stats.totalOK += parseInt(values[totalOKIndex] || 0, 10);
          if (totalNOIndex >= 0) stats.totalNO += parseInt(values[totalNOIndex] || 0, 10);
          if (totalNAIndex >= 0) stats.totalNA += parseInt(values[totalNAIndex] || 0, 10);
          if (totalKPIsIndex >= 0) stats.totalKPIs += parseInt(values[totalKPIsIndex] || 0, 10);

          // Guardar estadísticas por fecha si hay una columna 'Name' (fecha)
          const dateIndex = headers.indexOf('Name');
          if (dateIndex >= 0) {
            const date = values[dateIndex];
            if (date && !stats.byDate[date]) {
              stats.byDate[date] = {
                ok: totalOKIndex >= 0 ? parseInt(values[totalOKIndex] || 0, 10) : 0,
                no: totalNOIndex >= 0 ? parseInt(values[totalNOIndex] || 0, 10) : 0,
                na: totalNAIndex >= 0 ? parseInt(values[totalNAIndex] || 0, 10) : 0,
                total: totalKPIsIndex >= 0 ? parseInt(values[totalKPIsIndex] || 0, 10) : 0
              };
            }
          }
        }

        return {
          success: true,
          message: 'CSV procesado correctamente',
          rows: rows.length,
          data: rows,
          stats: stats
        };
      } catch (error) {
        throw new Error(`Error al procesar CSV directamente: ${error.message}`);
      }
    };

    // Función auxiliar para parsear una línea CSV correctamente (maneja comillas y escapes)
    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          // Si encontramos una comilla
          if (inQuotes) {
            // Verificar si es una comilla escapada (doble comilla)
            if (i + 1 < line.length && line[i + 1] === '"') {
              current += '"';
              i++; // Saltar la siguiente comilla
            } else {
              inQuotes = false;
            }
          } else {
            inQuotes = true;
          }
        } else if (char === ',' && !inQuotes) {
          // Si encontramos una coma fuera de comillas, finalizamos el valor actual
          result.push(current);
          current = '';
        } else {
          // Para cualquier otro carácter, lo añadimos al valor actual
          current += char;
        }
      }

      // Añadir el último valor
      result.push(current);

      return result;
    }

    // Y luego reemplaza el bloque problemático con:
    console.warn(`CSV guardado en: ${tempFilePath}`);
    const processResult = await processCsvDirectly(tempFilePath);

    // Eliminar el archivo temporal
    // fs.unlinkSync(tempFilePath);

    res.json({
      message: 'Datos importados correctamente al dashboard',
      importResult: processResult,
      boardName: result.boardName,
      filePath: tempFilePath
    });
  } catch (error) {
    console.error('Error al importar datos al dashboard:', error);
    res.status(500).json({ error: 'Error al importar datos al dashboard' });
  }
};

// Controlador para listar tableros configurados
exports.listConfiguredBoards = (req, res) => {
  try {
    const config = loadMondayConfig();
    res.json({ boards: config.boards });
  } catch (error) {
    console.error('Error al listar tableros configurados:', error);
    res.status(500).json({ error: 'Error al listar tableros configurados' });
  }
};

// Controlador para obtener mapeo de columnas de un tablero
exports.getColumnMapping = (req, res) => {
  try {
    const { boardId } = req.params;

    if (!boardId) {
      return res.status(400).json({ error: 'Se requiere ID del tablero' });
    }

    const config = loadMondayConfig();
    const columnMapping = config.columnMappings[boardId] || {};

    res.json({ columnMapping });
  } catch (error) {
    console.error('Error al obtener mapeo de columnas:', error);
    res.status(500).json({ error: 'Error al obtener mapeo de columnas' });
  }
};

exports.getFile = async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Se requiere la ruta del archivo' });
    }
    
    // IMPORTANTE: Validación de seguridad para evitar acceso a rutas no permitidas
    // Esto asegura que solo se puedan acceder a archivos dentro de la carpeta uploads
    const uploadsDir = path.join(__dirname, '../uploads');
    const normalizedFilePath = path.normalize(filePath);
    
    if (!normalizedFilePath.startsWith(uploadsDir)) {
      console.error('Intento de acceso a archivo fuera del directorio permitido:', filePath);
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    // Verificar que el archivo existe
    if (!fs.existsSync(normalizedFilePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    // Obtener el nombre del archivo
    const fileName = path.basename(normalizedFilePath);
    
    // Configurar cabeceras para descarga
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Enviar el archivo como stream (mejor para archivos grandes)
    const fileStream = fs.createReadStream(normalizedFilePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error al obtener archivo:', error);
    res.status(500).json({ error: 'Error al obtener archivo' });
  }
};