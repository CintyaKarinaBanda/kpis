const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Clave secreta para JWT (en producción, usar variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'kpi-dashboard-secret-key';

// Archivo para almacenar usuarios (simulando una base de datos)
const USERS_FILE = path.join(__dirname, '../data/users.json');

// Asegurar que el directorio data existe
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inicializar archivo de usuarios si no existe
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({
    users: [
      {
        userId: '1',
        email: 'admin@example.com',
        password: 'admin123', // En producción, usar hash
        name: 'Administrador',
        role: 'admin'
      }
    ]
  }));
}

// Cargar usuarios
const loadUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    return { users: [] };
  }
};

// Guardar usuarios
const saveUsers = (data) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error al guardar usuarios:', error);
    return false;
  }
};

// Controlador de autenticación
exports.login = (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  
  const { users } = loadUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  
  // Generar token JWT
  const token = jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Devolver información del usuario (sin la contraseña)
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    message: 'Inicio de sesión exitoso',
    token,
    user: userWithoutPassword
  });
};

exports.register = (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }
  
  const data = loadUsers();
  
  // Verificar si el usuario ya existe
  if (data.users.some(u => u.email === email)) {
    return res.status(409).json({ error: 'El email ya está registrado' });
  }
  
  // Crear nuevo usuario
  const newUser = {
    userId: Date.now().toString(),
    email,
    password, // En producción, usar hash
    name,
    role: 'user'
  };
  
  data.users.push(newUser);
  
  if (saveUsers(data)) {
    // Generar token JWT
    const token = jwt.sign(
      { userId: newUser.userId, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Devolver información del usuario (sin la contraseña)
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: userWithoutPassword
    });
  } else {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};