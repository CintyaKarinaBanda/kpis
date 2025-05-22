# KPI Dashboard

## Versión 1.0.0

Dashboard para visualización de KPIs operativos basados en datos CSV. Esta aplicación permite cargar archivos CSV, procesar los datos y mostrar métricas de cumplimiento en diferentes visualizaciones.

## Características

- Carga y procesamiento de archivos CSV
- Visualización de KPIs en tarjetas, gráficos y listados
- Listado de comentarios con fechas (más recientes primero)
- Configuración personalizable de widgets visibles
- Limpieza automática de datos al reiniciar la aplicación
- Despliegue automatizado en AWS

## Estructura del Proyecto

```
/kpi-dashboard/
├── backend/             # Código del backend
│   ├── api/             # Endpoints de API
│   ├── auth/            # Autenticación
│   ├── csv-processor/   # Procesamiento de archivos CSV
│   └── lambda/          # Funciones Lambda
├── docs/                # Documentación
│   ├── DEPLOYMENT.md    # Guía de despliegue general
│   ├── DEPLOYMENT_AWS.md # Guía de despliegue en AWS
│   └── USER_GUIDE.md    # Manual de usuario
├── frontend/            # Código del frontend (React)
│   ├── public/          # Archivos estáticos
│   └── src/             # Código fuente React
├── infrastructure/      # Configuración de infraestructura
│   └── cloudformation.yaml # Plantilla CloudFormation para AWS
└── scripts/             # Scripts de despliegue
    ├── deploy.sh        # Script original de despliegue
    ├── deploy-all.sh    # Script para despliegue completo
    ├── prepare-lambda.sh # Prepara archivos Lambda
    ├── update-cloudformation.sh # Actualiza plantilla CloudFormation
    └── deploy-frontend.sh # Despliega el frontend
```

## Instalación

1. Clonar el repositorio:
   ```
   git clone https://github.com/usuario/kpi-dashboard.git
   cd kpi-dashboard
   ```

2. Instalar dependencias:
   ```
   # Instalar dependencias del frontend
   cd frontend
   npm install
   
   # Instalar dependencias del backend
   cd ../backend
   npm install
   ```

3. Configurar variables de entorno:
   - Crear archivo `.env` en la raíz del proyecto
   - Definir las variables necesarias según el entorno

## Ejecución

### Modo desarrollo

```
# Iniciar frontend
cd frontend
npm start

# Iniciar backend (en otra terminal)
cd backend
npm start
```

### Despliegue en AWS

Para desplegar la aplicación completa en AWS:

```bash
cd scripts
./deploy-all.sh --admin-email tu-email@ejemplo.com
```

Para más detalles sobre el despliegue en AWS, consulta la [Guía de Despliegue en AWS](docs/DEPLOYMENT_AWS.md).

## Formato del CSV

El sistema espera archivos CSV con la siguiente estructura:

```
Name,Ventas por Tienda y Division,Ventas Presidencia,Operativo Diario,Indicadores Presidencia,Tendencia Firme / No Firme, Ecommerce, Outlet,Ventas Viajes Palacio,Ventas Restaurantes,Operativo Mensual,Operativo Fin de Semana y Semanal,Operativo Anual,Item ID (auto generated),Commentario
DD/MM/YYYY,OK,OK,OK,OK,OK,N/A,OK,N/A,N/A,N/A,ID,Comentario opcional
```

Donde:
- La columna `Name` debe contener fechas en formato DD/MM/YYYY
- Las columnas de categorías deben contener valores: OK, NO, o N/A
- La columna `Commentario` puede contener texto libre con observaciones

## Cálculo de KPIs

- **Tasa de Cumplimiento**: `(okCount / (totalRecords - naCount) * 100)`
- **Total Registros**: Número total de filas procesadas
- **Cumplimientos**: Número total de celdas con valor "OK"
- **Incumplimientos**: Número total de celdas con valor "NO"

## Arquitectura en AWS

La aplicación se despliega en AWS utilizando los siguientes servicios:

- **S3**: Almacenamiento de archivos estáticos del frontend y archivos CSV
- **CloudFront**: Distribución del frontend
- **API Gateway**: Endpoints de API
- **Lambda**: Procesamiento de datos y lógica de negocio
- **DynamoDB**: Almacenamiento de datos estructurados
- **Cognito**: Autenticación de usuarios
- **CloudWatch**: Monitoreo y logs
- **SNS**: Notificaciones
- **WAF**: Protección contra ataques web

## Notas de la versión 1.0.0

Esta versión incluye:
- Dashboard completo con visualizaciones de KPIs
- Procesamiento de archivos CSV
- Listado de comentarios con fechas (más recientes primero)
- Configuración personalizable
- Limpieza automática de datos al reiniciar
- Scripts de despliegue automatizado en AWS

## Licencia

Este proyecto está licenciado bajo los términos de la licencia MIT.