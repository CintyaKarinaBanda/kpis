const fs = require('fs');
const path = require('path');

// Archivo para almacenar datos KPI (simulando una base de datos)
const KPI_DATA_FILE = path.join(__dirname, '../data/kpi_data.json');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Cargar datos KPI
const loadKPIData = () => {
  try {
    if (fs.existsSync(KPI_DATA_FILE)) {
      const data = fs.readFileSync(KPI_DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {
      data: [],
      fileKeys: [],
      summary: {
        totalRecords: 0,
        okCount: 0,
        noCount: 0,
        naCount: 0,
        complianceRate: "0.00",
        byCategory: {},
        byDate: {},
        trend: [],
        uniqueErrors: []
      }
    };
  } catch (error) {
    console.error('Error al cargar datos KPI:', error);
    return { data: [], fileKeys: [], summary: {} };
  }
};

// Guardar datos KPI
const saveKPIData = (data) => {
  try {
    fs.writeFileSync(KPI_DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error al guardar datos KPI:', error);
    return false;
  }
};

/**
 * Procesa un archivo CSV y extrae los KPIs
 */
exports.processCSV = async (filePath, fileKey) => {
  try {
    // Leer el contenido del archivo CSV
    const csvContent = fs.readFileSync(filePath, 'utf8');
    
    // Extraer el ID de usuario del key (formato: userId/filename.csv)
    // Para desarrollo local, usamos un ID fijo
    const userId = '1';
    
    // Analizar el CSV
    const { kpiData, summary } = parseCSV(csvContent, fileKey, userId);
    
    // Cargar datos existentes
    const existingData = loadKPIData();
    
    // Agregar el nuevo fileKey si no existe
    if (!existingData.fileKeys) {
      existingData.fileKeys = [];
    }
    if (!existingData.fileKeys.includes(fileKey)) {
      existingData.fileKeys.push(fileKey);
    }
    
    // Agregar nuevos datos
    const updatedData = {
      data: [...existingData.data, ...kpiData],
      fileKeys: existingData.fileKeys,
      summary: mergeSummaries(existingData.summary, summary)
    };
    
    // Guardar datos actualizados
    saveKPIData(updatedData);
    
    return { summary: updatedData.summary };
  } catch (error) {
    console.error('Error al procesar el archivo CSV:', error);
    throw error;
  }
};

/**
 * Elimina los datos de un archivo CSV específico
 */
exports.deleteCSVData = async (fileKey) => {
  try {
    // Cargar datos existentes
    const existingData = loadKPIData();
    
    // Verificar si el archivo existe en los datos
    if (!existingData.fileKeys || !existingData.fileKeys.includes(fileKey)) {
      return { success: false, message: 'Archivo no encontrado en los datos' };
    }
    
    // Filtrar los datos para eliminar los del archivo específico
    const filteredData = existingData.data.filter(item => item.fileName !== fileKey);
    
    // Actualizar la lista de fileKeys
    const updatedFileKeys = existingData.fileKeys.filter(key => key !== fileKey);
    
    // Recalcular el resumen desde cero con los datos filtrados
    const { summary } = recalculateSummary(filteredData);
    
    // Guardar datos actualizados
    const updatedData = {
      data: filteredData,
      fileKeys: updatedFileKeys,
      summary
    };
    
    saveKPIData(updatedData);
    
    return { success: true, summary };
  } catch (error) {
    console.error('Error al eliminar datos del CSV:', error);
    throw error;
  }
};

/**
 * Recalcula el resumen a partir de los datos filtrados
 */
function recalculateSummary(data) {
  // Inicializar el resumen
  const summary = {
    totalRecords: data.length,
    okCount: 0,
    noCount: 0,
    naCount: 0,
    byCategory: {},
    byDate: {},
    trend: [],
    uniqueErrors: []
  };
  
  // Extraer categorías únicas de los datos
  const categories = new Set();
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key.startsWith('category_')) {
        const category = key.replace('category_', '').replace(/_/g, ' ');
        categories.add(category);
      }
    });
  });
  
  // Inicializar contadores por categoría
  categories.forEach(category => {
    summary.byCategory[category] = {
      ok: 0,
      no: 0,
      na: 0
    };
  });
  
  // Inicializar contadores por fecha
  const dateRecords = {};
  
  // Procesar cada registro
  data.forEach(item => {
    const date = item.date;
    
    // Inicializar contadores por fecha si no existen
    if (!dateRecords[date]) {
      dateRecords[date] = {
        ok: 0,
        no: 0,
        na: 0
      };
    }
    
    // Procesar cada categoría
    categories.forEach(category => {
      const categoryKey = `category_${category.replace(/\\s+/g, '_')}`;
      const value = item[categoryKey];
      
      if (value === 'OK') {
        summary.okCount++;
        summary.byCategory[category].ok++;
        dateRecords[date].ok++;
      } else if (value === 'NO') {
        summary.noCount++;
        summary.byCategory[category].no++;
        dateRecords[date].no++;
      } else if (value === 'N/A') {
        summary.naCount++;
        summary.byCategory[category].na++;
        dateRecords[date].na++;
      }
    });
    
    // Agregar comentario si existe
    if (item.rawData && (item.rawData.Comments || item.rawData.Commentario)) {
      const comment = item.rawData.Comments || item.rawData.Commentario;
      if (comment && comment.trim() !== '') {
        const commentWithDate = `[${item.rawData.Name}] ${comment}`;
        if (!summary.uniqueErrors.includes(commentWithDate)) {
          summary.uniqueErrors.push(commentWithDate);
        }
      }
    }
  });
  
  // Calcular tasas de cumplimiento (excluyendo N/A)
  const totalValid = summary.okCount + summary.noCount;
  summary.complianceRate = totalValid > 0 
    ? (summary.okCount / totalValid * 100).toFixed(2) 
    : "0.00";
  
  // Calcular tasas de cumplimiento por categoría (excluyendo N/A)
  Object.keys(summary.byCategory).forEach(category => {
    const categoryData = summary.byCategory[category];
    const total = categoryData.ok + categoryData.no;
    categoryData.complianceRate = total > 0 
      ? (categoryData.ok / total * 100).toFixed(2) 
      : "0.00";
  });
  
  // Calcular tasas de cumplimiento por fecha y generar tendencia (excluyendo N/A)
  Object.keys(dateRecords).forEach(date => {
    const dateData = dateRecords[date];
    const total = dateData.ok + dateData.no;
    const complianceRate = total > 0 
      ? (dateData.ok / total * 100).toFixed(2) 
      : "0.00";
    
    summary.byDate[date] = {
      ...dateData,
      complianceRate
    };
    
    summary.trend.push({
      date,
      complianceRate: parseFloat(complianceRate),
      ok: dateData.ok,
      no: dateData.no,
      na: dateData.na
    });
  });
  
  // Ordenar la tendencia por fecha
  summary.trend.sort((a, b) => a.date.localeCompare(b.date));
  
  return { summary };
}

