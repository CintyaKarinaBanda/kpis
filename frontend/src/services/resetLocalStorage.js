/**
 * Utilidad para resetear el localStorage cuando hay problemas con la configuración
 */

/**
 * Resetea la configuración del usuario en localStorage
 */
export const resetUserConfig = () => {
  const CONFIG_KEY = 'kpi_dashboard_config';
  
  // Configuración por defecto
  const defaultConfig = {
    theme: 'light',
    dashboard: {
      visibleWidgets: ['kpiCards', 'trendChart', 'heatmap', 'barChart', 'pieChart', 'comments']
    }
  };
  
  // Guardar la configuración por defecto
  localStorage.setItem(CONFIG_KEY, JSON.stringify(defaultConfig));
  
  console.log('Configuración de usuario reseteada correctamente');
  return defaultConfig;
};

/**
 * Limpia todos los datos relacionados con el dashboard del localStorage
 */
export const clearAllDashboardData = () => {
  // Obtener todas las claves que comienzan con 'kpi_dashboard_'
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('kpi_dashboard_')) {
      keysToRemove.push(key);
    }
  }
  
  // Eliminar las claves encontradas
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`Eliminada clave: ${key}`);
  });
  
  console.log(`Total de ${keysToRemove.length} claves eliminadas`);
};

// Si este archivo se ejecuta directamente en la consola del navegador,
// resetear la configuración del usuario
if (typeof window !== 'undefined') {
  console.log('Utilidad para resetear la configuración del dashboard');
  console.log('Para resetear solo la configuración: resetUserConfig()');
  console.log('Para limpiar todos los datos: clearAllDashboardData()');
}