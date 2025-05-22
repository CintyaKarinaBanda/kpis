const express = require('express');
const mondayController = require('../controllers/mondayController');

const router = express.Router();

// Rutas para la integración con Monday.com
router.get('/boards', mondayController.listConfiguredBoards);
router.get('/board/:boardId', mondayController.getMondayBoardData);
router.get('/board/:boardId/mapping', mondayController.getColumnMapping);
router.post('/board/:boardId/mapping', mondayController.configureColumnMapping);
router.get('/board/:boardId/data', mondayController.getTransformedData);
router.post('/board/:boardId/import', mondayController.importToKPIDashboard);
router.get('/files', mondayController.getFile);

module.exports = router;