/**
 * Analiza el contenido CSV y extrae los KPIs
 */
function parseCSV(csvContent, fileKey, userId) {
  // Detectar el separador (coma o tabulación)
  const firstLine = csvContent.split('\n')[0];
  const separator = firstLine.includes('\t') ? '\t' : ',';
  
  const lines = csvContent.split('\n');
  
  // Verificar que hay al menos una línea de encabezado y datos
  if (lines.length < 2) {
    throw new Error('El archivo CSV está vacío o no tiene suficientes datos');
  }
  
  // Extraer encabezados y manejar comillas en los nombres de columnas
  const headerLine = lines[0];
  let headers = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      headers.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Añadir el último campo
  if (currentField) {
    headers.push(currentField.trim());
  }
  
  // Limpiar comillas de los encabezados
  headers = headers.map(header => header.replace(/^\"(.+)\"$/, '$1'));
  
  // Verificar que el formato del CSV es el esperado
  if (!headers.includes('Name')) {
    throw new Error('El formato del CSV no es válido. Debe incluir una columna "Name"');
  }
  
  // Extraer las categorías (todas las columnas excepto Name, ID y Comments)
  const categories = headers.filter(h => 
    h !== 'Name' && 
    !h.includes('Item ID') && 
    h !== 'ID' && 
    h !== 'Comments' && 
    h !== 'Commentario');
  
  // Inicializar contadores para el resumen
  const summary = {
    totalRecords: 0,
    okCount: 0,
    noCount: 0,
    naCount: 0,
    byCategory: {},
    byDate: {},
    trend: [],
    uniqueErrors: []
  };
  
  // Inicializar contadores por categoría
  categories.forEach(category => {
    summary.byCategory[category] = {
      ok: 0,
      no: 0,
      na: 0
    };
  });
  
  // Procesar cada línea de datos
  const kpiData = [];
  const dateRecords = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Saltar líneas vacías
    
    // Parsear la línea respetando las comillas
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Añadir el último valor
    if (currentValue || values.length < headers.length) {
      values.push(currentValue.trim());
    }
    
    // Verificar que la línea tiene suficientes valores
    if (values.length < headers.length) {
      console.warn(`Línea ${i} no tiene suficientes valores, saltando`);
      continue;
    }
    
    // Crear un objeto con los valores de la línea
    const record = {};
    headers.forEach((header, index) => {
      // Limpiar comillas de los valores
      let value = values[index] || '';
      value = value.replace(/^\"(.+)\"$/, '$1');
      record[header] = value;
    });
    
    // Verificar si hay campos vacíos en la fila
    let hasEmptyFields = false;
    for (const category of categories) {
      if (!record[category] || record[category].trim() === '') {
        hasEmptyFields = true;
        break;
      }
    }
    
    if (hasEmptyFields) {
      console.warn(`Fila ${i} tiene campos vacíos, saltando`);
      continue;
    }
    
    // Normalizar formato de fecha si es necesario
    let normalizedName = record.Name;
    console.log(`Procesando fecha original: "${normalizedName}"`);
    
    // Caso 1: Formato DD-MM-YYYY o D-M-YYYY
    const altFormatMatch = normalizedName.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (altFormatMatch) {
      const [_, altDay, altMonth, altYear] = altFormatMatch;
      // Convertir a formato DD/MM/YY
      const shortYear = altYear.substring(2);
      normalizedName = `${altDay}/${altMonth}/${shortYear}`;
      record.Name = normalizedName;
      console.log(`Fecha normalizada de formato con guiones: "${normalizedName}"`);
    }
    
    // Normalizar formato de fecha: asegurar que tenga el formato DD/MM/YYYY o DD/MM/YY
    // Primero, manejar casos como D/M/YYYY donde faltan ceros iniciales
    let normalizedDateParts = normalizedName.split('/');
    if (normalizedDateParts.length === 3) {
      const day = normalizedDateParts[0].padStart(2, '0');
      const month = normalizedDateParts[1].padStart(2, '0');
      let year = normalizedDateParts[2];
      // Si el año tiene 4 dígitos, usar los últimos 2
      if (year.length > 2) {
        year = year.substring(0, 4); // Asegurar que no tenga más de 4 dígitos
      }
      normalizedName = `${day}/${month}/${year}`;
      console.log(`Fecha normalizada con ceros: "${normalizedName}"`);
    }
    
    // Extraer la fecha del campo Name (formato DD/MM/YYYY o DD/MM/YY)
    console.log(`Intentando extraer fecha de: "${normalizedName}"`);
    const dateMatch = normalizedName.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!dateMatch) {
      console.warn(`Formato de fecha inválido en línea ${i}: ${normalizedName}`);
      continue;
    }
    
    const [_, day, month, year] = dateMatch;
    console.log(`Fecha extraída: día=${day}, mes=${month}, año=${year}`);
    
    // Convertir año de 2 dígitos a 4 dígitos si es necesario
    const fullYear = year.length === 2 ? '20' + year : year;
    // Asegurar que día y mes siempre tengan 2 dígitos
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    const date = `${fullYear}-${paddedMonth}-${paddedDay}`;
    console.log(`Fecha ISO formateada: ${date}`);
    
    // Inicializar contadores por fecha si no existen
    if (!dateRecords[date]) {
      dateRecords[date] = {
        ok: 0,
        no: 0,
        na: 0
      };
    }
    
    // Generar un ID único para el registro
    // Usar un valor consistente para el ID, incluso si está vacío
    const itemId = record['Item ID (auto generated)'] || `auto-${i}`;
    const id = `${date}-${itemId}-${userId}`;
    
    // Crear el objeto de datos
    const item = {
      id,
      date,
      userId,
      fileName: fileKey,
      createdAt: new Date().toISOString(),
      rawData: record
    };
    
    // Procesar cada categoría y actualizar contadores
    categories.forEach(category => {
      // Normalizar el nombre de la categoría para manejar variaciones
      const normalizedCategory = category
        .replace(/,\s*/g, ' ') // Reemplazar comas por espacios
        .replace(/\s+/g, ' ')  // Normalizar espacios múltiples
        .trim();
      
      const value = record[category];
      // Usar el nombre normalizado para la clave de categoría
      item[`category_${normalizedCategory.replace(/\s+/g, '_')}`] = value;
      
      // Actualizar contadores
      if (value === 'OK') {
        summary.okCount++;
        summary.byCategory[category].ok++;
        dateRecords[date].ok++;
      } else if (value === 'NO') {
        summary.noCount++;
        summary.byCategory[category].no++;
        dateRecords[date].no++;
      } else if (value === 'N/A') {
        summary.naCount++;
        summary.byCategory[category].na++;
        dateRecords[date].na++;
      }
    });
    
    // Agregar comentario si existe y no está vacío
    const comment = record.Comments || record.Commentario;
    if (comment && comment.trim() !== '') {
      const commentWithDate = `[${record.Name}] ${comment}`;
      if (!summary.uniqueErrors.includes(commentWithDate)) {
        summary.uniqueErrors.push(commentWithDate);
      }
    }
    
    kpiData.push(item);
    summary.totalRecords++;
  }
  
  // Calcular tasas de cumplimiento (excluyendo N/A)
  const totalValid = summary.okCount + summary.noCount;
  summary.complianceRate = totalValid > 0 
    ? (summary.okCount / totalValid * 100).toFixed(2) 
    : "0.00";
  
  // Calcular tasas de cumplimiento por categoría (excluyendo N/A)
  Object.keys(summary.byCategory).forEach(category => {
    const categoryData = summary.byCategory[category];
    const total = categoryData.ok + categoryData.no;
    categoryData.complianceRate = total > 0 
      ? (categoryData.ok / total * 100).toFixed(2) 
      : "0.00";
  });
  
  // Calcular tasas de cumplimiento por fecha y generar tendencia (excluyendo N/A)
  Object.keys(dateRecords).forEach(date => {
    const dateData = dateRecords[date];
    const total = dateData.ok + dateData.no;
    const complianceRate = total > 0 
      ? (dateData.ok / total * 100).toFixed(2) 
      : "0.00";
    
    summary.byDate[date] = {
      ...dateData,
      complianceRate
    };
    
    summary.trend.push({
      date,
      complianceRate: parseFloat(complianceRate),
      ok: dateData.ok,
      no: dateData.no,
      na: dateData.na
    });
  });
  
  // Ordenar la tendencia por fecha
  summary.trend.sort((a, b) => a.date.localeCompare(b.date));
  
  // Verificar y corregir datos de tendencia
  summary.trend = summary.trend.map(item => {
    // Asegurar que todos los valores numéricos sean números
    return {
      ...item,
      complianceRate: parseFloat(item.complianceRate || 0),
      ok: parseInt(item.ok || 0, 10),
      no: parseInt(item.no || 0, 10),
      na: parseInt(item.na || 0, 10)
    };
  });
  
  console.log('Datos de tendencia generados:', JSON.stringify(summary.trend));
  
  return { kpiData, summary };
}

/**
 * Combina dos resúmenes de KPI
 */
function mergeSummaries(existingSummary, newSummary) {
  // Si no hay resumen existente, devolver el nuevo
  if (!existingSummary || Object.keys(existingSummary).length === 0) {
    return newSummary;
  }
  
  // Combinar contadores básicos
  const mergedSummary = {
    totalRecords: existingSummary.totalRecords + newSummary.totalRecords,
    okCount: existingSummary.okCount + newSummary.okCount,
    noCount: existingSummary.noCount + newSummary.noCount,
    naCount: existingSummary.naCount + newSummary.naCount,
    byCategory: {},
    byDate: {},
    trend: [],
    uniqueErrors: [...existingSummary.uniqueErrors]
  };
  
  // Calcular tasa de cumplimiento (excluyendo N/A)
  const totalValid = mergedSummary.okCount + mergedSummary.noCount;
  mergedSummary.complianceRate = totalValid > 0 
    ? (mergedSummary.okCount / totalValid * 100).toFixed(2) 
    : "0.00";
  
  // Combinar datos por categoría
  const allCategories = new Set([
    ...Object.keys(existingSummary.byCategory || {}),
    ...Object.keys(newSummary.byCategory || {})
  ]);
  
  allCategories.forEach(category => {
    const existingCat = existingSummary.byCategory[category] || { ok: 0, no: 0, na: 0 };
    const newCat = newSummary.byCategory[category] || { ok: 0, no: 0, na: 0 };
    
    const mergedCat = {
      ok: existingCat.ok + newCat.ok,
      no: existingCat.no + newCat.no,
      na: existingCat.na + newCat.na
    };
    
    // Calcular tasa de cumplimiento (excluyendo N/A)
    const totalCat = mergedCat.ok + mergedCat.no;
    mergedCat.complianceRate = totalCat > 0 
      ? (mergedCat.ok / totalCat * 100).toFixed(2) 
      : "0.00";
    
    mergedSummary.byCategory[category] = mergedCat;
  });
  
  // Combinar datos por fecha
  const allDates = new Set([
    ...Object.keys(existingSummary.byDate || {}),
    ...Object.keys(newSummary.byDate || {})
  ]);
  
  allDates.forEach(date => {
    const existingDate = existingSummary.byDate[date] || { ok: 0, no: 0, na: 0 };
    const newDate = newSummary.byDate[date] || { ok: 0, no: 0, na: 0 };
    
    const mergedDate = {
      ok: existingDate.ok + newDate.ok,
      no: existingDate.no + newDate.no,
      na: existingDate.na + newDate.na
    };
    
    // Calcular tasa de cumplimiento (excluyendo N/A)
    const totalDate = mergedDate.ok + mergedDate.no;
    mergedDate.complianceRate = totalDate > 0 
      ? (mergedDate.ok / totalDate * 100).toFixed(2) 
      : "0.00";
    
    mergedSummary.byDate[date] = mergedDate;
  });
  
  // Reconstruir la tendencia a partir de los datos combinados por fecha
  mergedSummary.trend = Object.entries(mergedSummary.byDate).map(([date, data]) => ({
    date,
    complianceRate: parseFloat(data.complianceRate || 0),
    ok: parseInt(data.ok || 0, 10),
    no: parseInt(data.no || 0, 10),
    na: parseInt(data.na || 0, 10)
  }));
  
  // Ordenar la tendencia por fecha
  mergedSummary.trend.sort((a, b) => a.date.localeCompare(b.date));
  console.log('Datos de tendencia combinados:', JSON.stringify(mergedSummary.trend));
  
  // Agregar nuevos comentarios únicos
  newSummary.uniqueErrors.forEach(error => {
    if (!mergedSummary.uniqueErrors.includes(error)) {
      mergedSummary.uniqueErrors.push(error);
    }
  });
  
  return mergedSummary;
}