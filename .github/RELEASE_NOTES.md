# Notas de lanzamiento - Versión 1.0.0

Fecha: 12 de mayo de 2023

## Descripción

Primera versión estable del KPI Dashboard, una aplicación para visualizar KPIs operativos basados en datos CSV. Esta versión incluye todas las funcionalidades básicas necesarias para el procesamiento y visualización de datos de cumplimiento.

## Características principales

- **Dashboard completo**: Visualización de KPIs en tarjetas, gráficos y listados
- **Procesamiento de CSV**: Carga y análisis de archivos CSV con datos de cumplimiento
- **Listado de comentarios**: Visualización de comentarios con fechas (más recientes primero)
- **Configuración personalizable**: Selección de widgets visibles en el dashboard
- **Limpieza automática**: Reinicio limpio de la aplicación en cada sesión

## Mejoras técnicas

- Implementación de validaciones robustas para la configuración
- Manejo adecuado de casos donde la configuración no tiene la estructura esperada
- Utilidad para resetear la configuración cuando hay problemas
- Ordenación de comentarios por fecha (más recientes primero)
- Eliminación de comentarios duplicados, manteniendo solo la versión más reciente

## Correcciones

- Solución al problema de persistencia de datos al reiniciar la aplicación
- Corrección de errores en el componente Settings
- Mejora en la visualización de comentarios, reemplazando el mapa de calor por un listado más útil

## Notas de instalación

Ver el archivo README.md para instrucciones detalladas de instalación y uso.

## Notas adicionales

Esta versión será replicada a GitHub como la primera versión estable del proyecto.