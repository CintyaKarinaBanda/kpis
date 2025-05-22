import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { mondayService } from '../services/mondayService';
import MondayDebug from './MondayDebug';

const MondayIntegration = () => {
  // Estados
  const [loading, setLoading] = useState(false);
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [boardData, setBoardData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [dashboardCategories, setDashboardCategories] = useState([
    'Name',
    'Ventas por Tienda y Division',
    'Ventas Presidencia',
    'Operativo Diario',
    'Indicadores Presidencia',
    'Tendencia Firme / No Firme',
    'Ecommerce',
    'Outlet',
    'Ventas Viajes Palacio',
    'Ventas Restaurantes',
    'Operativo Mensual',
    'Operativo Fin de Semana y Semanal',
    'Operativo Anual',
    'Item ID (auto generated)',
    'Commentario'
  ]);
  const [newBoardId, setNewBoardId] = useState('');
  const [transformedData, setTransformedData] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [showDebugger, setShowDebugger] = useState(false);

  // Cargar tableros configurados al iniciar
  useEffect(() => {
    loadConfiguredBoards();
  }, []);

  // Cargar tableros configurados
  const loadConfiguredBoards = async () => {
    try {
      setLoading(true);
      const boardsList = await mondayService.getConfiguredBoards();
      setBoards(boardsList);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar tableros:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar tableros configurados',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Manejar cambio de tablero seleccionado
  const handleBoardChange = async (event) => {
    const boardId = event.target.value;
    setSelectedBoard(boardId);

    if (boardId) {
      try {
        setLoading(true);
        // Cargar datos del tablero
        const data = await mondayService.getBoardData(boardId);
        setBoardData(data);

        // Cargar mapeo de columnas
        const mapping = await mondayService.getColumnMapping(boardId);
        setColumnMapping(mapping);

        // Extraer columnas disponibles del tablero
        if (data && data.columns && data.columns.length > 0) {
          // Mapear directamente el array de columnas - NO ACCEDAS a data.columns[0].column_values
          const columns = data.columns.map(col => ({
            id: col.id,
            title: col.title
          }));
          setAvailableColumns(columns);
        }


        setLoading(false);
      } catch (error) {
        console.error('Error al cargar datos del tablero:', error);
        setSnackbar({
          open: true,
          message: 'Error al cargar datos del tablero',
          severity: 'error'
        });
        setLoading(false);
      }
    } else {
      setBoardData(null);
      setColumnMapping({});
      setAvailableColumns([]);
    }
  };

  // Abrir diálogo de mapeo de columnas
  const handleOpenMappingDialog = () => {
    setMappingDialogOpen(true);
  };

  // Cerrar diálogo de mapeo de columnas
  const handleCloseMappingDialog = () => {
    setMappingDialogOpen(false);
  };

  // Guardar mapeo de columnas
  const handleSaveMapping = async () => {
    try {
      setLoading(true);
      await mondayService.configureColumnMapping(
        selectedBoard,
        boardData.name,
        columnMapping
      );
      setMappingDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Mapeo de columnas guardado correctamente',
        severity: 'success'
      });
      setLoading(false);
    } catch (error) {
      console.error('Error al guardar mapeo:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar mapeo de columnas',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Actualizar mapeo de columnas
  const handleMappingChange = (columnId, category) => {
    setColumnMapping(prev => ({
      ...prev,
      [columnId]: category
    }));
  };

  // Agregar nuevo tablero
  const handleAddBoard = async () => {
    if (!newBoardId) {
      setSnackbar({
        open: true,
        message: 'Por favor, ingresa un ID de tablero válido',
        severity: 'warning'
      });
      return;
    }

    try {
      setLoading(true);
      console.log(`Intentando agregar tablero con ID: ${newBoardId}`);
      const data = await mondayService.getBoardData(newBoardId);
      console.log('Datos del tablero recibidos:', data);
      setBoardData(data);
      setSelectedBoard(newBoardId);

      // Extraer columnas disponibles del tablero
      if (data && data.columns && data.columns.length > 0) {
        // Mapear directamente el array de columnas - NO ACCEDAS a data.columns[0].column_values
        const columns = data.columns.map(col => ({
          id: col.id,
          title: col.title
        }));
        setAvailableColumns(columns);
      }

      // Abrir diálogo de mapeo
      setMappingDialogOpen(true);
      setNewBoardId('');
      setLoading(false);

      // Actualizar lista de tableros
      await loadConfiguredBoards();
    } catch (error) {
      console.error('Error al agregar tablero:', error);
      setSnackbar({
        open: true,
        message: `Error al agregar tablero: ${error.message || 'Verifica el ID y tu API key'}`,
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Obtener datos transformados
  const handleGetTransformedData = async () => {
    try {
      setLoading(true);
      const result = await mondayService.getTransformedData(selectedBoard);
      setTransformedData(result.transformedData || []);
      setSnackbar({
        open: true,
        message: 'Datos transformados obtenidos correctamente',
        severity: 'success'
      });
      setLoading(false);
    } catch (error) {
      console.error('Error al obtener datos transformados:', error);
      setSnackbar({
        open: true,
        message: 'Error al obtener datos transformados',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Importar datos al dashboard
  const handleImportToDashboard = async () => {
    try {
      setLoading(true);
      const result = await mondayService.importToDashboard(selectedBoard);
      setSnackbar({
        open: true,
        message: `Datos importados correctamente: ${result.importResult?.message || 'Operación exitosa'}`,
        severity: 'success'
      });
      setLoading(false);
    } catch (error) {
      console.error('Error al importar datos al dashboard:', error);
      setSnackbar({
        open: true,
        message: 'Error al importar datos al dashboard',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Cerrar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  // Alternar depurador
  const toggleDebugger = () => {
    setShowDebugger(!showDebugger);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Integración con Monday.com
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Botón para mostrar/ocultar depurador */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={toggleDebugger}
          size="small"
        >
          {showDebugger ? 'Ocultar Depurador' : 'Mostrar Depurador'}
        </Button>
      </Box>

      {/* Herramienta de depuración */}
      {showDebugger && <MondayDebug />}

      {/* Sección para agregar nuevo tablero */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Agregar nuevo tablero
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label="ID del tablero"
            value={newBoardId}
            onChange={(e) => setNewBoardId(e.target.value)}
            fullWidth
            helperText="Ingresa el ID numérico del tablero de Monday.com"
          />
          <Button
            variant="contained"
            onClick={handleAddBoard}
            disabled={loading || !newBoardId}
          >
            {loading ? <CircularProgress size={24} /> : 'Agregar'}
          </Button>
        </Box>
      </Paper>

      {/* Sección para seleccionar tablero existente */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Tableros configurados
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Seleccionar tablero</InputLabel>
          <Select
            value={selectedBoard}
            onChange={handleBoardChange}
            label="Seleccionar tablero"
            disabled={loading}
          >
            <MenuItem value="">
              <em>Selecciona un tablero</em>
            </MenuItem>
            {boards.map((board) => (
              <MenuItem key={board.id} value={board.id}>
                {board.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedBoard && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleOpenMappingDialog}
              disabled={loading || !boardData}
            >
              Configurar mapeo de columnas
            </Button>
            <Button
              variant="outlined"
              onClick={handleGetTransformedData}
              disabled={loading || !boardData || Object.keys(columnMapping).length === 0}
            >
              Ver datos transformados
            </Button>
            <Button
              variant="contained"
              onClick={handleImportToDashboard}
              disabled={loading || !boardData || Object.keys(columnMapping).length === 0}
              color="primary"
            >
              Importar al dashboard
            </Button>
          </Box>
        )}
      </Paper>

      {/* Vista previa de datos transformados */}
      {transformedData.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Vista previa de datos transformados
          </Typography>

          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {Object.keys(transformedData[0]).map((header) => (
                    <TableCell key={header}>{header}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {transformedData.map((row, index) => (
                  <TableRow key={index}>
                    {Object.keys(transformedData[0]).map((header) => (
                      <TableCell key={`${index}-${header}`}>{row[header]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Diálogo para configurar mapeo de columnas */}
      <Dialog
        open={mappingDialogOpen}
        onClose={handleCloseMappingDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Configurar mapeo de columnas</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Selecciona qué columna de Monday.com corresponde a cada categoría del dashboard
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Categoría del Dashboard</TableCell>
                  <TableCell>Columna en Monday.com</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardCategories.map((category) => (
                  <TableRow key={category}>
                    <TableCell>{category}</TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={Object.entries(columnMapping).find(([_, val]) => val === category)?.[0] || ''}
                          onChange={(e) => handleMappingChange(e.target.value, category)}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>No mapear</em>
                          </MenuItem>
                          {availableColumns.map((column) => (
                            <MenuItem key={column.id} value={column.id}>
                              {column.title}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMappingDialog}>Cancelar</Button>
          <Button
            onClick={handleSaveMapping}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MondayIntegration;