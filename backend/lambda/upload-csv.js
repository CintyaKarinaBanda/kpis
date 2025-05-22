const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const crypto = require('crypto');

// Nombre del bucket S3 para almacenar los archivos CSV
const CSV_BUCKET = process.env.CSV_BUCKET || 'dev-kpi-dashboard-csv';

/**
 * Función Lambda para generar URLs prefirmadas para subir archivos CSV a S3
 */
exports.handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event, null, 2));
    
    try {
        // Parsear el cuerpo de la solicitud
        const body = JSON.parse(event.body);
        const { fileName, fileType, userId } = body;
        
        if (!fileName || !userId) {
            return {
                statusCode: 400,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Se requieren nombre de archivo y ID de usuario' })
            };
        }
        
        // Generar un nombre de archivo único
        const timestamp = Date.now();
        const hash = crypto.createHash('md5').update(`${fileName}${timestamp}`).digest('hex');
        const key = `${userId}/${hash}-${fileName}`;
        
        // Generar URL prefirmada para subir el archivo
        const params = {
            Bucket: CSV_BUCKET,
            Key: key,
            ContentType: fileType || 'text/csv',
            Expires: 300 // URL válida por 5 minutos
        };
        
        const uploadUrl = s3.getSignedUrl('putObject', params);
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                uploadUrl,
                key,
                bucket: CSV_BUCKET
            })
        };
    } catch (error) {
        console.error('Error al generar URL de carga:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({
                error: 'Error al generar URL de carga',
                details: error.message
            })
        };
    }
};

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