#!/usr/bin/env python3
"""
KPI Dashboard - Archivo de seguimiento del proyecto

Este script proporciona información sobre el estado actual del proyecto
y sirve como referencia para Amazon Q para retomar la información.
"""

import json
import os
from datetime import datetime

# Información del proyecto
PROJECT_INFO = {
    "name": "KPI Dashboard",
    "description": "Dashboard para visualizar KPIs operativos basados en datos CSV",
    "version": "1.0.0",
    "last_updated": "2023-05-12",
    "repository": "/Users/sahianhernandez/Documents/kpi-dashboard",
}

# Estructura del proyecto
PROJECT_STRUCTURE = {
    "backend": {
        "api": "Endpoints de API",
        "auth": "Autenticación",
        "csv-processor": "Procesamiento de archivos CSV",
        "lambda": "Funciones Lambda",
    },
    "docs": "Documentación",
    "frontend": {
        "public": "Archivos estáticos",
        "src": "Código fuente React",
    },
    "infrastructure": "Configuración de infraestructura",
    "scripts": "Scripts de despliegue",
}

# Cambios realizados
CHANGES = [
    {
        "date": "2023-05-12",
        "title": "Mejora en la Visualización de Comentarios con Fechas",
        "description": "Añadido de fechas a los comentarios y ordenación por fecha",
        "files_modified": [
            "/frontend/src/components/Dashboard.js",
            "/backend/csv-processor/index.js",
            "/frontend/src/services/localCsvService.js",
            "/frontend/src/index.js",
        ],
        "details": [
            "Se añadió la fecha del registro junto a cada comentario",
            "Se implementó un sistema para mostrar solo el comentario más reciente cuando hay duplicados",
            "Se ordenan los comentarios por fecha (más recientes primero)",
            "Se reemplazó el componente de mapa de calor por un listado de comentarios únicos",
            "Se modificó el título a 'Comentarios Registrados (Más recientes primero)'",
            "Se implementó un sistema de alertas con diferentes colores según el contenido",
            "Se añadió lógica para capturar todos los comentarios no vacíos",
            "Se implementó limpieza de localStorage al iniciar la aplicación",
        ],
    },
]

# Problemas resueltos
ISSUES_RESOLVED = [
    {
        "id": 1,
        "title": "Persistencia de datos no deseada",
        "description": "Al reiniciar la aplicación con npm start, los datos persistían",
        "solution": "Implementación de limpieza automática del localStorage al iniciar",
        "files_modified": ["/frontend/src/index.js"],
    },
    {
        "id": 2,
        "title": "Visualización de comentarios",
        "description": "El mapa de calor no proporcionaba información útil sobre problemas específicos",
        "solution": "Reemplazo por un listado de comentarios únicos que muestra los problemas reportados",
        "files_modified": [
            "/frontend/src/components/Dashboard.js",
            "/backend/csv-processor/index.js",
            "/frontend/src/services/localCsvService.js",
        ],
    },
    {
        "id": 3,
        "title": "Errores en el componente Settings",
        "description": "El componente Settings fallaba cuando la configuración no tenía la estructura esperada",
        "solution": "Implementación de validaciones y un botón para restaurar valores predeterminados",
        "files_modified": [
            "/frontend/src/components/Settings.js",
            "/frontend/src/services/resetLocalStorage.js",
        ],
    },
]

# Formato del CSV esperado
CSV_FORMAT = {
    "columns": [
        "Name",
        "Ventas por Tienda y Division",
        "Ventas Presidencia",
        "Operativo Diario",
        "Indicadores Presidencia",
        "Tendencia Firme / No Firme, Ecommerce, Outlet",
        "Ventas Viajes Palacio",
        "Ventas Restaurantes",
        "Operativo Mensual",
        "Operativo Fin de Semana y Semanal",
        "Operativo Anual",
        "Item ID (auto generated)",
        "Commentario",
    ],
    "example_row": "DD/MM/YYYY,OK,OK,OK,OK,OK,N/A,OK,N/A,N/A,N/A,ID,Comentario opcional",
    "valid_values": ["OK", "NO", "N/A"],
}

# Cálculo de KPIs
KPI_CALCULATIONS = {
    "Tasa de Cumplimiento": "(okCount / (totalRecords - naCount) * 100)",
    "Total Registros": "Número total de filas procesadas",
    "Cumplimientos": "Número total de celdas con valor 'OK'",
    "Incumplimientos": "Número total de celdas con valor 'NO'",
}

# Próximos pasos
NEXT_STEPS = [
    "Mejorar la visualización de comentarios con filtros por categoría",
    "Implementar exportación de datos a Excel o PDF",
    "Añadir funcionalidad de comparación entre períodos",
    "Mejorar la validación de archivos CSV",
    "Implementar notificaciones para incumplimientos críticos",
]


def generate_report():
    """Genera un informe del estado actual del proyecto."""
    report = {
        "project_info": PROJECT_INFO,
        "structure": PROJECT_STRUCTURE,
        "recent_changes": CHANGES,
        "issues_resolved": ISSUES_RESOLVED,
        "csv_format": CSV_FORMAT,
        "kpi_calculations": KPI_CALCULATIONS,
        "next_steps": NEXT_STEPS,
        "report_generated": datetime.now().isoformat(),
    }
    
    return report


def save_report(report, filename="project_status.json"):
    """Guarda el informe en un archivo JSON."""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Informe guardado en {filename}")


def main():
    """Función principal."""
    print(f"Proyecto: {PROJECT_INFO['name']} v{PROJECT_INFO['version']}")
    print(f"Última actualización: {PROJECT_INFO['last_updated']}")
    print("\nCambios recientes:")
    for change in CHANGES:
        print(f"- {change['date']}: {change['title']}")
    
    print("\nProblemas resueltos:")
    for issue in ISSUES_RESOLVED:
        print(f"- {issue['title']}: {issue['solution']}")
    
    print("\nPróximos pasos:")
    for i, step in enumerate(NEXT_STEPS, 1):
        print(f"{i}. {step}")
    
    # Generar y guardar informe si se ejecuta el script
    if __name__ == "__main__":
        report = generate_report()
        save_report(report)


# Ejecutar si se llama directamente
if __name__ == "__main__":
    main()