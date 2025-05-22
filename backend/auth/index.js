const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Configuración
const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const USERS_TABLE = process.env.USERS_TABLE;
const CONFIG_TABLE = process.env.CONFIG_TABLE;

/**
 * Maneja las operaciones de autenticación y gestión de usuarios
 */
exports.handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event, null, 2));
    
    try {
        const body = JSON.parse(event.body);
        const { action } = body;
        
        switch (action) {
            case 'login':
                return await handleLogin(body);
            case 'register':
                return await handleRegister(body);
            case 'getUserConfig':
                return await handleGetUserConfig(body);
            case 'updateUserConfig':
                return await handleUpdateUserConfig(body);
            case 'resetPassword':
                return await handleResetPassword(body);
            case 'changePassword':
                return await handleChangePassword(body);
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
            body: JSON.stringify({ error: error.message || 'Error en el servicio de autenticación' })
        };
    }
};

/**
 * Maneja el inicio de sesión de usuarios
 */
async function handleLogin(data) {
    const { username, password } = data;
    
    if (!username || !password) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requieren nombre de usuario y contraseña' })
        };
    }
    
    try {
        // Iniciar sesión con Cognito
        const authParams = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: USER_POOL_CLIENT_ID,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password
            }
        };
        
        const authResult = await cognito.initiateAuth(authParams).promise();
        
        // Obtener información del usuario
        const userParams = {
            UserPoolId: USER_POOL_ID,
            Username: username
        };
        
        const userResult = await cognito.adminGetUser(userParams).promise();
        
        // Extraer atributos del usuario
        const userAttributes = {};
        userResult.UserAttributes.forEach(attr => {
            userAttributes[attr.Name] = attr.Value;
        });
        
        // Obtener configuración del usuario
        const userConfig = await getUserConfig(userAttributes.sub);
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                message: 'Inicio de sesión exitoso',
                tokens: {
                    idToken: authResult.AuthenticationResult.IdToken,
                    accessToken: authResult.AuthenticationResult.AccessToken,
                    refreshToken: authResult.AuthenticationResult.RefreshToken,
                    expiresIn: authResult.AuthenticationResult.ExpiresIn
                },
                user: {
                    id: userAttributes.sub,
                    email: userAttributes.email,
                    name: userAttributes.name
                },
                config: userConfig
            })
        };
    } catch (error) {
        console.error('Error de inicio de sesión:', error);
        
        if (error.code === 'NotAuthorizedException') {
            return {
                statusCode: 401,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Credenciales inválidas' })
            };
        }
        
        throw error;
    }
}

/**
 * Maneja el registro de nuevos usuarios
 */
async function handleRegister(data) {
    const { email, password, name } = data;
    
    if (!email || !password || !name) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requieren email, contraseña y nombre' })
        };
    }
    
    try {
        // Crear usuario en Cognito
        const params = {
            UserPoolId: USER_POOL_ID,
            Username: email,
            TemporaryPassword: password,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: email
                },
                {
                    Name: 'email_verified',
                    Value: 'true'
                },
                {
                    Name: 'name',
                    Value: name
                }
            ]
        };
        
        const result = await cognito.adminCreateUser(params).promise();
        const userId = result.User.Username;
        
        // Establecer contraseña permanente
        await cognito.adminSetUserPassword({
            UserPoolId: USER_POOL_ID,
            Username: userId,
            Password: password,
            Permanent: true
        }).promise();
        
        // Crear configuración por defecto para el usuario
        const defaultConfig = {
            configId: `config-${userId}`,
            userId: userId,
            theme: {
                primaryColor: '#1976d2',
                secondaryColor: '#dc004e',
                logoUrl: ''
            },
            dashboard: {
                layout: 'default',
                visibleWidgets: ['kpiCards', 'trendChart', 'heatmap', 'barChart', 'pieChart', 'comments']
            },
            notifications: {
                email: true,
                dashboard: true
            },
            createdAt: new Date().toISOString()
        };
        
        await dynamoDB.put({
            TableName: CONFIG_TABLE,
            Item: defaultConfig
        }).promise();
        
        // Guardar información adicional del usuario en DynamoDB
        const userItem = {
            userId: userId,
            email: email,
            name: name,
            role: 'user',
            createdAt: new Date().toISOString()
        };
        
        await dynamoDB.put({
            TableName: USERS_TABLE,
            Item: userItem
        }).promise();
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                message: 'Usuario registrado correctamente',
                user: {
                    id: userId,
                    email: email,
                    name: name
                }
            })
        };
    } catch (error) {
        console.error('Error de registro:', error);
        
        if (error.code === 'UsernameExistsException') {
            return {
                statusCode: 409,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'El email ya está registrado' })
            };
        }
        
        throw error;
    }
}

