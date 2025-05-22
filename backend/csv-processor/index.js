const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

// Configuración
const KPI_DATA_TABLE = process.env.KPI_DATA_TABLE;
const NOTIFICATION_TOPIC = process.env.NOTIFICATION_TOPIC;

/**
 * Procesa un archivo CSV de S3 y calcula KPIs
 */
exports.handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event, null, 2));
    
    try {
        // Si es un evento de API Gateway
        if (event.body) {
            const body = JSON.parse(event.body);
            const { bucketName, key, userId } = body;
            
            if (!bucketName || !key) {
                return {
                    statusCode: 400,
                    headers: corsHeaders(),
                    body: JSON.stringify({ error: 'Se requieren bucketName y key' })
                };
            }
            
            await processCSVFile(bucketName, key, userId);
            
            return {
                statusCode: 200,
                headers: corsHeaders(),
                body: JSON.stringify({ 
                    message: 'Archivo CSV procesado correctamente',
                    file: key
                })
            };
        }
        
        // Si es un evento de S3
        if (event.Records && event.Records[0].eventSource === 'aws:s3') {
            const bucket = event.Records[0].s3.bucket.name;
            const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
            
            await processCSVFile(bucket, key);
            
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Archivo CSV procesado correctamente' })
            };
        }
        
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Evento no soportado' })
        };
    } catch (error) {
        console.error('Error:', error);
        
        // Notificar error
        await sendNotification(`Error al procesar CSV: ${error.message}`);
        
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Error al procesar el archivo CSV' })
        };
    }
};

/**
 * Procesa un archivo CSV desde S3
 */
async function processCSVFile(bucket, key, userId = 'system') {
    console.log(`Procesando archivo CSV: ${bucket}/${key}`);
    
    // Obtener el archivo de S3
    const s3Object = await s3.getObject({
        Bucket: bucket,
        Key: key
    }).promise();
    
    // Convertir el contenido del archivo a texto
    const csvContent = s3Object.Body.toString('utf-8');
    
    console.log('Primeras líneas del CSV:', csvContent.substring(0, 200));
    
    // Procesar el CSV
    const { kpiData, summary } = parseCSV(csvContent, key, userId);
    
    // Guardar los datos en DynamoDB
    await saveKPIData(kpiData);
    
    // Notificar que el procesamiento ha finalizado
    await sendNotification(`Archivo CSV procesado: ${key}\n\nResumen:\n${JSON.stringify(summary, null, 2)}`);
    
    return summary;
}

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
        h !== 'Name' && h !== 'ID' && h !== 'Comments' && h !== 'Commentario' && h !== 'Item ID (auto generated)');
    
    // Inicializar contadores para el resumen
    const summary = {
        totalRecords: 0,
        okCount: 0,
        noCount: 0,
        naCount: 0,
        byCategory: {},
        uniqueErrors: [] // Para almacenar errores únicos de la columna Commentario
    };
    
    // Inicializar contadores por categoría
    categories.forEach(category => {
        summary.byCategory[category] = {
            ok: 0,
            no: 0,
            na: 0
        };
    });
    
    // Set para almacenar errores únicos
    const uniqueErrorsSet = new Set();
    
    // Procesar cada línea de datos
    const kpiData = [];
    
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
        
        // Generar un ID único para el registro
        const id = `${date}-${record.ID || i}`;
        
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
            } else if (value === 'NO') {
                summary.noCount++;
                summary.byCategory[category].no++;
            } else if (value === 'N/A') {
                summary.naCount++;
                summary.byCategory[category].na++;
            }
        });
        
        // Capturar todos los comentarios no vacíos, independientemente de si hay errores
        const comment = record.Commentario || record.Comments;
        
        if (comment && comment.trim() !== '' && comment.trim() !== 'Commentario') {
            uniqueErrorsSet.add(comment.trim());
        }
        
        kpiData.push(item);
        summary.totalRecords++;
    }
    
    // Calcular tasas de cumplimiento
    summary.complianceRate = summary.totalRecords > 0 
        ? (summary.okCount / (summary.totalRecords - summary.naCount) * 100).toFixed(2) 
        : 0;
    
    categories.forEach(category => {
        const categoryData = summary.byCategory[category];
        const total = categoryData.ok + categoryData.no;
        categoryData.complianceRate = total > 0 
            ? (categoryData.ok / total * 100).toFixed(2) 
            : 0;
    });
    
    // Convertir el Set de errores únicos a un array
    summary.uniqueErrors = Array.from(uniqueErrorsSet);
    
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
                [KPI_DATA_TABLE]: batch.map(item => ({
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

/**
 * Envía una notificación a través de SNS
 */
async function sendNotification(message) {
    const params = {
        Message: message,
        TopicArn: NOTIFICATION_TOPIC,
        Subject: 'KPI Dashboard - Notificación de procesamiento CSV'
    };
    
    await sns.publish(params).promise();
    console.log('Notificación enviada');
}

/**
 * Devuelve los headers CORS para las respuestas
 */
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };
}