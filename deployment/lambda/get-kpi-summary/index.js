const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Nombre de la tabla DynamoDB para almacenar los datos de KPI
const KPI_TABLE = process.env.KPI_TABLE || 'kpi-dashboard-data';

/**
 * Función Lambda para obtener el resumen de KPIs desde DynamoDB
 */
exports.handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event, null, 2));
    
    try {
        // Parsear el cuerpo de la solicitud
        const body = JSON.parse(event.body);
        const { userId, startDate, endDate } = body;
        
        if (!userId) {
            return {
                statusCode: 400,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Se requiere ID de usuario' })
            };
        }
        
        // Obtener datos de KPI
        const kpiData = await getKPIData(userId, startDate, endDate);
        
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
        
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({
                error: 'Error al obtener resumen de KPI',
                details: error.message
            })
        };
    }
};

/**
 * Obtiene datos de KPI desde DynamoDB
 */
async function getKPIData(userId, startDate, endDate) {
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
    
    const result = await dynamoDB.scan(params).promise();
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
 * Devuelve los headers CORS para las respuestas
 */
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };
}