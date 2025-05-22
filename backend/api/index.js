const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Configuración
const USERS_TABLE = process.env.USERS_TABLE;
const KPI_DATA_TABLE = process.env.KPI_DATA_TABLE;
const CONFIG_TABLE = process.env.CONFIG_TABLE;
const CSV_BUCKET = process.env.CSV_BUCKET;

/**
 * Maneja las operaciones de la API para el dashboard de KPIs
 */
exports.handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event, null, 2));
    
    try {
        const body = JSON.parse(event.body);
        const { action } = body;
        
        switch (action) {
            case 'getKPIData':
                return await handleGetKPIData(body);
            case 'getKPISummary':
                return await handleGetKPISummary(body);
            case 'getCSVFiles':
                return await handleGetCSVFiles(body);
            case 'getCSVPreview':
                return await handleGetCSVPreview(body);
            case 'deleteCSVFile':
                return await handleDeleteCSVFile(body);
            case 'addComment':
                return await handleAddComment(body);
            case 'getComments':
                return await handleGetComments(body);
            default:
                return {
                    statusCode: 400,
                    headers: corsHeaders(),
                    body: JSON.stringify({ error: 'Acción no soportada' })
                };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({ error: error.message || 'Error en el servicio de API' })
        };
    }
};

/**
 * Maneja la obtención de datos de KPI
 */
async function handleGetKPIData(data) {
    const { userId, startDate, endDate, category, limit = 1000 } = data;
    
    if (!userId) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requiere ID de usuario' })
        };
    }
    
    try {
        let params = {
            TableName: KPI_DATA_TABLE,
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            },
            Limit: limit
        };
        
        // Filtrar por fecha si se proporciona
        if (startDate && endDate) {
            params.IndexName = 'DateIndex';
            params.KeyConditionExpression = 'date BETWEEN :startDate AND :endDate';
            params.ExpressionAttributeValues[':startDate'] = startDate;
            params.ExpressionAttributeValues[':endDate'] = endDate;
        }
        
        // Filtrar por categoría si se proporciona
        if (category) {
            params.IndexName = 'CategoryIndex';
            params.KeyConditionExpression = 'category = :category';
            params.ExpressionAttributeValues[':category'] = category;
        }
        
        const result = await dynamoDB.query(params).promise();
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                data: result.Items || []
            })
        };
    } catch (error) {
        console.error('Error al obtener datos de KPI:', error);
        throw error;
    }
}

/**
 * Maneja la obtención del resumen de KPIs
 */
async function handleGetKPISummary(data) {
    const { userId, startDate, endDate } = data;
    
    if (!userId) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requiere ID de usuario' })
        };
    }
    
    try {
        // Obtener todos los datos de KPI del usuario en el rango de fechas
        const kpiData = await getKPIDataByDateRange(userId, startDate, endDate);
        
        // Calcular el resumen
        const summary = calculateKPISummary(kpiData);
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                summary
            })
        };
    } catch (error) {
        console.error('Error al obtener resumen de KPI:', error);
        throw error;
    }
}

/**
 * Obtiene los datos de KPI por rango de fechas
 */
async function getKPIDataByDateRange(userId, startDate, endDate) {
    let params = {
        TableName: KPI_DATA_TABLE,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        }
    };
    
    // Filtrar por fecha si se proporciona
    if (startDate && endDate) {
        params.IndexName = 'DateIndex';
        params.KeyConditionExpression = 'date BETWEEN :startDate AND :endDate';
        params.ExpressionAttributeValues[':startDate'] = startDate;
        params.ExpressionAttributeValues[':endDate'] = endDate;
    }
    
    const result = await dynamoDB.query(params).promise();
    return result.Items || [];
}

/**
 * Calcula el resumen de KPIs a partir de los datos
 */
