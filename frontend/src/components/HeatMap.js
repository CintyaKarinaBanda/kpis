import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

const HeatMap = ({ data }) => {
  const theme = useTheme();
  
  // Extraer fechas y ordenarlas
  const dates = Object.keys(data).sort();
  
  // Si no hay datos, mostrar mensaje
  if (!dates.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography color="text.secondary">No hay datos disponibles para el mapa de calor</Typography>
      </Box>
    );
  }
  
  // Función para obtener el color según la tasa de cumplimiento
  const getColor = (rate) => {
    if (rate >= 90) return '#4caf50'; // Verde
    if (rate >= 70) return '#8bc34a'; // Verde claro
    if (rate >= 50) return '#ffeb3b'; // Amarillo
    if (rate >= 30) return '#ff9800'; // Naranja
    return '#f44336'; // Rojo
  };
  
  // Función para formatear la fecha
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };
  
  // Obtener el día de la semana
  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };
  
  return (
    <Box sx={{ height: '100%', overflowX: 'auto' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '90%' }}>
        {/* Leyenda */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Typography variant="caption" sx={{ mr: 1 }}>Tasa de cumplimiento:</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 15, height: 15, backgroundColor: '#f44336', mr: 0.5 }} />
            <Typography variant="caption" sx={{ mr: 1 }}>0-30%</Typography>
            
            <Box sx={{ width: 15, height: 15, backgroundColor: '#ff9800', mr: 0.5 }} />
            <Typography variant="caption" sx={{ mr: 1 }}>30-50%</Typography>
            
            <Box sx={{ width: 15, height: 15, backgroundColor: '#ffeb3b', mr: 0.5 }} />
            <Typography variant="caption" sx={{ mr: 1 }}>50-70%</Typography>
            
            <Box sx={{ width: 15, height: 15, backgroundColor: '#8bc34a', mr: 0.5 }} />
            <Typography variant="caption" sx={{ mr: 1 }}>70-90%</Typography>
            
            <Box sx={{ width: 15, height: 15, backgroundColor: '#4caf50', mr: 0.5 }} />
            <Typography variant="caption">90-100%</Typography>
          </Box>
        </Box>
        
        {/* Mapa de calor */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          {dates.map(date => {
            const dateData = data[date];
            const complianceRate = parseFloat(dateData.complianceRate);
            
            return (
              <Box
                key={date}
                sx={{
                  width: 80,
                  height: 80,
                  m: 0.5,
                  backgroundColor: getColor(complianceRate),
                  borderRadius: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: complianceRate > 50 ? 'rgba(0, 0, 0, 0.87)' : 'white',
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: 3
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  {formatDate(date)}
                </Typography>
                <Typography variant="caption">
                  {getDayOfWeek(date)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {complianceRate}%
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default HeatMap;