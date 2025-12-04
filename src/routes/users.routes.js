const router = require('express').Router();
const {
  getUsers,
  getUserById,
  getUserByEmail,
  getUserByQR,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  getQRImage,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  getCurrentUser
} = require('../controllers/users.controller');

// Obtener todos los usuarios
router.get('/', getUsers);

// Login de usuario
router.post('/login', loginUser);

// Obtener usuario actual (autenticado)
router.get('/me', getCurrentUser);

// Obtener usuario por correo
router.get('/email/:correo', getUserByEmail);

// Obtener imagen QR
router.get('/qr-image/:id', getQRImage);

// Obtener usuario por QR
router.get('/qr/:qr', getUserByQR);

// Solicitar reset de contraseña
router.post('/forgot-password', forgotPassword);

// Reset de contraseña con token
router.post('/reset-password', resetPassword);

// Verificar token de reset
router.get('/verify-reset-token/:token', verifyResetToken);

// Crear nuevo usuario
router.post('/', createUser);

// Obtener usuario por ID
router.get('/:id', getUserById);

// Actualizar usuario
router.put('/:id', updateUser);

// Eliminar usuario
router.delete('/:id', deleteUser);


module.exports = router;