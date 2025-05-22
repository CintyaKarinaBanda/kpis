import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const SimpleVersion = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard de KPIs Operativos
        </Typography>
        <Typography>
          Versión simplificada para pruebas de compilación.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SimpleVersion;