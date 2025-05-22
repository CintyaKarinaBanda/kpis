# Desarrollo Local del KPI Dashboard

Esta guía proporciona instrucciones para configurar y ejecutar el proyecto KPI Dashboard en un entorno de desarrollo local.

## Requisitos previos

- Node.js 14.x o superior
- npm 6.x o superior

## Configuración del entorno

### Backend

1. Navega al directorio del backend:
   ```bash
   cd backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` (ya incluido) con las siguientes variables:
   ```
   PORT=3001
   JWT_SECRET=kpi-dashboard-secret-key
   NODE_ENV=development
   ```

### Frontend

1. Navega al directorio del frontend:
   ```bash
   cd frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env.local` (ya incluido) con las siguientes variables:
   ```
   REACT_APP_API_URL=http://localhost:3001
   REACT_APP_USE_LOCAL_API=true
   ```

## Ejecución del proyecto

### Iniciar el backend

1. Navega al directorio del backend:
   ```bash
   cd backend
   ```

2. Inicia el servidor:
   ```bash
   npm start
   ```

   El servidor se ejecutará en `http://localhost:3001`.

### Iniciar el frontend

1. Navega al directorio del frontend:
   ```bash
   cd frontend
   ```

2. Inicia la aplicación:
   ```bash
   npm start
   ```

   La aplicación se ejecutará en `http://localhost:3000`.

## Estructura del proyecto local

```
/kpi-dashboard/
├── backend/             # Código del backend local
│   ├── controllers/     # Controladores de la API
│   ├── data/            # Datos locales (simulando base de datos)
│   ├── uploads/         # Archivos CSV subidos
│   ├── utils/           # Utilidades
│   ├── .env             # Variables de entorno
│   ├── package.json     # Dependencias del backend
│   └── server.js        # Punto de entrada del servidor
├── frontend/            # Código del frontend
│   ├── public/          # Archivos estáticos
│   ├── src/             # Código fuente React
│   │   ├── components/  # Componentes React
│   │   ├── services/    # Servicios para comunicación con la API
│   │   └── ...
│   ├── .env.local       # Variables de entorno locales
│   └── package.json     # Dependencias del frontend
└── README-LOCAL.md      # Esta guía
```

## Credenciales de prueba

Para iniciar sesión en la aplicación local, puedes usar las siguientes credenciales:

- **Email**: admin@example.com
- **Contraseña**: admin123

## Flujo de trabajo de desarrollo

1. Realiza cambios en el código
2. Prueba los cambios localmente
3. Una vez que estés satisfecho con los cambios, puedes desplegarlos en AWS usando los scripts de despliegue

## Notas importantes

- Los datos se almacenan localmente en archivos JSON en el directorio `backend/data/`
- Los archivos CSV subidos se guardan en el directorio `backend/uploads/`
- La autenticación local usa JWT pero con una clave secreta fija (no usar en producción)
- El backend local implementa las mismas rutas que la API en AWS para mantener la compatibilidad