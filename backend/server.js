require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configuración de la aplicación
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Solo se permiten archivos CSV'));
    }
    cb(null, true);
  }
});

// Importar controladores
const authController = require('./controllers/authController');
const csvController = require('./controllers/csvController');
const kpiController = require('./controllers/kpiController');

// Importar rutas
const mondayRoutes = require('./api/mondayRoutes');

// Rutas de autenticación
app.post('/auth/login', authController.login);
app.post('/auth/register', authController.register);

// Rutas para archivos CSV
app.post('/csv/upload', upload.single('file'), csvController.uploadCSV);
app.get('/csv/files', csvController.getCSVFiles);
app.get('/csv/preview/:key', csvController.getCSVPreview);
app.delete('/csv/files/:key', csvController.deleteCSVFile);

// Rutas para datos KPI
app.post('/api/kpi/data', kpiController.getKPIData);
app.post('/api/kpi/summary', kpiController.getKPISummary);
app.post('/api/comments', kpiController.addComment);
app.get('/api/comments', kpiController.getComments);

// Rutas para integración con Monday.com
app.use('/api/monday', mondayRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API de KPI Dashboard funcionando correctamente' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});