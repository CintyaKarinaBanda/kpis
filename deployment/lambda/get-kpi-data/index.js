const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Nombre de la tabla DynamoDB para almacenar los datos de KPI
const KPI_TABLE = process.env.KPI_TABLE || 'kpi-dashboard-data';

/**
 * Función Lambda para obtener datos de KPI desde DynamoDB
 */
exports.handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event, null, 2));
    
    try {
        // Parsear el cuerpo de la solicitud
        const body = JSON.parse(event.body);
        const { userId, startDate, endDate, category } = body;
        
        if (!userId) {
            return {
                statusCode: 400,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Se requiere ID de usuario' })
            };
        }
        
        // Obtener datos de KPI
        const kpiData = await getKPIData(userId, startDate, endDate, category);
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                data: kpiData
            })
        };
    } catch (error) {
        console.error('Error al obtener datos de KPI:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({
                error: 'Error al obtener datos de KPI',
                details: error.message
            })
        };
    }
};

/**
 * Obtiene datos de KPI desde DynamoDB
 */
async function getKPIData(userId, startDate, endDate, category) {
    let params = {
        TableName: KPI_TABLE,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        }
    };
    
    // Filtrar por fecha si se proporciona
    if (startDate && endDate) {
        params.FilterExpression += ' AND #date BETWEEN :startDate AND :endDate';
        params.ExpressionAttributeValues[':startDate'] = startDate;
        params.ExpressionAttributeValues[':endDate'] = endDate;
        params.ExpressionAttributeNames = {
            '#date': 'date'
        };
    }
    
    // Filtrar por categoría si se proporciona
    if (category) {
        const categoryKey = `category_${category.replace(/\s+/g, '_')}`;
        params.FilterExpression += ` AND ${categoryKey} = :categoryValue`;
        params.ExpressionAttributeValues[':categoryValue'] = 'OK'; // Ejemplo: filtrar por OK
    }
    
    const result = await dynamoDB.scan(params).promise();
    return result.Items || [];
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