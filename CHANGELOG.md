# Changelog

Todas las modificaciones notables a este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2023-05-12

### Añadido
- Dashboard completo para visualización de KPIs
- Carga y procesamiento de archivos CSV
- Visualización de KPIs en tarjetas, gráficos y listados
- Listado de comentarios con fechas (más recientes primero)
- Configuración personalizable de widgets visibles
- Limpieza automática de datos al reiniciar la aplicación
- Botón para restaurar valores predeterminados en la configuración
- Utilidad para resetear la configuración cuando hay problemas

### Cambiado
- Reemplazo del mapa de calor por un listado de comentarios con fechas
- Actualización de etiquetas en la configuración para reflejar la funcionalidad actual

### Corregido
- Problema de persistencia de datos al reiniciar la aplicación
- Errores en el componente Settings cuando la configuración no tenía la estructura esperada
- Validación mejorada para asegurar que la configuración siempre tiene la estructura correcta

### Notas
- Esta versión será replicada a GitHub como la primera versión estable del proyecto