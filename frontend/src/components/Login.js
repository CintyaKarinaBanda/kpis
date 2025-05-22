import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Grid,
  Link,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { login } from '../services/authServiceFactory';
import { completeNewPassword } from '../services/cognitoAuthService';
import Logo from './Logo';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para el modal de cambio de contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [tempUser, setTempUser] = useState(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      // Para desarrollo, permitir cualquier credencial
      // En producción, usar la función de login real
      // await login(formData.email, formData.password);
      
      // Simular login exitoso
      localStorage.setItem('token', 'dummy-token');
      
      setSuccess('Inicio de sesión exitoso');
      
      // Notificar al componente padre
      if (onLogin) {
        onLogin();
        console.log('Llamando a onLogin para autenticar al usuario');
      }
      
      // Redirigir al dashboard después de un breve retraso
      setTimeout(() => {
        navigate('/');
      }, 500);
      
    } catch (error) {
      console.error('Error:', error);
      
      // Verificar si es un error de cambio de contraseña requerido
      if (error.code === 'NEW_PASSWORD_REQUIRED') {
        setTempUser(error.user);
        setShowPasswordModal(true);
      } else {
        setError(error.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordChange = async () => {
    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    
    // Validar longitud mínima
    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    setPasswordError('');
    setLoading(true);
    
    try {
      // Completar el cambio de contraseña
      await completeNewPassword(tempUser, newPassword);
      
      setSuccess('Contraseña actualizada correctamente');
      setShowPasswordModal(false);
      
      // Notificar al componente padre
      if (onLogin) {
        onLogin();
      }
      
      // Redirigir al dashboard
      navigate('/');
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      setPasswordError(error.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <Logo size="large" />
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo electrónico"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Iniciar sesión'
              )}
            </Button>
            
            </Box>
        </Paper>
      </Box>
      
      {/* Modal de cambio de contraseña */}
      <Dialog open={showPasswordModal} onClose={() => !loading && setShowPasswordModal(false)}>
        <DialogTitle>Cambio de contraseña requerido</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Es necesario cambiar la contraseña temporal por una nueva.
          </DialogContentText>
          
          {passwordError && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {passwordError}
            </Alert>
          )}
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="newPassword"
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handlePasswordChange} 
            disabled={loading || !newPassword || !confirmPassword}
            color="primary"
          >
            {loading ? <CircularProgress size={24} /> : 'Cambiar contraseña'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Login;