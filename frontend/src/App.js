import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MainLayout from './components/MainLayout';
import Dashboard from './components/Dashboard';
import CSVUploader from './components/CSVUploader';
import Settings from './components/Settings';
import Login from './components/Login';
import MondayIntegration from './components/MondayIntegration';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userConfig, setUserConfig] = useState({
    dashboard: {
      visibleWidgets: ['kpiCards', 'trendChart', 'barChart']
    }
  });

  // Comprobar si el usuario está autenticado al cargar la aplicación
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Token encontrado en localStorage, autenticando usuario');
      setIsAuthenticated(true);
    } else {
      console.log('No se encontró token en localStorage');
      setIsAuthenticated(false);
    }
  }, []);

  // Función para manejar el inicio de sesión
  const handleLogin = () => {
    localStorage.setItem('token', 'dummy-token'); // Guardar un token en localStorage
    setIsAuthenticated(true);
    console.log('Usuario autenticado correctamente desde App.js');
  };

  // Función para manejar el cierre de sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    console.log('Usuario cerró sesión correctamente');
  };

  // Función para actualizar la configuración del usuario
  const updateUserConfig = (newConfig) => {
    setUserConfig(prevConfig => ({
      ...prevConfig,
      ...newConfig
    }));
    
    // En una aplicación real, aquí se guardaría la configuración en el backend
    localStorage.setItem('userConfig', JSON.stringify({
      ...userConfig,
      ...newConfig
    }));
  };

  // Cargar configuración del usuario desde localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('userConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setUserConfig(parsedConfig);
      } catch (error) {
        console.error('Error al parsear la configuración del usuario:', error);
      }
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {isAuthenticated ? (
          <MainLayout onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Dashboard userConfig={userConfig} />} />
              <Route path="/upload" element={<CSVUploader />} />
              <Route path="/monday" element={<MondayIntegration />} />
              <Route path="/settings" element={<Settings userConfig={userConfig} onUpdateConfig={updateUserConfig} />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MainLayout>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </Router>
    </ThemeProvider>
  );
}

export default App;