/**
 * Obtiene la configuración del usuario
 */
async function getUserConfig(userId) {
    try {
        const params = {
            TableName: CONFIG_TABLE,
            IndexName: 'UserConfigIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
        };
        
        const result = await dynamoDB.query(params).promise();
        
        if (result.Items && result.Items.length > 0) {
            return result.Items[0];
        }
        
        // Si no existe configuración, crear una por defecto
        const defaultConfig = {
            configId: `config-${userId}`,
            userId: userId,
            theme: {
                primaryColor: '#1976d2',
                secondaryColor: '#dc004e',
                logoUrl: ''
            },
            dashboard: {
                layout: 'default',
                visibleWidgets: ['kpiCards', 'trendChart', 'heatmap', 'barChart', 'pieChart', 'comments']
            },
            notifications: {
                email: true,
                dashboard: true
            },
            createdAt: new Date().toISOString()
        };
        
        await dynamoDB.put({
            TableName: CONFIG_TABLE,
            Item: defaultConfig
        }).promise();
        
        return defaultConfig;
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        return null;
    }
}

/**
 * Maneja la obtención de la configuración del usuario
 */
async function handleGetUserConfig(data) {
    const { userId } = data;
    
    if (!userId) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requiere ID de usuario' })
        };
    }
    
    const config = await getUserConfig(userId);
    
    return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
            config: config || {}
        })
    };
}

/**
 * Maneja la actualización de la configuración del usuario
 */
async function handleUpdateUserConfig(data) {
    const { userId, config } = data;
    
    if (!userId || !config) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requieren ID de usuario y configuración' })
        };
    }
    
    try {
        // Obtener la configuración actual
        const currentConfig = await getUserConfig(userId);
        
        if (!currentConfig) {
            return {
                statusCode: 404,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Configuración no encontrada' })
            };
        }
        
        // Actualizar la configuración
        const updatedConfig = {
            ...currentConfig,
            ...config,
            updatedAt: new Date().toISOString()
        };
        
        await dynamoDB.put({
            TableName: CONFIG_TABLE,
            Item: updatedConfig
        }).promise();
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                message: 'Configuración actualizada correctamente',
                config: updatedConfig
            })
        };
    } catch (error) {
        console.error('Error al actualizar configuración:', error);
        throw error;
    }
}

/**
 * Maneja la solicitud de restablecimiento de contraseña
 */
async function handleResetPassword(data) {
    const { username } = data;
    
    if (!username) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requiere nombre de usuario' })
        };
    }
    
    try {
        await cognito.forgotPassword({
            ClientId: USER_POOL_CLIENT_ID,
            Username: username
        }).promise();
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                message: 'Se ha enviado un código de restablecimiento a tu email'
            })
        };
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        
        if (error.code === 'UserNotFoundException') {
            return {
                statusCode: 404,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Usuario no encontrado' })
            };
        }
        
        throw error;
    }
}

/**
 * Maneja el cambio de contraseña
 */
async function handleChangePassword(data) {
    const { username, oldPassword, newPassword } = data;
    
    if (!username || !oldPassword || !newPassword) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Se requieren nombre de usuario, contraseña actual y nueva contraseña' })
        };
    }
    
    try {
        // Iniciar sesión para obtener el token
        const authParams = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: USER_POOL_CLIENT_ID,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: oldPassword
            }
        };
        
        const authResult = await cognito.initiateAuth(authParams).promise();
        const accessToken = authResult.AuthenticationResult.AccessToken;
        
        // Cambiar la contraseña
        await cognito.changePassword({
            AccessToken: accessToken,
            PreviousPassword: oldPassword,
            ProposedPassword: newPassword
        }).promise();
        
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                message: 'Contraseña cambiada correctamente'
            })
        };
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        
        if (error.code === 'NotAuthorizedException') {
            return {
                statusCode: 401,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Contraseña actual incorrecta' })
            };
        }
        
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