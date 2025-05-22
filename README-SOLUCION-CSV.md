# Solución al Problema de Carga de Archivos CSV en Producción

## Problema Identificado

La aplicación estaba intentando cargar archivos CSV utilizando la URL local (`http://localhost:3001`) incluso cuando estaba desplegada en producción, lo que impedía que los archivos se cargaran correctamente en el bucket S3.

## Solución Implementada

Se ha implementado una solución robusta que garantiza que en producción siempre se utilice la URL del API Gateway, independientemente de la configuración:

### 1. Servicios Directos

Se ha creado un nuevo archivo `directServices.js` que proporciona acceso directo a los servicios remotos, evitando cualquier problema de configuración:

```javascript
// URL del API Gateway en AWS
const API_URL = 'https://vbpdqwho21.execute-api.us-east-1.amazonaws.com/dev';

// Servicios que siempre apuntan al API Gateway
export const directCsvService = {
  uploadCSV,
  getCSVFiles,
  getCSVPreview,
  deleteCSVFile
};
```

### 2. Modificación del Componente CSVUploader

Se ha modificado el componente `CSVUploader.js` para utilizar los servicios directos en producción:

```javascript
// Usar el servicio directo en producción
if (process.env.NODE_ENV === 'production') {
  try {
    // Importar el servicio directo
    const { directCsvService } = await import('../services/directServices');
    console.log('Usando servicio CSV directo para subir archivos');
    
    // Usar el servicio directo
    const response = await directCsvService.uploadCSV(file);
  } catch (directError) {
    // Fallback al servicio configurado si hay algún problema
    console.error('Error con servicio directo, intentando con servicio configurado');
    const response = await csvService.uploadCSV(file);
  }
}
```

### 3. Configuración en Tiempo de Ejecución

Se ha implementado un sistema de configuración en tiempo de ejecución que permite sobrescribir las variables de entorno:

- `env-config.js`: Archivo cargado antes que cualquier otro JavaScript
- `runtimeConfig.js`: Obtiene la configuración del objeto window.ENV_CONFIG o utiliza las variables de entorno como respaldo
- `forceRemoteService.js`: Fuerza el uso de servicios remotos en producción

### 4. Sobrescritura de Servicios

Se ha implementado un mecanismo para sobrescribir los servicios en tiempo de ejecución:

```javascript
// En producción, sobrescribir los servicios globalmente
if (process.env.NODE_ENV === 'production') {
  console.log('=== SOBRESCRIBIENDO SERVICIOS PARA PRODUCCIÓN ===');
  
  // Sobrescribir los servicios en el objeto window
  window.csvService = remoteCsvService;
  window.apiService = remoteApiService;
}
```

## Cómo Verificar la Solución

1. **En la Consola del Navegador**:
   - Verás mensajes indicando que se están utilizando los servicios directos
   - Podrás ver la URL del API Gateway que se está utilizando

2. **Funcionamiento**:
   - La carga de archivos CSV ahora funcionará correctamente en producción
   - La lista de archivos CSV se mostrará correctamente

3. **Robustez**:
   - La solución incluye múltiples capas de seguridad para garantizar que siempre se utilice la URL correcta
   - Se han implementado mecanismos de fallback para manejar posibles errores

## Notas Adicionales

- Esta solución es más robusta que simplemente modificar las variables de entorno, ya que fuerza el uso de la URL correcta en tiempo de ejecución
- Se han añadido logs detallados para facilitar la depuración de posibles problemas
- La solución es compatible con el modo de desarrollo, donde se seguirá utilizando la URL local si así se configura