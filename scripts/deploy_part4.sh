#!/bin/bash
# Cuarta parte del script de despliegue

# Crear página de dashboard
cat > "$TEMP_DIR/dashboard.html" << EOF
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - KPI Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .header {
            background-color: #1976d2;
            color: white;
            padding: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            margin: 0;
            font-size: 1.5rem;
        }
        .header-actions {
            display: flex;
            align-items: center;
        }
        .user-info {
            margin-right: 1rem;
        }
        .button {
            background-color: white;
            color: #1976d2;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
        }
        .button:hover {
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 1rem;
        }
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .card {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 1.5rem;
        }
        .card h2 {
            margin-top: 0;
            color: #1976d2;
            font-size: 1.2rem;
        }
        .card p {
            color: #666;
            line-height: 1.6;
        }
        .placeholder {
            background-color: #e3f2fd;
            height: 200px;
            border-radius: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #1976d2;
            font-weight: bold;
        }
        .upload-section {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 1.5rem;
            margin-bottom: 2rem;
        }
        .upload-section h2 {
            margin-top: 0;
            color: #1976d2;
        }
        .drop-area {
            border: 2px dashed #1976d2;
            border-radius: 4px;
            padding: 2rem;
            text-align: center;
            color: #666;
            cursor: pointer;
            margin: 1rem 0;
        }
        .drop-area:hover {
            background-color: #f5f5f5;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/amazon-cognito-identity-js@5.2.10/dist/amazon-cognito-identity.min.js"></script>
</head>
<body>
    <div class="header">
        <h1>KPI Dashboard</h1>
        <div class="header-actions">
            <div class="user-info">Bienvenido, <span id="user-name">Usuario</span></div>
            <a href="#" id="logout-button" class="button">Cerrar Sesión</a>
        </div>
    </div>
    
    <div class="container">
        <div class="upload-section">
            <h2>Cargar Archivo CSV</h2>
            <div class="drop-area" id="drop-area">
                Arrastra y suelta archivos CSV aquí o haz clic para seleccionar
            </div>
            <p>Formatos aceptados: CSV con columnas para fecha, categorías y valores (OK, NO, N/A)</p>
        </div>
        
        <div class="dashboard-grid">
            <div class="card">
                <h2>Tasa de Cumplimiento</h2>
                <div class="placeholder">Gráfico de Tasa de Cumplimiento</div>
            </div>
            <div class="card">
                <h2>Incidencias por Categoría</h2>
                <div class="placeholder">Gráfico de Barras</div>
            </div>
            <div class="card">
                <h2>Tendencia Temporal</h2>
                <div class="placeholder">Gráfico de Líneas</div>
            </div>
            <div class="card">
                <h2>Distribución de Estados</h2>
                <div class="placeholder">Gráfico Circular</div>
            </div>
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
        
        // Verificar si el usuario está autenticado
        const cognitoUser = userPool.getCurrentUser();
        
        if (!cognitoUser) {
            // Si no hay usuario autenticado, redirigir al inicio de sesión
            window.location.href = 'login.html';
        } else {
            // Obtener los datos del usuario
            cognitoUser.getSession(function(err, session) {
                if (err) {
                    console.error('Error al obtener la sesión:', err);
                    window.location.href = 'login.html';
                    return;
                }
                
                // Obtener los atributos del usuario
                cognitoUser.getUserAttributes(function(err, attributes) {
                    if (err) {
                        console.error('Error al obtener atributos del usuario:', err);
                        return;
                    }
                    
                    // Buscar el atributo de nombre
                    const nameAttribute = attributes.find(attr => attr.Name === 'name');
                    if (nameAttribute) {
                        document.getElementById('user-name').textContent = nameAttribute.Value;
                    }
                });
            });
        }
        
        // Manejar el cierre de sesión
        document.getElementById('logout-button').addEventListener('click', function(e) {
            e.preventDefault();
            
            if (cognitoUser) {
                cognitoUser.signOut();
                window.location.href = 'login.html';
            }
        });
        
        // Manejar la carga de archivos
        const dropArea = document.getElementById('drop-area');
        
        dropArea.addEventListener('click', function() {
            alert('Funcionalidad de carga de archivos no implementada en esta versión de demostración.');
        });
        
        dropArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            dropArea.style.backgroundColor = '#e3f2fd';
        });
        
        dropArea.addEventListener('dragleave', function() {
            dropArea.style.backgroundColor = '';
        });
        
        dropArea.addEventListener('drop', function(e) {
            e.preventDefault();
            dropArea.style.backgroundColor = '';
            alert('Funcionalidad de carga de archivos no implementada en esta versión de demostración.');
        });
    </script>
</body>
</html>
EOF

# Crear archivo de error personalizado
cat > "$TEMP_DIR/error.html" << EOF
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - KPI Dashboard</title>
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
            color: #f44336;
        }
        p {
            color: #666;
            line-height: 1.6;
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
    </style>
</head>
<body>
    <div class="container">
        <h1>Error</h1>
        <p>Lo sentimos, ha ocurrido un error al acceder a la página solicitada.</p>
        <a href="/" class="button">Volver al inicio</a>
    </div>
</body>
</html>
EOF

# Subir archivos al bucket S3
print_message "Subiendo archivos al bucket S3: $FRONTEND_BUCKET" "$YELLOW"
aws s3 sync "$TEMP_DIR/" "s3://$FRONTEND_BUCKET/" --delete --region "$REGION"

# Limpiar directorio temporal
rm -rf "$TEMP_DIR"

# Configurar notificaciones de S3 para el bucket CSV
CSV_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='CSVBucketName'].OutputValue" --output text --region "$REGION")
CSV_PROCESSOR_ARN=$(aws lambda get-function --function-name "${ENVIRONMENT}-kpi-dashboard-csv-processor" --query 'Configuration.FunctionArn' --output text --region "$REGION")

print_message "Configurando notificaciones para el bucket CSV: $CSV_BUCKET" "$YELLOW"
aws s3api put-bucket-notification-configuration \
  --bucket "$CSV_BUCKET" \
  --notification-configuration "{\"LambdaFunctionConfigurations\":[{\"LambdaFunctionArn\":\"$CSV_PROCESSOR_ARN\",\"Events\":[\"s3:ObjectCreated:*\"],\"Filter\":{\"Key\":{\"FilterRules\":[{\"Name\":\"suffix\",\"Value\":\".csv\"}]}}}]}" \
  --region "$REGION"

print_message "Frontend desplegado exitosamente en: https://$FRONTEND_BUCKET.s3.$REGION.amazonaws.com/index.html" "$GREEN"

# Obtener la URL de CloudFront si está disponible
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='FrontendURL'].OutputValue" --output text --region "$REGION")
if [ ! -z "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "None" ]; then
  print_message "URL de CloudFront: $CLOUDFRONT_URL" "$GREEN"
fi