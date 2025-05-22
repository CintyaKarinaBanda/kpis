# Dashboard de KPIs Operativos

Este proyecto implementa un portal web para visualizar KPIs operativos con un dashboard interactivo que incluye la capacidad de cargar y procesar archivos CSV para análisis.

## Características principales

- Página de inicio de sesión personalizable (colores, logos)
- Funcionalidad para cargar y procesar archivos CSV con datos operativos
- Dashboard con visualizaciones avanzadas de KPIs basados en los datos cargados
- Despliegue optimizado en AWS mediante CloudFormation
- Implementación con buenas prácticas de seguridad y DevOps

## Arquitectura

La solución está implementada con la siguiente arquitectura:

### Frontend
- React.js con Material-UI para la interfaz de usuario
- Alojado en S3 y distribuido a través de CloudFront
- Autenticación mediante Amazon Cognito

### Backend
- APIs serverless con API Gateway y Lambda
- Almacenamiento de datos en DynamoDB
- Procesamiento de archivos CSV mediante Lambda
- Almacenamiento de archivos en S3

### Infraestructura
- Definida como código mediante CloudFormation
- Seguridad implementada con WAF, IAM y encriptación
- Monitoreo con CloudWatch
- Notificaciones mediante SNS

## Estructura del proyecto

```
kpi-dashboard/
├── frontend/                  # Aplicación React
│   ├── public/                # Archivos públicos
│   └── src/                   # Código fuente
│       ├── components/        # Componentes React
│       ├── layouts/           # Layouts de la aplicación
│       ├── pages/             # Páginas principales
│       ├── services/          # Servicios para API
│       ├── utils/             # Utilidades
│       └── assets/            # Recursos estáticos
├── backend/                   # Funciones Lambda
│   ├── auth/                  # Autenticación
│   ├── csv-processor/         # Procesamiento de CSV
│   └── api/                   # APIs para el dashboard
├── infrastructure/            # Plantillas CloudFormation
├── scripts/                   # Scripts de despliegue
└── docs/                      # Documentación
```

## Requisitos previos

- Node.js 14.x o superior
- AWS CLI configurado con credenciales adecuadas
- Permisos para crear recursos en AWS (S3, CloudFront, API Gateway, Lambda, DynamoDB, Cognito, etc.)

## Instalación y despliegue

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/kpi-dashboard.git
cd kpi-dashboard
```

### 2. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

### 3. Desplegar la infraestructura en AWS

```bash
cd ../scripts
chmod +x deploy.sh
./deploy.sh --admin-email tu-email@ejemplo.com
```

Opciones adicionales para el script de despliegue:

```
Opciones:
  -h, --help                Muestra esta ayuda
  -s, --stack-name NOMBRE   Nombre del stack de CloudFormation (default: kpi-dashboard)
  -b, --bucket NOMBRE       Nombre del bucket S3 para desplegar el frontend
  -r, --region REGIÓN       Región de AWS (default: us-east-1)
  -e, --env ENTORNO         Entorno de despliegue (dev, test, prod) (default: dev)
  -d, --domain DOMINIO      Nombre de dominio para el frontend
  -c, --cert ARN            ARN del certificado SSL para CloudFront
  -a, --admin-email EMAIL   Email del administrador para notificaciones
```

### 4. Configurar y desplegar el frontend

Una vez desplegada la infraestructura, el script mostrará la URL de la API. Crea un archivo `.env` en el directorio `frontend` con el siguiente contenido:

```
REACT_APP_API_URL=https://tu-api-id.execute-api.us-east-1.amazonaws.com/dev
```

Luego, construye y despliega el frontend:

```bash
cd ../frontend
npm run build
aws s3 sync build/ s3://nombre-del-bucket-frontend --delete
```

## Estructura del CSV

El sistema está diseñado para procesar archivos CSV con la siguiente estructura:

- Columna "Name" con fechas en formato DD/MM/YYYY
- Columnas de categorías de reportes (Ventas por Tienda, Ventas Presidencia, etc.)
- Valores posibles: "OK", "NO", "N/A" para cada categoría
- Columna de comentarios opcional
- Columna de ID opcional

Ejemplo:

```
Name,Ventas por Tienda,Ventas Presidencia,Operaciones,ID,Comments
01/05/2023,OK,NO,OK,1,Todo bien en operaciones
02/05/2023,OK,OK,N/A,2,Sin comentarios
03/05/2023,NO,OK,OK,3,Problemas en tienda
```

## Personalización

### Temas y colores

El dashboard permite personalizar:

1. Colores primario y secundario
2. Logo de la empresa
3. Widgets visibles en el dashboard
4. Notificaciones

Estas configuraciones se pueden modificar desde la sección "Configuración" del dashboard.

## Seguridad

La aplicación implementa las siguientes medidas de seguridad:

- Autenticación mediante Amazon Cognito
- Conexiones HTTPS obligatorias
- Encriptación en reposo para todos los datos
- Validación de archivos CSV para prevenir inyecciones
- WAF configurado con reglas para protección contra ataques comunes
- Políticas IAM con privilegio mínimo

## Monitoreo

Se han configurado las siguientes alarmas en CloudWatch:

- Errores en API Gateway
- Errores en el procesamiento de archivos CSV
- Latencia alta en las APIs

## Soporte

Para obtener ayuda o reportar problemas, por favor crea un issue en el repositorio o contacta al equipo de soporte.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para más detalles.