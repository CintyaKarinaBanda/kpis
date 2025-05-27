import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://f15rf7qk0g.execute-api.us-east-1.amazonaws.com/dev';
const TOKEN_KEY = 'kpi_dashboard_token';
const USER_KEY = 'kpi_dashboard_user';
const CONFIG_KEY = 'kpi_dashboard_config';

/**
 * Inicia sesión con email y contraseña
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise} - Promesa con la respuesta
 */
export const login = async (email, password) => {
  try {
    console.log('Intentando iniciar sesión con API URL:', API_URL);
    console.log('Modo:', process.env.NODE_ENV);
    console.log('Usar backend:', process.env.REACT_APP_USE_BACKEND);
    
    // Para desarrollo local, permitir inicio de sesión sin backend
    if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_BACKEND !== 'true') {
      console.log('Modo desarrollo: Simulando inicio de sesión');
      
      // Simular un retraso
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Crear un usuario de demostración
      const demoUser = {
        userId: '1',
        email: email || 'admin@example.com',
        name: 'Usuario Demo',
        role: 'admin'
      };
      
      // Crear un token simulado
      const token = 'demo-token-' + Date.now();
      
      // Guardar en localStorage
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
      
      return {
        token,
        user: demoUser
      };
    }
    
    // Inicio de sesión real con el backend
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    // Guardar token y datos del usuario
    localStorage.setItem(TOKEN_KEY, response.data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    
    return response.data;
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    
    // Si estamos en desarrollo y el error es de conexión, simular inicio de sesión
    if (process.env.NODE_ENV === 'development' && 
        (error.code === 'ECONNREFUSED' || error.message.includes('Network Error'))) {
      console.log('Error de conexión en desarrollo, simulando inicio de sesión');
      
      // Crear un usuario de demostración
      const demoUser = {
        userId: '1',
        email: email || 'admin@example.com',
        name: 'Usuario Demo',
        role: 'admin'
      };
      
      // Crear un token simulado
      const token = 'demo-token-' + Date.now();
      
      // Guardar en localStorage
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
      
      return {
        token,
        user: demoUser
      };
    }
    
    throw error.response?.data || error;
  }
};

/**
 * Registra un nuevo usuario
 * @param {string} name - Nombre del usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise} - Promesa con la respuesta
 */
export const register = async (name, email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      name,
      email,
      password
    });
    
    // Guardar token y datos del usuario
    localStorage.setItem(TOKEN_KEY, response.data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    
    return response.data;
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    throw error.response?.data || error;
  }
};

/**
 * Cierra la sesión del usuario
 */
export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} - true si el usuario está autenticado
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem(TOKEN_KEY);
};

/**
 * Obtiene el token de autenticación
 * @returns {string|null} - Token de autenticación o null
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Obtiene el ID del usuario
 * @returns {string|null} - ID del usuario o null
 */
export const getUserId = () => {
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;
  
  try {
    const userData = JSON.parse(user);
    return userData.userId;
  } catch (error) {
    console.error('Error al obtener ID de usuario:', error);
    return null;
  }
};

/**
 * Obtiene los headers de autenticación
 * @returns {Object} - Headers de autenticación
 */
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Obtiene la configuración del usuario
 * @returns {Object} - Configuración del usuario
 */
export const getUserConfig = () => {
  const config = localStorage.getItem(CONFIG_KEY);
  if (!config) {
    return {
      dashboard: {
        visibleWidgets: ['kpiCards', 'trendChart', 'barChart']
      },
      appearance: {
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        logoUrl: ''
      },
      notifications: {
        email: true,
        dashboard: true
      }
    };
  }
  
  try {
    return JSON.parse(config);
  } catch (error) {
    console.error('Error al obtener configuración de usuario:', error);
    return {};
  }
};

/**
 * Actualiza la configuración del usuario
 * @param {Object} config - Nueva configuración
 * @returns {boolean} - true si se actualizó correctamente
 */
export const updateUserConfig = (config) => {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Error al actualizar configuración de usuario:', error);
    return false;
  }
};