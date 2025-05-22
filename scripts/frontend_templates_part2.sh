#!/bin/bash
# Segunda parte de las plantillas HTML para el frontend

# Función para crear los archivos adicionales del frontend
create_frontend_files_part2() {
  local TEMP_DIR=$1
  local USER_POOL_ID=$2
  local USER_POOL_CLIENT_ID=$3

  # Crear página de callback
  cat > "$TEMP_DIR/callback.html" << EOFCALLBACK
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Autenticación exitosa</title>
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
            text-align: center;
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
            color: #4caf50;
        }
        .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #1976d2;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    <script>
        // Redirigir a la página de dashboard después de la autenticación
        window.onload = function() {
            setTimeout(function() {
                window.location.href = 'dashboard.html';
            }, 1500);
        };
    </script>
</head>
<body>
    <div class="container">
        <h1>Autenticación exitosa</h1>
        <div class="spinner"></div>
        <p>Redirigiendo al dashboard...</p>
    </div>
</body>
</html>
EOFCALLBACK

  # Crear página de cambio de contraseña
  cat > "$TEMP_DIR/change-password.html" << EOFCHANGEPASS
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cambiar Contraseña - KPI Dashboard</title>
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
        .info {
            color: #4caf50;
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
        .password-requirements {
            background-color: #e3f2fd;
            border-radius: 4px;
            padding: 1rem;
            margin-top: 1rem;
            font-size: 0.9rem;
        }
        .password-requirements ul {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
        }
    </style>
    <script src="https://sdk.amazonaws.com/js/aws-sdk-2.1001.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/amazon-cognito-identity-js@5.2.10/dist/amazon-cognito-identity.min.js"></script>
</head>
<body>
    <div class="container">
        <h1>Cambiar Contraseña</h1>
        <p>Es necesario cambiar tu contraseña temporal por una nueva.</p>
        
        <div id="error-message" class="error" style="display: none;"></div>
        <div id="success-message" class="info" style="display: none;"></div>
        
        <form id="change-password-form">
            <div class="form-group">
                <label for="new-password">Nueva Contraseña</label>
                <input type="password" id="new-password" name="new-password" required>
            </div>
            <div class="form-group">
                <label for="confirm-password">Confirmar Contraseña</label>
                <input type="password" id="confirm-password" name="confirm-password" required>
            </div>
            
            <div class="password-requirements">
                <strong>La contraseña debe tener:</strong>
                <ul>
                    <li>Al menos 8 caracteres</li>
                    <li>Al menos una letra mayúscula</li>
                    <li>Al menos una letra minúscula</li>
                    <li>Al menos un número</li>
                    <li>Al menos un símbolo (ej: !@#$%^&*)</li>
                </ul>
            </div>
            
            <button type="submit" class="button">Cambiar Contraseña</button>
        </form>
        <a href="login.html" class="back-link">Volver al inicio de sesión</a>
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
        
        // Obtener el nombre de usuario y la contraseña temporal
        const username = localStorage.getItem('tempUsername');
        const tempPassword = sessionStorage.getItem('tempPassword');
        const sessionData = JSON.parse(sessionStorage.getItem('cognitoUserSession') || '{}');
        const challengeName = sessionStorage.getItem('challengeName');
        
        // Verificar si tenemos los datos necesarios
        if (!username || !challengeName || challengeName !== 'NEW_PASSWORD_REQUIRED') {
            console.error('No hay datos de sesión para cambio de contraseña');
            document.getElementById('error-message').textContent = 
                'No se encontró una sesión de cambio de contraseña. Por favor, inicia sesión nuevamente.';
            document.getElementById('error-message').style.display = 'block';
        }
        
        // Manejar el envío del formulario
        document.getElementById('change-password-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const errorMessage = document.getElementById('error-message');
            const successMessage = document.getElementById('success-message');
            
            // Ocultar mensajes anteriores
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            
            // Verificar que las contraseñas coincidan
            if (newPassword !== confirmPassword) {
                errorMessage.textContent = 'Las contraseñas no coinciden';
                errorMessage.style.display = 'block';
                return;
            }
            
            // Verificar requisitos de contraseña
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
            if (!passwordRegex.test(newPassword)) {
                errorMessage.textContent = 'La contraseña no cumple con los requisitos';
                errorMessage.style.display = 'block';
                return;
            }
            
            // Método 1: Intentar con el flujo normal de cambio de contraseña
            try {
                // Configurar datos del usuario
                const userData = {
                    Username: username,
                    Pool: userPool
                };
                const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
                
                // Si tenemos la contraseña temporal, primero autenticamos al usuario
                if (tempPassword) {
                    const authenticationData = {
                        Username: username,
                        Password: tempPassword
                    };
                    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
                    
                    cognitoUser.authenticateUser(authenticationDetails, {
                        onSuccess: function(result) {
                            // No debería llegar aquí si la contraseña es temporal
                            successMessage.textContent = 'Autenticación exitosa, pero no se requiere cambio de contraseña';
                            successMessage.style.display = 'block';
                            
                            setTimeout(function() {
                                window.location.href = 'dashboard.html';
                            }, 2000);
                        },
                        onFailure: function(err) {
                            errorMessage.textContent = 'Error al autenticar: ' + (err.message || 'Error desconocido');
                            errorMessage.style.display = 'block';
                        },
                        newPasswordRequired: function(userAttributes, requiredAttributes) {
                            // Ahora completamos el desafío de nueva contraseña
                            // Para el cambio de contraseña, es más seguro no enviar ningún atributo
                            cognitoUser.completeNewPasswordChallenge(
                                newPassword,
                                {}, // Enviamos un objeto vacío en lugar de atributos
                                {
                                    onSuccess: function(result) {
                                        handleSuccessfulPasswordChange(result);
                                    },
                                    onFailure: function(err) {
                                        handlePasswordChangeError(err);
                                    }
                                }
                            );
                        }
                    });
                } else {
                    // Método 2: Intentar directamente con completeNewPasswordChallenge
                    // Este método puede fallar si no hay una sesión activa
                    
                    // Para el cambio de contraseña, es más seguro no enviar ningún atributo
                    // ya que solo queremos cambiar la contraseña, no actualizar atributos
                    cognitoUser.completeNewPasswordChallenge(
                        newPassword,
                        {}, // Enviamos un objeto vacío en lugar de atributos
                        {
                            onSuccess: function(result) {
                                handleSuccessfulPasswordChange(result);
                            },
                            onFailure: function(err) {
                                handlePasswordChangeError(err);
                            }
                        }
                    );
                }
            } catch (err) {
                console.error('Error al procesar el cambio de contraseña:', err);
                errorMessage.textContent = 'Error al procesar el cambio de contraseña: ' + (err.message || 'Error desconocido');
                errorMessage.style.display = 'block';
                
                // Método alternativo: usar admin-set-user-password
                errorMessage.textContent += '. Por favor, contacta al administrador para restablecer tu contraseña.';
            }
        });
        
        // Función para manejar el cambio de contraseña exitoso
        function handleSuccessfulPasswordChange(result) {
            console.log('Cambio de contraseña exitoso:', result);
            
            // Mostrar mensaje de éxito
            const successMessage = document.getElementById('success-message');
            successMessage.textContent = 'Contraseña cambiada con éxito. Redirigiendo...';
            successMessage.style.display = 'block';
            
            // Limpiar datos temporales
            localStorage.removeItem('tempUsername');
            sessionStorage.removeItem('tempPassword');
            sessionStorage.removeItem('cognitoUserSession');
            sessionStorage.removeItem('challengeName');
            
            // Guardar tokens en localStorage si están disponibles
            if (result && result.getIdToken) {
                localStorage.setItem('idToken', result.getIdToken().getJwtToken());
                localStorage.setItem('accessToken', result.getAccessToken().getJwtToken());
                localStorage.setItem('refreshToken', result.getRefreshToken().getToken());
            }
            
            // Redirigir al dashboard después de un breve retraso
            setTimeout(function() {
                window.location.href = 'dashboard.html';
            }, 2000);
        }
        
        // Función para manejar errores en el cambio de contraseña
        function handlePasswordChangeError(err) {
            console.error('Error al cambiar la contraseña:', err);
            
            // Mostrar mensaje de error
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = err.message || 'Error al cambiar la contraseña';
            errorMessage.style.display = 'block';
            
            // Sugerir alternativas
            errorMessage.textContent += '. Intenta iniciar sesión nuevamente o contacta al administrador.';
        }
    </script>
</body>
</html>
EOFCHANGEPASS
}