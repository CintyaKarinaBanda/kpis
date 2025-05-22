// Servicio de autenticación simplificado para desarrollo
// En producción, este servicio se conectaría con el backend real

// Simular un retraso de red
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para iniciar sesión
export const login = async (email, password) => {
  try {
    // Simular una llamada a la API
    await delay(500);
    
    // En desarrollo, aceptar cualquier credencial
    // En producción, validar contra el backend
    
    // Guardar token en localStorage
    localStorage.setItem('token', 'dummy-token');
    localStorage.setItem('user', JSON.stringify({ email }));
    
    return { success: true };
  } catch (error) {
    console.error('Error en login:', error);
    throw new Error('Error al iniciar sesión');
  }
};

// Función para cerrar sesión
export const logout = async () => {
  try {
    // Simular una llamada a la API
    await delay(300);
    
    // Eliminar token y datos de usuario
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    return { success: true };
  } catch (error) {
    console.error('Error en logout:', error);
    throw new Error('Error al cerrar sesión');
  }
};

// Función para verificar si el usuario está autenticado
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

// Función para obtener el usuario actual
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};