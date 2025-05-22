# Guía de Despliegue en AWS

Esta guía proporciona instrucciones detalladas para desplegar el Dashboard de KPIs Operativos en AWS utilizando los scripts automatizados.

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

## Opciones de despliegue

Hay dos formas de desplegar la aplicación:

### Opción 1: Despliegue completo automatizado

Este método despliega toda la aplicación (backend y frontend) en un solo paso:

```bash
cd scripts
./deploy-all.sh --admin-email tu-email@ejemplo.com
```

### Opción 2: Despliegue paso a paso

Si prefieres más control sobre el proceso de despliegue, puedes ejecutar cada paso por separado:

1. **Preparar los archivos Lambda**:
   ```bash
   cd scripts
   ./prepare-lambda.sh
   ```

2. **Actualizar la plantilla CloudFormation**:
   ```bash
   ./update-cloudformation.sh --admin-email tu-email@ejemplo.com
   ```

3. **Desplegar la infraestructura**:
   ```bash
   ./deploy.sh --admin-email tu-email@ejemplo.com --template-file ../infrastructure/cloudformation-updated.yaml
   ```

4. **Desplegar el frontend**:
   ```bash
   ./deploy-frontend.sh
   ```

## Parámetros disponibles

Todos los scripts aceptan los siguientes parámetros:

| Parámetro | Descripción | Valor predeterminado |
|-----------|-------------|---------------------|
| --stack-name | Nombre del stack de CloudFormation | kpi-dashboard |
| --region | Región de AWS | us-east-1 |
| --env | Entorno de despliegue (dev, test, prod) | dev |
| --domain | Nombre de dominio para el frontend | - |
| --cert | ARN del certificado SSL para CloudFront | - |
| --admin-email | Email del administrador para notificaciones | - |
| --skip-frontend | Omitir la construcción y despliegue del frontend | false |

Ejemplo de despliegue personalizado:

```bash
./deploy-all.sh \
  --stack-name mi-kpi-dashboard \
  --region eu-west-1 \
  --env prod \
  --domain kpi.midominio.com \
  --cert arn:aws:acm:us-east-1:123456789012:certificate/abcdef12-3456-7890-abcd-ef1234567890 \
  --admin-email admin@midominio.com
```

## Estructura de los scripts

- **deploy-all.sh**: Script principal que orquesta todo el proceso de despliegue
- **prepare-lambda.sh**: Prepara los archivos Lambda para el despliegue
- **update-cloudformation.sh**: Actualiza la plantilla CloudFormation con los archivos Lambda reales
- **deploy.sh**: Despliega la infraestructura en AWS
- **deploy-frontend.sh**: Construye y despliega el frontend en S3

## Verificación del despliegue

Una vez completado el despliegue, podrás acceder a la aplicación a través de:

1. **URL de CloudFront** (si configuraste un dominio personalizado):
   - `https://tu-dominio.com`

2. **URL de S3** (si no configuraste un dominio personalizado):
   - `https://[bucket-name].s3.[region].amazonaws.com/index.html`

## Acceso inicial

El script de despliegue crea automáticamente un usuario administrador con:

- **Email**: El proporcionado con el parámetro `--admin-email`
- **Contraseña temporal**: Generada automáticamente y mostrada al final del despliegue

En el primer inicio de sesión, se te pedirá cambiar esta contraseña temporal.

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