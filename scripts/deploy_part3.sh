#!/bin/bash
# Tercera parte del script de despliegue

# Crear página de callback para redirección después de autenticación
cat > "$TEMP_DIR/callback.html" << EOF
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
EOF

# Crear página de cambio de contraseña
cat > "$TEMP_DIR/change-password.html" << EOF
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
        
        // Obtener el nombre de usuario temporal
        const username = localStorage.getItem('tempUsername');
        
        if (!username) {
            // Si no hay nombre de usuario temporal, redirigir al inicio de sesión
            window.location.href = 'login.html';
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
            
            // Configurar datos del usuario
            const userData = {
                Username: username,
                Pool: userPool
            };
            const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
            
            // Intentar cambiar la contraseña
            cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
                onSuccess: function(result) {
                    // Cambio de contraseña exitoso
                    console.log('Cambio de contraseña exitoso:', result);
                    
                    // Mostrar mensaje de éxito
                    successMessage.textContent = 'Contraseña cambiada correctamente. Redirigiendo...';
                    successMessage.style.display = 'block';
                    
                    // Limpiar el nombre de usuario temporal
                    localStorage.removeItem('tempUsername');
                    
                    // Redirigir al inicio de sesión después de un breve retraso
                    setTimeout(function() {
                        window.location.href = 'login.html';
                    }, 2000);
                },
                onFailure: function(err) {
                    // Cambio de contraseña fallido
                    console.error('Error al cambiar la contraseña:', err);
                    
                    // Mostrar mensaje de error
                    errorMessage.textContent = err.message || 'Error al cambiar la contraseña';
                    errorMessage.style.display = 'block';
                }
            });
        });
    </script>
</body>
</html>
EOF