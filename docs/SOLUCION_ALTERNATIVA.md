# Solución Alternativa para KPI Dashboard

Si tienes problemas para implementar el backend completo con AWS, puedes utilizar esta solución alternativa que simula la funcionalidad de carga y procesamiento de archivos CSV directamente en el frontend.

## Implementación

1. Crea un archivo CSV de ejemplo con el formato correcto:

```
Name,Ventas por Tienda,Ventas Presidencia,Reportes Operativos,Comments
01/05/2023,OK,NO,OK,Todo bien en general
02/05/2023,OK,OK,OK,Sin problemas
03/05/2023,NO,NO,OK,Problemas en ventas
04/05/2023,OK,N/A,NO,Reporte operativo con errores
05/05/2023,OK,OK,OK,Todo correcto
```

2. Modifica el archivo `frontend/src/services/csvService.js` para procesar el archivo localmente:

```javascript
import { getAuthHeaders, getUserId } from './authService';

// Función para procesar un archivo CSV localmente
const processCSVLocally = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvContent = event.target.result;
        const lines = csvContent.split('\\n');
        
        // Verificar que hay al menos una línea de encabezado y datos
        if (lines.length < 2) {
          reject(new Error('El archivo CSV está vacío o no tiene suficientes datos'));
          return;
        }
        
        // Extraer encabezados
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Verificar que el formato del CSV es el esperado
        if (!headers.includes('Name')) {
          reject(new Error('El formato del CSV no es válido. Debe incluir una columna "Name"'));
          return;
        }
        
        // Extraer las categorías (todas las columnas excepto Name, ID y Comments)
        const categories = headers.filter(h => 
          h !== 'Name' && h !== 'ID' && h !== 'Comments');
        
        // Inicializar contadores para el resumen
        const summary = {
          totalRecords: 0,
          okCount: 0,
          noCount: 0,
          naCount: 0,
          byCategory: {},
          byDate: {},
          trend: []
        };
        
        // Inicializar contadores por categoría
        categories.forEach(category => {
          summary.byCategory[category] = {
            ok: 0,
            no: 0,
            na: 0
          };
        });
        
        // Procesar cada línea de datos
        const kpiData = [];
        const dateRecords = {};
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Saltar líneas vacías
          
          const values = line.split(',').map(val => val.trim());
          
          // Verificar que la línea tiene suficientes valores
          if (values.length < headers.length) {
            console.warn(`Línea ${i} no tiene suficientes valores, saltando`);
            continue;
          }
          
          // Crear un objeto con los valores de la línea
          const record = {};
          headers.forEach((header, index) => {
            record[header] = values[index];
          });
          
          // Extraer la fecha del campo Name (formato DD/MM/YYYY)
          const dateMatch = record.Name.match(/(\\d{2})\\/(\\d{2})\\/(\\d{4})/);
          if (!dateMatch) {
            console.warn(`Formato de fecha inválido en línea ${i}: ${record.Name}`);
            continue;
          }
          
          const [_, day, month, year] = dateMatch;
          const date = `${year}-${month}-${day}`;
          
          // Inicializar contadores por fecha si no existen
          if (!dateRecords[date]) {
            dateRecords[date] = {
              ok: 0,
              no: 0,
              na: 0
            };
          }
          
          // Generar un ID único para el registro
          const id = `${date}-${i}`;
          
          // Crear el objeto de datos
          const item = {
            id,
            date,
            fileName: file.name,
            createdAt: new Date().toISOString(),
            rawData: record
          };
          
          // Procesar cada categoría y actualizar contadores
          categories.forEach(category => {
            const value = record[category];
            item[`category_${category.replace(/\\s+/g, '_')}`] = value;
            
            // Actualizar contadores
            if (value === 'OK') {
              summary.okCount++;
              summary.byCategory[category].ok++;
              dateRecords[date].ok++;
            } else if (value === 'NO') {
              summary.noCount++;
              summary.byCategory[category].no++;
              dateRecords[date].no++;
            } else if (value === 'N/A') {
              summary.naCount++;
              summary.byCategory[category].na++;
              dateRecords[date].na++;
            }
          });
          
          kpiData.push(item);
          summary.totalRecords++;
        }
        
        // Calcular tasas de cumplimiento
        const totalValid = summary.okCount + summary.noCount;
        summary.complianceRate = totalValid > 0 
          ? (summary.okCount / totalValid * 100).toFixed(2) 
          : 0;
        
        // Calcular tasas de cumplimiento por categoría
        Object.keys(summary.byCategory).forEach(category => {
          const categoryData = summary.byCategory[category];
          const total = categoryData.ok + categoryData.no;
          categoryData.complianceRate = total > 0 
            ? (categoryData.ok / total * 100).toFixed(2) 
            : 0;
        });
        
        // Calcular tasas de cumplimiento por fecha y generar tendencia
        Object.keys(dateRecords).forEach(date => {
          const dateData = dateRecords[date];
          const total = dateData.ok + dateData.no;
          const complianceRate = total > 0 
            ? (dateData.ok / total * 100).toFixed(2) 
            : 0;
          
          summary.byDate[date] = {
            ...dateData,
            complianceRate
          };
          
          summary.trend.push({
            date,
            complianceRate: parseFloat(complianceRate),
            ok: dateData.ok,
            no: dateData.no,
            na: dateData.na
          });
        });
        
        // Ordenar la tendencia por fecha
        summary.trend.sort((a, b) => a.date.localeCompare(b.date));
        
        // Guardar los datos en localStorage para simular persistencia
        const userId = getUserId();
        const storageKey = `kpi_dashboard_data_${userId}`;
        const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
        localStorage.setItem(storageKey, JSON.stringify([...existingData, ...kpiData]));
        
        // Guardar el resumen en localStorage
        const summaryKey = `kpi_dashboard_summary_${userId}`;
        localStorage.setItem(summaryKey, JSON.stringify(summary));
        
        // Guardar información del archivo
        const filesKey = `kpi_dashboard_files_${userId}`;
        const existingFiles = JSON.parse(localStorage.getItem(filesKey) || '[]');
        const fileInfo = {
          key: `${userId}/${file.name}`,
          name: file.name,
          size: file.size,
          lastModified: new Date().toISOString()
        };
        localStorage.setItem(filesKey, JSON.stringify([...existingFiles, fileInfo]));
        
        resolve({ summary, file: fileInfo });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsText(file);
  });
};

// Reemplazar las funciones existentes con versiones locales

export const uploadCSV = async (file) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    
    console.log(`Procesando archivo localmente: ${file.name}`);
    
    // Procesar el archivo localmente
    const result = await processCSVLocally(file);
    
    return {
      message: 'Archivo procesado correctamente',
      file: result.file,
      summary: result.summary
    };
  } catch (error) {
    console.error('Error al procesar archivo CSV:', error);
    throw error;
  }
};

export const getCSVFiles = async () => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    
    // Obtener archivos desde localStorage
    const filesKey = `kpi_dashboard_files_${userId}`;
    const files = JSON.parse(localStorage.getItem(filesKey) || '[]');
    
    return { files };
  } catch (error) {
    console.error('Error al obtener archivos CSV:', error);
    throw error;
  }
};

export const getCSVPreview = async (key, maxLines = 10) => {
  try {
    // Simular vista previa
    const fileName = key.split('/').pop();
    
    // Devolver vista previa genérica
    return {
      preview: [
        'Name,Ventas por Tienda,Ventas Presidencia,Reportes Operativos,Comments',
        '01/05/2023,OK,NO,OK,Todo bien en general',
        '02/05/2023,OK,OK,OK,Sin problemas'
      ]
    };
  } catch (error) {
    console.error('Error al obtener vista previa de CSV:', error);
    throw error;
  }
};

export const deleteCSVFile = async (key) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    
    // Eliminar archivo de localStorage
    const filesKey = `kpi_dashboard_files_${userId}`;
    const files = JSON.parse(localStorage.getItem(filesKey) || '[]');
    const updatedFiles = files.filter(file => file.key !== key);
    localStorage.setItem(filesKey, JSON.stringify(updatedFiles));
    
    return {
      message: 'Archivo eliminado correctamente'
    };
  } catch (error) {
    console.error('Error al eliminar archivo CSV:', error);
    throw error;
  }
};
```

