import React from 'react';
import { Box, Typography } from '@mui/material';
import logoImage from '../assets/logo.png';

const Logo = ({ size = 'medium', showText = true }) => {
  // Tamaños aumentados
  const logoHeight = size === 'small' ? '80px' : size === 'medium' ? '100px' : '120px';
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <img 
        src={logoImage} 
        alt="Logo" 
        style={{ 
          height: logoHeight,
          marginRight: '12px'
        }} 
      />
      {showText && (
        <Typography 
          variant="h6"
          component="span"
          sx={{ fontSize: size === 'small' ? '1rem' : size === 'medium' ? '1.2rem' : '1.4rem' }}
        >
          KPI Dashboard
        </Typography>
      )}
    </Box>
  );
};

export default Logo;