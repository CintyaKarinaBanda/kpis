const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Nombre de la tabla DynamoDB para almacenar los datos de KPI
const KPI_TABLE = process.env.KPI_TABLE || 'kpi-dashboard-data';

/**
 * Función Lambda para procesar archivos CSV y almacenar los datos en DynamoDB
 */
exports.handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event, null, 2));
    
    try {
        // Obtener información del archivo CSV desde el evento
        const bucket = event.Records[0].s3.bucket.name;
        const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
        
        console.log(`Procesando archivo CSV: ${bucket}/${key}`);
        
        // Extraer el ID de usuario del key (formato: userId/filename.csv)
        const userId = key.split('/')[0];
        
        // Obtener el archivo de S3
        const s3Object = await s3.getObject({
            Bucket: bucket,
            Key: key
        }).promise();
        
        // Convertir el contenido del archivo a texto
        const csvContent = s3Object.Body.toString('utf-8');
        
        // Procesar el CSV
        const { kpiData, summary } = parseCSV(csvContent, key, userId);
        
        // Guardar los datos en DynamoDB
        await saveKPIData(kpiData);
        
        console.log('Procesamiento completado con éxito');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Archivo CSV procesado correctamente',
                summary
            })
        };
    } catch (error) {
        console.error('Error al procesar el archivo CSV:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Error al procesar el archivo CSV',
                details: error.message
            })
        };
    }
};

/**
 * Analiza el contenido CSV y extrae los KPIs
 */
function parseCSV(csvContent, fileKey, userId) {
    const lines = csvContent.split('\n');
    
    // Verificar que hay al menos una línea de encabezado y datos
    if (lines.length < 2) {
        throw new Error('El archivo CSV está vacío o no tiene suficientes datos');
    }
    
    // Extraer encabezados
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Verificar que el formato del CSV es el esperado
    if (!headers.includes('Name')) {
        throw new Error('El formato del CSV no es válido. Debe incluir una columna "Name"');
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
        const dateMatch = record.Name.match(/(\d{2})\/(\d{2})\/(\d{4})/);
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
        const id = `${date}-${record.ID || i}-${userId}`;
        
        // Crear el objeto de datos para DynamoDB
        const item = {
            id,
            date,
            userId,
            fileName: fileKey,
            createdAt: new Date().toISOString(),
            rawData: record
        };
        
        // Procesar cada categoría y actualizar contadores
        categories.forEach(category => {
            const value = record[category];
            item[`category_${category.replace(/\s+/g, '_')}`] = value;
            
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
    
    return { kpiData, summary };
}

/**
 * Guarda los datos de KPI en DynamoDB
 */
async function saveKPIData(kpiData) {
    if (kpiData.length === 0) {
        return;
    }
    
    // Dividir en lotes de 25 elementos (límite de BatchWrite)
    const batches = [];
    for (let i = 0; i < kpiData.length; i += 25) {
        batches.push(kpiData.slice(i, i + 25));
    }
    
    // Procesar cada lote
    for (const batch of batches) {
        const params = {
            RequestItems: {
                [KPI_TABLE]: batch.map(item => ({
                    PutRequest: {
                        Item: item
                    }
                }))
            }
        };
        
        await dynamoDB.batchWrite(params).promise();
    }
    
    console.log(`Guardados ${kpiData.length} registros en DynamoDB`);
}