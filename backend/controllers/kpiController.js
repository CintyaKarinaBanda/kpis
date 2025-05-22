const fs = require('fs');
const path = require('path');

// Archivo para almacenar datos KPI (simulando una base de datos)
const KPI_DATA_FILE = path.join(__dirname, '../data/kpi_data.json');
const COMMENTS_FILE = path.join(__dirname, '../data/comments.json');

// Inicializar archivos si no existen
if (!fs.existsSync(KPI_DATA_FILE)) {
  fs.writeFileSync(KPI_DATA_FILE, JSON.stringify({
    data: [],
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
  }));
}

if (!fs.existsSync(COMMENTS_FILE)) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify({
    comments: []
  }));
}

// Cargar datos KPI
const loadKPIData = () => {
  try {
    const data = fs.readFileSync(KPI_DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al cargar datos KPI:', error);
    return { data: [], summary: {} };
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

// Cargar comentarios
const loadComments = () => {
  try {
    const data = fs.readFileSync(COMMENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al cargar comentarios:', error);
    return { comments: [] };
  }
};

// Guardar comentarios
const saveComments = (data) => {
  try {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error al guardar comentarios:', error);
    return false;
  }
};

// Controlador para obtener datos KPI
exports.getKPIData = (req, res) => {
  try {
    const { userId, startDate, endDate, category } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere ID de usuario' });
    }
    
    const { data } = loadKPIData();
    
    // Filtrar datos por usuario
    let filteredData = data.filter(item => item.userId === userId);
    
    // Filtrar por fecha si se proporciona
    if (startDate && endDate) {
      filteredData = filteredData.filter(item => 
        item.date >= startDate && item.date <= endDate
      );
    }
    
    // Filtrar por categoría si se proporciona
    if (category) {
      const categoryKey = `category_${category.replace(/\\s+/g, '_')}`;
      filteredData = filteredData.filter(item => 
        item[categoryKey] === 'OK'
      );
    }
    
    res.json({ data: filteredData });
  } catch (error) {
    console.error('Error al obtener datos KPI:', error);
    res.status(500).json({ error: 'Error al obtener datos KPI' });
  }
};

// Controlador para obtener resumen de KPI
exports.getKPISummary = (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const { summary } = loadKPIData();
    
    // Si no hay fechas, devolver el resumen completo
    if (!startDate || !endDate) {
      return res.json({ summary });
    }
    
    // Filtrar tendencia por fecha
    const filteredTrend = summary.trend.filter(
      item => item.date >= startDate && item.date <= endDate
    );
    
    // Filtrar fechas en byDate
    const filteredByDate = {};
    Object.keys(summary.byDate).forEach(date => {
      if (date >= startDate && date <= endDate) {
        filteredByDate[date] = summary.byDate[date];
      }
    });
    
    // Crear un resumen filtrado
    const filteredSummary = {
      ...summary,
      trend: filteredTrend,
      byDate: filteredByDate
    };
    
    res.json({ summary: filteredSummary });
  } catch (error) {
    console.error('Error al obtener resumen de KPI:', error);
    res.status(500).json({ error: 'Error al obtener resumen de KPI' });
  }
};

// Controlador para agregar un comentario
exports.addComment = (req, res) => {
  try {
    const { userId, userName, date, comment } = req.body;
    
    if (!userId || !date || !comment) {
      return res.status(400).json({ error: 'Se requiere ID de usuario, fecha y comentario' });
    }
    
    const data = loadComments();
    
    const newComment = {
      id: `comment-${Date.now()}`,
      userId,
      userName: userName || 'Usuario',
      date,
      comment,
      createdAt: new Date().toISOString()
    };
    
    data.comments.unshift(newComment);
    
    if (saveComments(data)) {
      res.json({
        message: 'Comentario agregado correctamente',
        comment: newComment
      });
    } else {
      res.status(500).json({ error: 'Error al guardar el comentario' });
    }
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({ error: 'Error al agregar comentario' });
  }
};

// Controlador para obtener comentarios
exports.getComments = (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;
    
    const { comments } = loadComments();
    
    // Filtrar por fecha si se proporciona
    let filteredComments = [...comments];
    if (startDate && endDate) {
      filteredComments = filteredComments.filter(
        comment => comment.date >= startDate && comment.date <= endDate
      );
    }
    
    // Limitar resultados
    filteredComments = filteredComments.slice(0, parseInt(limit));
    
    res.json({ comments: filteredComments });
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
};