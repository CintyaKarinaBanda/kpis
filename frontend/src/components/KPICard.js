import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

const KPICard = ({ title, value, icon, color }) => {
  // Seleccionar el icono según el tipo
  const getIcon = () => {
    switch (icon) {
      case 'compliance':
        return <TrendingUpIcon sx={{ fontSize: 40, color }} />;
      case 'check':
        return <CheckCircleIcon sx={{ fontSize: 40, color }} />;
      case 'error':
        return <CancelIcon sx={{ fontSize: 40, color }} />;
      case 'total':
      default:
        return <AssessmentIcon sx={{ fontSize: 40, color }} />;
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `4px solid ${color}`,
        borderRadius: '4px'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
        {getIcon()}
      </Box>
      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
        {value}
      </Typography>
    </Paper>
  );
};

export default KPICard;