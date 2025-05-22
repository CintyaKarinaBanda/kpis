/**
 * Formatea un tamaño de archivo en bytes a una representación legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Formatea una fecha ISO a formato DD/MM/YYYY HH:MM
 * @param {string} isoDate - Fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
export const formatDate = (isoDate) => {
  if (!isoDate) return '';
  
  try {
    const date = new Date(isoDate);
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    console.error('Error al formatear fecha:', e);
    return isoDate;
  }
};