# Guía de Despliegue

Esta guía proporciona instrucciones detalladas para desplegar el Dashboard de KPIs Operativos en AWS.

## Requisitos previos

Antes de comenzar, asegúrate de tener:

1. Una cuenta de AWS con permisos para crear los siguientes recursos:
   - S3
   - CloudFront
   - API Gateway
   - Lambda
   - DynamoDB
   - Cognito
   - IAM
   - CloudWatch
   - SNS
   - WAF

2. AWS CLI instalado y configurado:
   ```bash
   aws configure
   ```

3. Node.js 14.x o superior instalado

## Paso 1: Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/kpi-dashboard.git
cd kpi-dashboard
```

## Paso 2: Desplegar la infraestructura

### Opción 1: Despliegue básico

Para un despliegue rápido con configuración mínima:

```bash
cd scripts
chmod +x deploy.sh
./deploy.sh --admin-email tu-email@ejemplo.com
```

Esto desplegará la infraestructura con valores predeterminados:
- Región: us-east-1
- Entorno: dev
- Nombre del stack: kpi-dashboard

### Opción 2: Despliegue personalizado

Para personalizar el despliegue:

```bash
./deploy.sh \
  --stack-name mi-kpi-dashboard \
  --region eu-west-1 \
  --env prod \
  --domain kpi.midominio.com \
  --cert arn:aws:acm:us-east-1:123456789012:certificate/abcdef12-3456-7890-abcd-ef1234567890 \
  --admin-email admin@midominio.com
```

### Parámetros disponibles

| Parámetro | Descripción | Valor predeterminado |
|-----------|-------------|---------------------|
| --stack-name | Nombre del stack de CloudFormation | kpi-dashboard |
| --bucket | Nombre del bucket S3 para desplegar el frontend | Generado automáticamente |
| --region | Región de AWS | us-east-1 |
| --env | Entorno de despliegue (dev, test, prod) | dev |
| --domain | Nombre de dominio para el frontend | - |
| --cert | ARN del certificado SSL para CloudFront | - |
| --admin-email | Email del administrador para notificaciones | - |

## Paso 3: Configurar el frontend

Una vez desplegada la infraestructura, el script mostrará la URL de la API y el nombre del bucket S3 para el frontend.

1. Crea un archivo `.env` en el directorio `frontend`:

```bash
cd ../frontend
echo "REACT_APP_API_URL=https://tu-api-id.execute-api.us-east-1.amazonaws.com/dev" > .env
```

2. Instala las dependencias:

```bash
npm install
```

3. Construye la aplicación:

```bash
npm run build
```

4. Despliega el frontend en S3:

```bash
aws s3 sync build/ s3://nombre-del-bucket-frontend --delete
```

## Paso 4: Configurar usuarios iniciales

Para crear un usuario administrador inicial:

1. Accede a la consola de AWS y navega a Amazon Cognito
2. Selecciona el User Pool creado (nombre: `[env]-kpi-dashboard-users`)
3. Ve a "Users and groups" y haz clic en "Create user"
4. Completa el formulario con la información del usuario administrador
5. Marca la opción "Send an invitation to this new user?" para enviar un correo con instrucciones

## Paso 5: Verificar el despliegue

1. Accede a la URL del frontend proporcionada por CloudFront:
   - Si configuraste un dominio personalizado: `https://tu-dominio.com`
   - Si no: `https://d123abc.cloudfront.net`

2. Inicia sesión con el usuario administrador creado

3. Verifica que puedes:
   - Acceder al dashboard
   - Cargar archivos CSV
   - Ver visualizaciones de KPIs
   - Personalizar la configuración

## Paso 6: Configurar un dominio personalizado (opcional)

Si deseas usar un dominio personalizado y no lo configuraste durante el despliegue:

1. Obtén un certificado SSL en AWS Certificate Manager (ACM) para tu dominio
2. Actualiza la distribución de CloudFront para usar el certificado y el dominio
3. Configura un registro CNAME en tu proveedor de DNS apuntando a la distribución de CloudFront

## Monitoreo y mantenimiento

### Monitoreo

El despliegue incluye alarmas de CloudWatch para:
- Errores en API Gateway
- Errores en el procesamiento de archivos CSV
- Latencia alta en las APIs

Puedes ver estas alarmas en la consola de CloudWatch.

### Logs

Los logs de la aplicación se almacenan en CloudWatch Logs:
- `/aws/lambda/[env]-kpi-dashboard-auth`
- `/aws/lambda/[env]-kpi-dashboard-csv-processor`
- `/aws/lambda/[env]-kpi-dashboard-api`

### Actualizaciones

Para actualizar la aplicación:

1. Actualiza el código fuente
2. Vuelve a desplegar la infraestructura si hay cambios en CloudFormation:
   ```bash
   cd scripts
   ./deploy.sh --stack-name nombre-del-stack --admin-email tu-email@ejemplo.com
   ```
3. Reconstruye y despliega el frontend:
   ```bash
   cd ../frontend
   npm run build
   aws s3 sync build/ s3://nombre-del-bucket-frontend --delete
   ```

## Solución de problemas

### Error: "The bucket you are attempting to access must be addressed using the specified endpoint"

**Solución**: Asegúrate de que estás usando la región correcta en los comandos de AWS CLI.

### Error: "User is not authorized to perform action on resource"

**Solución**: Verifica que el usuario de AWS tiene los permisos necesarios para crear todos los recursos.

### Error: "Certificate not found" al configurar un dominio personalizado

**Solución**: Asegúrate de que el certificado SSL está creado en la región us-east-1 (requerido para CloudFront).

### Error: "Failed to load API endpoint"

**Solución**: Verifica que la URL de la API en el archivo `.env` es correcta y que CORS está configurado adecuadamente.

## Eliminación de recursos

Para eliminar todos los recursos creados:

```bash
aws cloudformation delete-stack --stack-name nombre-del-stack --region region
```

**Nota**: Esto eliminará todos los recursos excepto los buckets S3 con la política de retención. Para eliminarlos:

1. Vacía los buckets:
   ```bash
   aws s3 rm s3://nombre-del-bucket-frontend --recursive
   aws s3 rm s3://nombre-del-bucket-csv --recursive
   ```

2. Elimina los buckets:
   ```bash
   aws s3 rb s3://nombre-del-bucket-frontend
   aws s3 rb s3://nombre-del-bucket-csv
   ```