function calculateKPISummary(kpiData) {
    // Inicializar el resumen
    const summary = {
        totalRecords: kpiData.length,
        okCount: 0,
        noCount: 0,
        naCount: 0,
        complianceRate: 0,
        byCategory: {},
        byDate: {},
        trend: []
    };
    
    // Si no hay datos, devolver el resumen vacío
    if (kpiData.length === 0) {
        return summary;
    }
    
    // Extraer todas las categorías únicas
    const categories = new Set();
    kpiData.forEach(item => {
        Object.keys(item).forEach(key => {
            if (key.startsWith('category_')) {
                const category = key.replace('category_', '').replace(/_/g, ' ');
                categories.add(category);
            }
        });
    });
    
    // Inicializar contadores por categoría
    categories.forEach(category => {
        summary.byCategory[category] = {
            ok: 0,
            no: 0,
            na: 0,
            complianceRate: 0
        };
    });
    
    // Procesar cada registro
    kpiData.forEach(item => {
        const date = item.date;
        
        // Inicializar contadores por fecha si no existen
        if (!summary.byDate[date]) {
            summary.byDate[date] = {
                ok: 0,
                no: 0,
                na: 0,
                complianceRate: 0
            };
        }
        
        // Procesar cada categoría
        categories.forEach(category => {
            const categoryKey = `category_${category.replace(/\s+/g, '_')}`;
            const value = item[categoryKey];
            
            if (value === 'OK') {
                summary.okCount++;
                summary.byCategory[category].ok++;
                summary.byDate[date].ok++;
            } else if (value === 'NO') {
                summary.noCount++;
                summary.byCategory[category].no++;
                summary.byDate[date].no++;
            } else if (value === 'N/A') {
                summary.naCount++;
                summary.byCategory[category].na++;
                summary.byDate[date].na++;
            }
        });
    });
    
    // Calcular tasas de cumplimiento
    const totalValid = summary.okCount + summary.noCount;
    summary.complianceRate = totalValid > 0 
        ? (summary.okCount / totalValid * 100).toFixed(2) 
        : 0;
    
    // Calcular tasas de cumplimiento por categoría
    categories.forEach(category => {
        const categoryData = summary.byCategory[category];
        const total = categoryData.ok + categoryData.no;
        categoryData.complianceRate = total > 0 
            ? (categoryData.ok / total * 100).toFixed(2) 
            : 0;
    });
    
    // Calcular tasas de cumplimiento por fecha
    Object.keys(summary.byDate).forEach(date => {
        const dateData = summary.byDate[date];
        const total = dateData.ok + dateData.no;
        dateData.complianceRate = total > 0 
            ? (dateData.ok / total * 100).toFixed(2) 
            : 0;
    });
    
    // Generar datos de tendencia
    summary.trend = Object.keys(summary.byDate)
        .sort()
        .map(date => ({
            date,
            complianceRate: parseFloat(summary.byDate[date].complianceRate),
            ok: summary.byDate[date].ok,
            no: summary.byDate[date].no,
            na: summary.byDate[date].na
        }));
    
    return summary;
}

/**
 * Maneja la obtención de archivos CSV
 */
async function handleGetCSVFiles(data) {
    const { userId } = data;
    
    if (!userId) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requiere ID de usuario' })
        };
    }
    
    try {
        const params = {
            Bucket: CSV_BUCKET,
            Prefix: `${userId}/`
        };
        
        const result = await s3.listObjectsV2(params).promise();
        
        const files = result.Contents
            .filter(item => item.Key.endsWith('.csv'))
            .map(item => ({
                key: item.Key,
                name: item.Key.split('/').pop(),
                size: item.Size,
                lastModified: item.LastModified
            }));
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                files
            })
        };
    } catch (error) {
        console.error('Error al obtener archivos CSV:', error);
        throw error;
    }
}

/**
 * Maneja la obtención de una vista previa de un archivo CSV
 */
