import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { formatFileSize, formatDate } from '../utils/formatters';
import { csvService } from '../services/serviceConfig';

const CSVUploader = ({ onUploadComplete }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [csvFiles, setCsvFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewFileName, setPreviewFileName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Cargar la lista de archivos CSV al montar el componente
  useEffect(() => {
    loadCSVFiles();
  }, []);

  const loadCSVFiles = async () => {
    try {
      setLoading(true);
      console.log('Solicitando lista de archivos CSV...');
      
      const response = await csvService.getCSVFiles();
      console.log('Archivos CSV cargados:', response);
      setCsvFiles(response.files || []);
    } catch (error) {
      console.error('Error al cargar archivos CSV:', error);
      console.error('Detalles del error:', error.response || error.message || error);
      setSnackbar({
        open: true,
        message: `Error al cargar la lista de archivos: ${error.message || 'Error de conexión'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(acceptedFiles => {
    // Solo aceptar archivos CSV
    const csvFiles = acceptedFiles.filter(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      setSnackbar({
        open: true,
        message: 'Solo se permiten archivos CSV',
        severity: 'error'
      });
      return;
    }
    
    setFiles(csvFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    }
  });

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadStatus('uploading');
    
    try {
      for (const file of files) {
        console.log(`Procesando archivo: ${file.name}`);
        
        const response = await csvService.uploadCSV(file);
        console.log('Respuesta de procesamiento:', response);
      }
      
      setUploadStatus('success');
      setSnackbar({
        open: true,
        message: 'Archivos procesados correctamente',
        severity: 'success'
      });
      
      // Recargar la lista de archivos
      await loadCSVFiles();
      
      // Notificar al componente padre con un retraso para asegurar que los datos se han procesado
      if (onUploadComplete) {
        console.log('Notificando carga completa al componente padre');
        setTimeout(() => {
          onUploadComplete();
        }, 1000);
      }
      
      // Limpiar la lista de archivos seleccionados
      setFiles([]);
    } catch (error) {
      console.error('Error al procesar archivos:', error);
      console.error('Detalles del error:', error.response || error.message || error);
      setUploadStatus('error');
      setSnackbar({
        open: true,
        message: `Error al procesar los archivos: ${error.message || 'Error desconocido'}`,
        severity: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (key, fileName) => {
    try {
      setPreviewFileName(fileName);
      const response = await csvService.getCSVPreview(key);
      
      // Convertir las líneas de texto en un array de arrays
      const parsedData = response.preview.map(line => line.split(','));
      
      setPreviewData(parsedData);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Error al obtener vista previa:', error);
      setSnackbar({
        open: true,
        message: 'Error al obtener vista previa del archivo',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (key) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      return;
    }
    
    try {
      await csvService.deleteCSVFile(key);
      
      setSnackbar({
        open: true,
        message: 'Archivo eliminado correctamente',
        severity: 'success'
      });
      
      // Recargar la lista de archivos
      await loadCSVFiles();
      
      // Notificar al componente padre
      if (onUploadComplete) {
        console.log('Notificando eliminación al componente padre');
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      setSnackbar({
        open: true,
        message: 'Error al eliminar el archivo',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Área de arrastrar y soltar */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.400',
          backgroundColor: isDragActive ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        
        {isDragActive ? (
          <Typography variant="h6" color="primary">
            Suelta los archivos CSV aquí...
          </Typography>
        ) : (
          <Typography variant="h6">
            Arrastra y suelta archivos CSV aquí, o haz clic para seleccionar
          </Typography>
        )}
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Solo se aceptan archivos CSV
        </Typography>
      </Paper>

      {/* Lista de archivos seleccionados */}
      {files.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Archivos seleccionados:
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell align="right">Tamaño</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.name}>
                    <TableCell>{file.name}</TableCell>
                    <TableCell align="right">{formatFileSize(file.size)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              disabled={uploading}
              startIcon={
                uploading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : uploadStatus === 'success' ? (
                  <CheckIcon />
                ) : uploadStatus === 'error' ? (
                  <ErrorIcon />
                ) : (
                  <CloudUploadIcon />
                )
              }
            >
              {uploading
                ? 'Procesando...'
                : uploadStatus === 'success'
                ? 'Procesado'
                : uploadStatus === 'error'
                ? 'Error'
                : 'Procesar'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Historial de archivos */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Historial de archivos
        </Typography>
        
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={loadCSVFiles}
          disabled={loading}
          size="small"
        >
          Actualizar
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : csvFiles.length === 0 ? (
        <Alert severity="info">No hay archivos CSV cargados</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell align="right">Tamaño</TableCell>
                <TableCell align="right">Fecha</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {csvFiles.map((file) => (
                <TableRow key={file.key}>
                  <TableCell>{file.name}</TableCell>
                  <TableCell align="right">{formatFileSize(file.size)}</TableCell>
                  <TableCell align="right">{formatDate(file.lastModified)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handlePreview(file.key, file.name)}
                      title="Ver vista previa"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(file.key)}
                      title="Eliminar archivo"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Diálogo de vista previa */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Vista previa: {previewFileName}
        </DialogTitle>
        <DialogContent dividers>
          {previewData.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {previewData[0].map((cell, index) => (
                      <TableCell key={index}>{cell}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.slice(1).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>No hay datos para mostrar</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
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

export default CSVUploader;