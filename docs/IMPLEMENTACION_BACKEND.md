# Implementación del Backend para KPI Dashboard

Este documento describe cómo implementar el backend para el KPI Dashboard utilizando AWS Lambda, DynamoDB y S3.

## Arquitectura

La arquitectura del backend consta de los siguientes componentes:

1. **Amazon S3**: Almacena los archivos CSV cargados por los usuarios.
2. **AWS Lambda**: Procesa los archivos CSV y gestiona las operaciones de la API.
3. **Amazon DynamoDB**: Almacena los datos procesados de los KPIs.
4. **Amazon API Gateway**: Expone los endpoints de la API.

## Funciones Lambda

Se han implementado las siguientes funciones Lambda:

1. **process-csv**: Procesa los archivos CSV cargados en S3 y almacena los datos en DynamoDB.
2. **get-kpi-data**: Obtiene datos de KPI desde DynamoDB.
3. **get-kpi-summary**: Calcula y devuelve un resumen de los KPIs.
4. **upload-csv**: Genera URLs prefirmadas para subir archivos CSV a S3.

## Tablas DynamoDB

Se utiliza una tabla principal para almacenar los datos de KPI:

- **kpi-dashboard-data**: Almacena los registros de KPI procesados de los archivos CSV.

## Despliegue

Para desplegar el backend, sigue estos pasos:

1. Asegúrate de tener AWS CLI instalado y configurado con las credenciales adecuadas.

2. Ejecuta el script de despliegue:

```bash
cd scripts
chmod +x deploy-backend.sh
./deploy-backend.sh
```

Este script realizará las siguientes acciones:
- Empaquetará las funciones Lambda
- Creará o actualizará la pila de CloudFormation
- Actualizará el código de las funciones Lambda
- Mostrará la información de salida de la pila

## Configuración del Frontend

Una vez desplegado el backend, actualiza el archivo `.env` en el directorio del frontend con los valores de salida de la pila:

```
REACT_APP_API_URL=<ApiEndpoint>
REACT_APP_S3_BUCKET=<CSVBucketName>
```

## Formato del CSV

El sistema está diseñado para procesar archivos CSV con el siguiente formato:

```
Name,Ventas por Tienda,Ventas Presidencia,Reportes Operativos,Comments
01/05/2023,OK,NO,OK,Todo bien en general
02/05/2023,OK,OK,OK,Sin problemas
```

Donde:
- La columna `Name` debe contener fechas en formato DD/MM/YYYY
- Las columnas de categorías deben contener valores "OK", "NO" o "N/A"
- La columna `Comments` es opcional

## Pruebas

Para probar el backend, puedes utilizar el siguiente archivo CSV de ejemplo:

```
Name,Ventas por Tienda,Ventas Presidencia,Reportes Operativos,Comments
01/05/2023,OK,NO,OK,Todo bien en general
02/05/2023,OK,OK,OK,Sin problemas
03/05/2023,NO,NO,OK,Problemas en ventas
04/05/2023,OK,N/A,NO,Reporte operativo con errores
05/05/2023,OK,OK,OK,Todo correcto
```

## Solución de problemas

Si encuentras problemas durante el despliegue o la ejecución del backend, verifica lo siguiente:

1. **Permisos de IAM**: Asegúrate de que el rol de ejecución de Lambda tenga los permisos necesarios para acceder a S3 y DynamoDB.

2. **Logs de CloudWatch**: Revisa los logs de CloudWatch para las funciones Lambda para identificar posibles errores.

3. **Configuración de CORS**: Verifica que la configuración de CORS en API Gateway y S3 permita solicitudes desde el frontend.

4. **Formato del CSV**: Asegúrate de que los archivos CSV cargados tengan el formato correcto.