async function handleGetCSVPreview(data) {
    const { key, maxLines = 10 } = data;
    
    if (!key) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requiere clave del archivo' })
        };
    }
    
    try {
        const params = {
            Bucket: CSV_BUCKET,
            Key: key
        };
        
        const result = await s3.getObject(params).promise();
        const content = result.Body.toString('utf-8');
        
        // Dividir el contenido en líneas y tomar solo las primeras maxLines
        const lines = content.split('\n').slice(0, maxLines);
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                preview: lines
            })
        };
    } catch (error) {
        console.error('Error al obtener vista previa de CSV:', error);
        
        if (error.code === 'NoSuchKey') {
            return {
                statusCode: 404,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Archivo no encontrado' })
            };
        }
        
        throw error;
    }
}

/**
 * Maneja la eliminación de un archivo CSV
 */
async function handleDeleteCSVFile(data) {
    const { key, userId } = data;
    
    if (!key || !userId) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requieren clave del archivo y ID de usuario' })
        };
    }
    
    // Verificar que el archivo pertenece al usuario
    if (!key.startsWith(`${userId}/`)) {
        return {
            statusCode: 403,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'No tienes permiso para eliminar este archivo' })
        };
    }
    
    try {
        const params = {
            Bucket: CSV_BUCKET,
            Key: key
        };
        
        await s3.deleteObject(params).promise();
        
        // También eliminar los datos asociados en DynamoDB
        await deleteKPIDataByFile(userId, key);
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                message: 'Archivo eliminado correctamente'
            })
        };
    } catch (error) {
        console.error('Error al eliminar archivo CSV:', error);
        throw error;
    }
}

/**
 * Elimina los datos de KPI asociados a un archivo
 */
async function deleteKPIDataByFile(userId, fileName) {
    // Buscar todos los registros asociados al archivo
    const params = {
        TableName: KPI_DATA_TABLE,
        FilterExpression: 'userId = :userId AND fileName = :fileName',
        ExpressionAttributeValues: {
            ':userId': userId,
            ':fileName': fileName
        }
    };
    
    const result = await dynamoDB.scan(params).promise();
    
    // Si no hay registros, no hacer nada
    if (!result.Items || result.Items.length === 0) {
        return;
    }
    
    // Eliminar cada registro
    for (const item of result.Items) {
        await dynamoDB.delete({
            TableName: KPI_DATA_TABLE,
            Key: {
                id: item.id
            }
        }).promise();
    }
    
    console.log(`Eliminados ${result.Items.length} registros de KPI asociados al archivo ${fileName}`);
}

/**
 * Maneja la adición de un comentario
 */
async function handleAddComment(data) {
    const { userId, userName, date, comment } = data;
    
    if (!userId || !userName || !date || !comment) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requieren ID de usuario, nombre de usuario, fecha y comentario' })
        };
    }
    
    try {
        const commentId = `comment-${Date.now()}`;
        
        const commentItem = {
            id: commentId,
            userId,
            userName,
            date,
            comment,
            createdAt: new Date().toISOString()
        };
        
        await dynamoDB.put({
            TableName: KPI_DATA_TABLE,
            Item: commentItem
        }).promise();
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                message: 'Comentario agregado correctamente',
                comment: commentItem
            })
        };
    } catch (error) {
        console.error('Error al agregar comentario:', error);
        throw error;
    }
}

/**
 * Maneja la obtención de comentarios
 */
async function handleGetComments(data) {
    const { startDate, endDate, limit = 20 } = data;
    
    try {
        let params = {
            TableName: KPI_DATA_TABLE,
            FilterExpression: 'begins_with(id, :prefix)',
            ExpressionAttributeValues: {
                ':prefix': 'comment-'
            },
            Limit: limit
        };
        
        // Filtrar por fecha si se proporciona
        if (startDate && endDate) {
            params.FilterExpression += ' AND date BETWEEN :startDate AND :endDate';
            params.ExpressionAttributeValues[':startDate'] = startDate;
            params.ExpressionAttributeValues[':endDate'] = endDate;
        }
        
        const result = await dynamoDB.scan(params).promise();
        
        // Ordenar por fecha de creación (más reciente primero)
        const comments = result.Items || [];
        comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                comments
            })
        };
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        throw error;
    }
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