const fs = require('fs');
const path = require('path');
const { processCSV, deleteCSVData } = require('../utils/csvProcessor');

// Directorio para almacenar archivos CSV
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Asegurar que el directorio uploads existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Controlador para subir archivos CSV
exports.uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }
    
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileKey = req.file.filename;
    const fileSize = req.file.size;
    
    // Procesar el archivo CSV
    const result = await processCSV(filePath, fileKey);
    
    res.json({
      message: 'Archivo CSV subido y procesado correctamente',
      file: {
        name: fileName,
        key: fileKey,
        size: fileSize,
        lastModified: new Date().toISOString()
      },
      summary: result.summary
    });
  } catch (error) {
    console.error('Error al subir archivo CSV:', error);
    res.status(500).json({ error: 'Error al procesar el archivo CSV' });
  }
};

// Controlador para obtener la lista de archivos CSV
exports.getCSVFiles = (req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(file => file.endsWith('.csv'))
      .map(file => {
        const filePath = path.join(UPLOADS_DIR, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          key: file,
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        };
      });
    
    res.json({ files });
  } catch (error) {
    console.error('Error al obtener archivos CSV:', error);
    res.status(500).json({ error: 'Error al obtener la lista de archivos CSV' });
  }
};

// Controlador para obtener una vista previa de un archivo CSV
exports.getCSVPreview = (req, res) => {
  try {
    const { key } = req.params;
    const filePath = path.join(UPLOADS_DIR, key);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    // Leer las primeras 10 líneas del archivo
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').slice(0, 10);
    
    res.json({ preview: lines });
  } catch (error) {
    console.error('Error al obtener vista previa del CSV:', error);
    res.status(500).json({ error: 'Error al obtener vista previa del archivo CSV' });
  }
};

// Controlador para eliminar un archivo CSV
exports.deleteCSVFile = async (req, res) => {
  try {
    const { key } = req.params;
    const filePath = path.join(UPLOADS_DIR, key);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    // Eliminar el archivo físico
    fs.unlinkSync(filePath);
    
    // Eliminar los datos asociados al archivo
    const result = await deleteCSVData(key);
    
    if (result.success) {
      res.json({ 
        message: 'Archivo eliminado correctamente',
        summary: result.summary
      });
    } else {
      res.json({ 
        message: 'Archivo eliminado, pero no se encontraron datos asociados',
        summary: result.summary
      });
    }
  } catch (error) {
    console.error('Error al eliminar archivo CSV:', error);
    res.status(500).json({ error: 'Error al eliminar el archivo CSV' });
  }
};