3. Modifica el archivo `frontend/src/services/apiService.js` para obtener datos desde localStorage:

```javascript
import { getUserId } from './authService';

export const getKPIData = async (startDate, endDate, category, limit) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    
    // Obtener datos desde localStorage
    const storageKey = `kpi_dashboard_data_${userId}`;
    const allData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Filtrar por fecha
    let filteredData = allData;
    if (startDate && endDate) {
      filteredData = filteredData.filter(item => 
        item.date >= startDate && item.date <= endDate
      );
    }
    
    // Filtrar por categoría si se proporciona
    if (category) {
      const categoryKey = `category_${category.replace(/\\s+/g, '_')}`;
      filteredData = filteredData.filter(item => item[categoryKey] === 'OK');
    }
    
    // Limitar resultados
    if (limit && filteredData.length > limit) {
      filteredData = filteredData.slice(0, limit);
    }
    
    return { data: filteredData };
  } catch (error) {
    console.error('Error al obtener datos de KPI:', error);
    throw error;
  }
};

export const getKPISummary = async (startDate, endDate) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    
    // Obtener resumen desde localStorage
    const summaryKey = `kpi_dashboard_summary_${userId}`;
    const summary = JSON.parse(localStorage.getItem(summaryKey) || '{}');
    
    // Si no hay resumen, devolver uno vacío
    if (!summary.totalRecords) {
      return {
        summary: {
          totalRecords: 0,
          okCount: 0,
          noCount: 0,
          naCount: 0,
          complianceRate: 0,
          byCategory: {},
          byDate: {},
          trend: []
        }
      };
    }
    
    // Filtrar tendencia por fecha
    if (startDate && endDate && summary.trend) {
      summary.trend = summary.trend.filter(item => 
        item.date >= startDate && item.date <= endDate
      );
      
      // Filtrar fechas en byDate
      const filteredByDate = {};
      Object.keys(summary.byDate).forEach(date => {
        if (date >= startDate && date <= endDate) {
          filteredByDate[date] = summary.byDate[date];
        }
      });
      summary.byDate = filteredByDate;
    }
    
    return { summary };
  } catch (error) {
    console.error('Error al obtener resumen de KPI:', error);
    throw error;
  }
};

// Implementaciones simplificadas para comentarios
export const addComment = async (date, comment) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    
    const commentsKey = `kpi_dashboard_comments_${userId}`;
    const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]');
    
    const newComment = {
      id: `comment-${Date.now()}`,
      userId,
      userName: 'Usuario Demo',
      date,
      comment,
      createdAt: new Date().toISOString()
    };
    
    comments.unshift(newComment);
    localStorage.setItem(commentsKey, JSON.stringify(comments));
    
    return {
      message: 'Comentario agregado correctamente',
      comment: newComment
    };
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    throw error;
  }
};

export const getComments = async (startDate, endDate, limit = 20) => {
  try {
    const userId = getUserId();
    
    const commentsKey = `kpi_dashboard_comments_${userId}`;
    let comments = JSON.parse(localStorage.getItem(commentsKey) || '[]');
    
    // Filtrar por fecha
    if (startDate && endDate) {
      comments = comments.filter(comment => 
        comment.date >= startDate && comment.date <= endDate
      );
    }
    
    // Limitar resultados
    if (comments.length > limit) {
      comments = comments.slice(0, limit);
    }
    
    return { comments };
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    throw error;
  }
};
```

4. Actualiza el archivo `.env` en el directorio del frontend:

```
REACT_APP_DEMO_MODE=true
```

## Uso

Con esta solución alternativa, podrás:

1. Cargar archivos CSV desde la interfaz de usuario
2. Ver los datos procesados en el dashboard
3. Los datos se almacenarán en localStorage, por lo que persistirán entre sesiones del navegador

Esta solución es útil para demostración y desarrollo, pero para un entorno de producción se recomienda implementar el backend completo con AWS Lambda, DynamoDB y S3.