# Manual de Usuario - Dashboard de KPIs Operativos

Esta guía proporciona instrucciones detalladas sobre cómo utilizar el Dashboard de KPIs Operativos.

## Índice

1. [Inicio de sesión](#inicio-de-sesión)
2. [Navegación general](#navegación-general)
3. [Dashboard principal](#dashboard-principal)
4. [Carga de archivos CSV](#carga-de-archivos-csv)
5. [Visualización de KPIs](#visualización-de-kpis)
6. [Personalización](#personalización)
7. [Comentarios](#comentarios)
8. [Preguntas frecuentes](#preguntas-frecuentes)

## Inicio de sesión

1. Accede a la URL proporcionada por tu administrador
2. En la pantalla de inicio de sesión, ingresa tus credenciales:
   - Correo electrónico
   - Contraseña
3. Haz clic en "Iniciar Sesión"

Si no tienes una cuenta:
1. Haz clic en "¿No tienes una cuenta? Regístrate"
2. Completa el formulario con tu información:
   - Nombre completo
   - Correo electrónico
   - Contraseña (mínimo 8 caracteres)
   - Confirmación de contraseña
3. Haz clic en "Registrarse"
4. Recibirás un correo electrónico de confirmación (si está configurado)

## Navegación general

Una vez iniciada la sesión, encontrarás la siguiente estructura:

- **Menú lateral**: Acceso a las diferentes secciones
  - Dashboard: Visualización principal de KPIs
  - Cargar CSV: Carga y gestión de archivos CSV
  - Configuración: Personalización de la aplicación

- **Barra superior**: 
  - Título de la aplicación
  - Perfil de usuario (haz clic para acceder a opciones de cuenta)

## Dashboard principal

El dashboard muestra una visión general de los KPIs operativos basados en los datos cargados:

### Selector de período

En la parte superior del dashboard, puedes seleccionar el período de tiempo para los datos:
- Última semana
- Último mes
- Último trimestre
- Último año

### Pestañas

El dashboard está organizado en tres pestañas:
1. **Dashboard**: Vista general con todos los widgets
2. **Tendencias**: Análisis detallado de tendencias temporales
3. **Detalles por Categoría**: Análisis por categoría de KPI

### Widgets disponibles

Dependiendo de la configuración, podrás ver los siguientes widgets:

1. **Tarjetas de KPI**:
   - Tasa de Cumplimiento: Porcentaje global de cumplimiento
   - Total Registros: Número total de registros procesados
   - Cumplimientos: Cantidad de registros con estado "OK"
   - Incumplimientos: Cantidad de registros con estado "NO"

2. **Gráfico de Tendencias**:
   - Muestra la evolución de la tasa de cumplimiento a lo largo del tiempo
   - El eje X representa las fechas
   - El eje Y representa el porcentaje de cumplimiento

3. **Gráfico Circular**:
   - Muestra la distribución de estados (OK, NO, N/A)
   - Incluye porcentajes para cada categoría

4. **Mapa de Calor**:
   - Visualiza las incidencias por día de la semana
   - Los colores representan la tasa de cumplimiento (verde = alto, rojo = bajo)
   - Pasa el cursor sobre cada celda para ver detalles

5. **Gráfico de Barras**:
   - Muestra las incidencias por categoría
   - Permite comparar cumplimientos e incumplimientos entre categorías

6. **Comentarios Recientes**:
   - Lista los últimos comentarios agregados por los usuarios

## Carga de archivos CSV

Para cargar y procesar archivos CSV:

1. Haz clic en "Cargar CSV" en el menú lateral
2. Arrastra y suelta archivos CSV en el área designada, o haz clic para seleccionar archivos
3. Una vez seleccionados los archivos, haz clic en "Subir"
4. Espera a que se complete el procesamiento

### Historial de archivos

En la sección inferior de la página de carga, encontrarás un historial de los archivos CSV cargados:
- Nombre del archivo
- Tamaño
- Fecha de carga
- Acciones disponibles:
  - Ver vista previa: Muestra las primeras filas del archivo
  - Eliminar: Elimina el archivo y sus datos asociados

### Formato esperado del CSV

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

## Visualización de KPIs

Para analizar los datos en detalle:

### Filtrado por período

1. Selecciona el período deseado en el selector de la parte superior
2. Los datos se actualizarán automáticamente para mostrar solo el período seleccionado

### Análisis por pestañas

- **Dashboard**: Visión general con todos los widgets
- **Tendencias**: 
  - Gráfico detallado de la evolución temporal
  - Incluye líneas para cumplimientos e incumplimientos
- **Detalles por Categoría**:
  - Gráfico de barras con la tasa de cumplimiento por categoría
  - Permite identificar las categorías con mejor y peor desempeño

### Interacción con gráficos

Todos los gráficos son interactivos:
- Pasa el cursor sobre los elementos para ver detalles
- Haz clic en elementos de la leyenda para mostrar/ocultar series
- En algunos gráficos, puedes hacer zoom seleccionando un área

## Personalización

Para personalizar la aplicación:

1. Haz clic en "Configuración" en el menú lateral
2. Navega por las pestañas disponibles:

### Apariencia

- **Colores**:
  - Color Primario: Define el color principal de la aplicación
  - Color Secundario: Define el color de acento
  
- **Logo**:
  - URL del Logo: Ingresa la URL de tu logo corporativo
  - Vista previa: Muestra cómo se verá el logo en la aplicación

### Dashboard

- **Widgets Visibles**: Activa o desactiva los widgets que deseas ver:
  - Tarjetas de KPI
  - Gráfico de Tendencias
  - Mapa de Calor
  - Gráfico de Barras
  - Gráfico Circular
  - Comentarios

- **Diseño**: Selecciona el diseño del dashboard:
  - Por defecto
  - Compacto
  - Expandido

### Notificaciones

- **Preferencias de Notificación**:
  - Recibir notificaciones por correo electrónico
  - Mostrar notificaciones en el dashboard

## Comentarios

Para agregar comentarios:

1. En el dashboard, desplázate hasta la sección "Comentarios Recientes"
2. Escribe tu comentario en el campo de texto
3. Haz clic en "Enviar"

Los comentarios incluirán:
- Tu nombre
- Fecha y hora
- El texto del comentario
- La fecha de referencia (automáticamente se usa la fecha actual)

## Preguntas frecuentes

### ¿Cómo puedo restablecer mi contraseña?

1. En la pantalla de inicio de sesión, haz clic en "¿Olvidaste tu contraseña?"
2. Ingresa tu correo electrónico
3. Sigue las instrucciones enviadas a tu correo

### ¿Qué formato de CSV debo usar?

El sistema espera un CSV con:
- Columna "Name" con fechas en formato DD/MM/YYYY
- Columnas para cada categoría de KPI
- Valores "OK", "NO" o "N/A" en las celdas

### ¿Puedo exportar los datos o gráficos?

Actualmente, la exportación directa no está disponible. Sin embargo, puedes:
1. Usar la función de captura de pantalla de tu navegador
2. Copiar los datos de las tablas y pegarlos en una hoja de cálculo

### ¿Cómo se calcula la tasa de cumplimiento?

La tasa de cumplimiento se calcula como:
```
(Número de "OK" / (Número de "OK" + Número de "NO")) * 100
```
Los valores "N/A" no se consideran en el cálculo.

### ¿Qué hago si un archivo CSV no se procesa correctamente?

1. Verifica que el formato del archivo sea correcto
2. Asegúrate de que las columnas tengan los nombres esperados
3. Comprueba que los valores en las celdas sean "OK", "NO" o "N/A"
4. Intenta cargar el archivo nuevamente

Si el problema persiste, contacta al administrador del sistema.