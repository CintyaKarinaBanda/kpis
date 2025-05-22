# Integración con Monday.com

Esta guía explica cómo configurar y utilizar la integración con Monday.com en el Dashboard de KPIs.

## Índice

1. [Requisitos previos](#requisitos-previos)
2. [Configuración inicial](#configuración-inicial)
3. [Mapeo de columnas](#mapeo-de-columnas)
4. [Importación de datos](#importación-de-datos)
5. [Actualización automática](#actualización-automática)
6. [Solución de problemas](#solución-de-problemas)

## Requisitos previos

Para utilizar la integración con Monday.com, necesitarás:

1. Una cuenta en Monday.com con acceso a los tableros que deseas integrar
2. Un token de API de Monday.com con permisos de lectura
3. El ID del tablero que deseas integrar

### Obtener un token de API de Monday.com

1. Inicia sesión en tu cuenta de Monday.com
2. Ve a tu perfil (esquina inferior izquierda) > Admin > API
3. En la sección "API v2 Token", copia el token o genera uno nuevo
4. Guarda este token de forma segura, lo necesitarás para la configuración

**IMPORTANTE**: El token debe tener el formato completo, por ejemplo: `eyJhbGciOiJIUzI1NiJ9...` (un token real es mucho más largo)

### Encontrar el ID del tablero

1. Abre el tablero que deseas integrar en Monday.com
2. Observa la URL en tu navegador, que tendrá un formato similar a:
   `https://your-company.monday.com/boards/123456789`
3. El número al final de la URL es el ID del tablero (en este ejemplo, `123456789`)

## Configuración inicial

### Configurar variables de entorno

1. En el directorio del backend, crea o edita el archivo `.env`
2. Añade la siguiente línea con tu token de API:
   ```
   MONDAY_API_KEY=tu_token_api_monday
   ```
3. Reinicia el servidor backend para aplicar los cambios

**IMPORTANTE**: Asegúrate de que el token se copie exactamente como aparece en Monday.com, sin espacios adicionales ni caracteres extraños.

### Acceder a la integración

1. Inicia sesión en el Dashboard de KPIs
2. En el menú lateral, haz clic en "Integración Monday"
3. Verás la página de configuración de la integración con Monday.com

### Verificar la conexión

Si tienes problemas para conectarte a Monday.com:

1. En la página de integración, haz clic en "Mostrar Depurador"
2. Ingresa tu API key y el ID del tablero
3. Haz clic en "Probar Conexión"
4. Verifica si la conexión es exitosa o si hay algún error específico

## Mapeo de columnas

Para que los datos de Monday.com se importen correctamente, debes mapear las columnas del tablero a las categorías del dashboard:

1. En la página de integración, ingresa el ID del tablero y haz clic en "Agregar"
2. Se abrirá un diálogo de mapeo de columnas
3. Para cada categoría del dashboard, selecciona la columna correspondiente en Monday.com:
   - **Name**: Debe mapearse a una columna de fecha
   - **Ventas por Tienda y Division**, **Ventas Presidencia**, etc.: Deben mapearse a columnas con valores que puedan interpretarse como "OK", "NO" o "N/A"
   - **Commentario**: Puede mapearse a una columna de texto libre
4. Haz clic en "Guardar" para confirmar el mapeo

### Consideraciones importantes para el mapeo

- La columna mapeada a "Name" debe contener fechas
- Las columnas mapeadas a categorías de KPI deben contener valores que puedan interpretarse como:
  - "OK", "Completado", "Sí", etc. → Se convertirán a "OK"
  - "NO", "Pendiente", "Incompleto", etc. → Se convertirán a "NO"
  - "N/A", "No aplica", etc. → Se convertirán a "N/A"
- Si una columna no tiene un valor claro, se considerará como "N/A"

## Importación de datos

Una vez configurado el mapeo, puedes importar los datos al dashboard:

1. Selecciona el tablero configurado en la lista desplegable
2. Haz clic en "Ver datos transformados" para previsualizar cómo se verán los datos
3. Si los datos se ven correctos, haz clic en "Importar al dashboard"
4. Los datos se procesarán y estarán disponibles inmediatamente en el dashboard

### Verificación de datos importados

Después de importar los datos:

1. Ve al dashboard principal
2. Verifica que los datos se muestren correctamente
3. Comprueba que las fechas y los estados (OK, NO, N/A) se hayan importado correctamente

## Actualización automática

Para mantener los datos actualizados automáticamente:

1. Configura un trabajo programado (cron job) en el servidor
2. El trabajo debe llamar al endpoint `/api/monday/board/{boardId}/import` periódicamente
3. Ejemplo de configuración para actualizar cada día a las 8:00 AM:
   ```
   0 8 * * * curl -X POST http://tu-servidor/api/monday/board/123456789/import
   ```

## Solución de problemas

### Error "Verifica el ID y tu API key"

Este error puede ocurrir por varias razones:

1. **API key incorrecta**: Verifica que la API key en el archivo `.env` sea correcta y tenga el formato adecuado (`Bearer eyJhbGciOiJIUzI1NiJ9...`)
2. **ID de tablero incorrecto**: Asegúrate de que el ID del tablero sea el número que aparece en la URL de Monday.com
3. **Permisos insuficientes**: La API key debe tener permisos para leer el tablero especificado
4. **Problemas de red**: Verifica que el servidor tenga conexión a internet y pueda acceder a api.monday.com

Para diagnosticar el problema:

1. Usa la herramienta de depuración incluida en la página de integración
2. Revisa los logs del servidor para ver mensajes de error más detallados
3. Verifica que la API key tenga el formato correcto (debe comenzar con "eyJ...")

### Los datos no se importan correctamente

- Verifica que el mapeo de columnas sea correcto
- Asegúrate de que la columna mapeada a "Name" contenga fechas válidas
- Comprueba que las columnas de categorías contengan valores que puedan interpretarse como "OK", "NO" o "N/A"

### Error de autenticación

- Verifica que el token de API de Monday.com sea válido y tenga los permisos necesarios
- Comprueba que la variable de entorno `MONDAY_API_KEY` esté configurada correctamente
- Asegúrate de que el token no haya expirado (los tokens de Monday.com pueden tener fecha de caducidad)

### No se pueden ver los tableros

- Asegúrate de tener acceso al tablero en Monday.com
- Verifica que el ID del tablero sea correcto
- Comprueba la conexión a internet del servidor

### Datos incompletos o incorrectos

- Revisa la vista previa de datos transformados antes de importar
- Verifica que todas las columnas necesarias estén mapeadas correctamente
- Comprueba que los datos en Monday.com estén completos y en el formato esperado