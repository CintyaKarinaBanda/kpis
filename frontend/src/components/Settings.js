import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';

const Settings = ({ userConfig: propConfig, onConfigChange }) => {
  // Estado inicial con valores por defecto
  const defaultConfig = {
    theme: 'light',
    dashboard: {
      visibleWidgets: ['kpiCards', 'trendChart', 'barChart']
    }
  };
  
  const [config, setConfig] = useState(defaultConfig);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Cargar configuración inicial
  useEffect(() => {
    if (propConfig) {
      setConfig(propConfig);
    }
  }, [propConfig]);
  
  // Asegurar que config.dashboard.visibleWidgets siempre sea un array
  useEffect(() => {
    if (!config.dashboard || !Array.isArray(config.dashboard.visibleWidgets)) {
      console.warn('Configuración inválida detectada, restaurando valores por defecto');
      setConfig(prevConfig => ({
        ...prevConfig,
        dashboard: {
          ...prevConfig.dashboard,
          visibleWidgets: defaultConfig.dashboard.visibleWidgets
        }
      }));
    }
  }, [config]);

  // Manejar cambio en widgets visibles
  const handleWidgetChange = (widget) => {
    const currentWidgets = [...(config.dashboard?.visibleWidgets || [])];
    const index = currentWidgets.indexOf(widget);
    
    if (index === -1) {
      currentWidgets.push(widget);
    } else {
      currentWidgets.splice(index, 1);
    }
    
    const newConfig = {
      ...config,
      dashboard: {
        ...config.dashboard,
        visibleWidgets: currentWidgets
      }
    };
    
    setConfig(newConfig);
  };

  // Guardar configuración
  const handleSave = () => {
    try {
      if (onConfigChange) {
        onConfigChange(config);
      }
      
      setSnackbar({
        open: true,
        message: 'Configuración guardada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la configuración',
        severity: 'error'
      });
    }
  };

  // Restablecer configuración por defecto
  const handleReset = () => {
    setConfig(defaultConfig);
    
    if (onConfigChange) {
      onConfigChange(defaultConfig);
    }
    
    setSnackbar({
      open: true,
      message: 'Configuración restablecida a valores por defecto',
      severity: 'info'
    });
  };

  // Cerrar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Widgets Visibles
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Selecciona los widgets que deseas mostrar en el dashboard.
        </Typography>
        
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={config.dashboard?.visibleWidgets?.includes('kpiCards') || false}
                onChange={() => handleWidgetChange('kpiCards')}
              />
            }
            label="Tarjetas de KPI"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={config.dashboard?.visibleWidgets?.includes('trendChart') || false}
                onChange={() => handleWidgetChange('trendChart')}
              />
            }
            label="Tendencia de Cumplimiento"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={config.dashboard?.visibleWidgets?.includes('barChart') || false}
                onChange={() => handleWidgetChange('barChart')}
              />
            }
            label="Tasa de Cumplimiento por Categoría"
          />

        </FormGroup>
      </Paper>
      
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined" 
          color="error" 
          onClick={handleReset}
        >
          Restablecer valores por defecto
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSave}
        >
          Guardar configuración
        </Button>
      </Box>
      
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

export default Settings;