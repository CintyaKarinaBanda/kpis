#!/bin/bash
# Script con las plantillas HTML para el frontend

# Función para crear los archivos del frontend
create_frontend_files() {
  local TEMP_DIR=$1
  local API_ENDPOINT=$2
  local FRONTEND_BUCKET=$3
  local USER_POOL_ID=$4
  local USER_POOL_CLIENT_ID=$5
  local ADMIN_EMAIL=$6

  # Crear archivo index.html
  cat > "$TEMP_DIR/index.html" << EOFINDEX
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KPI Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 2rem;
            max-width: 800px;
            width: 90%;
            text-align: center;
        }
        h1 {
            color: #1976d2;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
        .logo {
            margin-bottom: 2rem;
            max-width: 200px;
        }
        .button {
            background-color: #1976d2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 1rem;
            text-decoration: none;
            display: inline-block;
        }
        .button:hover {
            background-color: #1565c0;
        }
        .info-box {
            background-color: #e3f2fd;
            border-radius: 4px;
            padding: 1rem;
            margin-top: 2rem;
            text-align: left;
        }
        .info-box h3 {
            margin-top: 0;
            color: #1976d2;
        }
        .info-box code {
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>KPI Dashboard</h1>
        <p>Bienvenido al Dashboard de KPIs Operativos</p>
        
        <a href="login.html" class="button">Iniciar Sesión</a>
        
        <div class="info-box">
            <h3>Información de Despliegue</h3>
            <p><strong>API Endpoint:</strong> <code>${API_ENDPOINT}</code></p>
            <p><strong>Bucket S3:</strong> <code>${FRONTEND_BUCKET}</code></p>
            <p><strong>User Pool ID:</strong> <code>${USER_POOL_ID}</code></p>
            <p><strong>User Pool Client ID:</strong> <code>${USER_POOL_CLIENT_ID}</code></p>
        </div>
    </div>
</body>
</html>
EOFINDEX

  # Crear página de login
  cat > "$TEMP_DIR/login.html" << EOFLOGIN
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Iniciar Sesión - KPI Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 2rem;
            max-width: 400px;
            width: 90%;
        }
        h1 {
            color: #1976d2;
            text-align: center;
            margin-bottom: 2rem;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
        }
        .button {
            background-color: #1976d2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            margin-top: 1rem;
        }
        .button:hover {
            background-color: #1565c0;
        }
        .error {
            color: #f44336;
            margin-top: 1rem;
            text-align: center;
        }
        .back-link {
            display: block;
            text-align: center;
            margin-top: 1rem;
            color: #1976d2;
            text-decoration: none;
        }
        .back-link:hover {
            text-decoration: underline;
        }
        .info-box {
            background-color: #e3f2fd;
            border-radius: 4px;
            padding: 1rem;
            margin-top: 2rem;
            font-size: 0.9rem;
        }
    </style>
    <script src="https://sdk.amazonaws.com/js/aws-sdk-2.1001.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/amazon-cognito-identity-js@5.2.10/dist/amazon-cognito-identity.min.js"></script>
</head>
<body>
    <div class="container">
        <h1>Iniciar Sesión</h1>
        <div id="error-message" class="error" style="display: none;"></div>
        <form id="login-form">
            <div class="form-group">
                <label for="email">Correo Electrónico</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="password">Contraseña</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="button">Iniciar Sesión</button>
        </form>
        <a href="index.html" class="back-link">Volver al inicio</a>
        
        <div class="info-box">
            <p><strong>Credenciales de administrador:</strong></p>
            <p>Email: ${ADMIN_EMAIL}</p>
            <p>Contraseña: La contraseña temporal generada durante el despliegue</p>
            <p><em>Nota: En el primer inicio de sesión, se te pedirá cambiar la contraseña temporal.</em></p>
        </div>
    </div>

    <script>
        // Configuración de Cognito
        const userPoolId = '${USER_POOL_ID}';
        const clientId = '${USER_POOL_CLIENT_ID}';
        
        // Configurar el pool de usuarios de Cognito
        const poolData = {
            UserPoolId: userPoolId,
            ClientId: clientId
        };
        const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        
        // Limpiar cualquier dato de sesión anterior al cargar la página
        localStorage.removeItem('tempUsername');
        sessionStorage.removeItem('challengeName');
        sessionStorage.removeItem('cognitoUserSession');
        
        // Variable global para almacenar la sesión de Cognito
        let cognitoUserGlobal;
        
        // Manejar el envío del formulario
        document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');
            
            // Ocultar mensaje de error anterior
            errorMessage.style.display = 'none';
            
            // Configurar datos de autenticación
            const authenticationData = {
                Username: email,
                Password: password
            };
            const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
            
            // Configurar datos del usuario
            const userData = {
                Username: email,
                Pool: userPool
            };
            cognitoUserGlobal = new AmazonCognitoIdentity.CognitoUser(userData);
            
            // Intentar autenticar al usuario
            cognitoUserGlobal.authenticateUser(authenticationDetails, {
                onSuccess: function(result) {
                    // Autenticación exitosa
                    console.log('Autenticación exitosa:', result);
                    
                    // Guardar tokens en localStorage
                    localStorage.setItem('idToken', result.getIdToken().getJwtToken());
                    localStorage.setItem('accessToken', result.getAccessToken().getJwtToken());
                    localStorage.setItem('refreshToken', result.getRefreshToken().getToken());
                    
                    // Redirigir al dashboard
                    window.location.href = 'dashboard.html';
                },
                onFailure: function(err) {
                    // Autenticación fallida
                    console.error('Error de autenticación:', err);
                    
                    // Mostrar mensaje de error
                    errorMessage.textContent = err.message || 'Error al iniciar sesión. Verifica tus credenciales.';
                    errorMessage.style.display = 'block';
                },
                newPasswordRequired: function(userAttributes, requiredAttributes) {
                    // Se requiere cambio de contraseña (primer inicio de sesión)
                    console.log('Se requiere cambio de contraseña');
                    
                    // Guardar datos del usuario para el cambio de contraseña
                    localStorage.setItem('tempUsername', email);
                    
                    // Guardar la sesión actual para usarla en la página de cambio de contraseña
                    sessionStorage.setItem('cognitoUserSession', JSON.stringify({
                        username: email,
                        userAttributes: userAttributes || {},
                        requiredAttributes: requiredAttributes || {}
                    }));
                    
                    // Guardar el objeto cognitoUser en sessionStorage
                    sessionStorage.setItem('challengeName', 'NEW_PASSWORD_REQUIRED');
                    
                    // Guardar la contraseña actual para poder completar el flujo
                    sessionStorage.setItem('tempPassword', password);
                    
                    // Redirigir a la página de cambio de contraseña
                    window.location.href = 'change-password.html';
                }
            });
        });
    </script>
</body>
</html>
EOFLOGIN
}