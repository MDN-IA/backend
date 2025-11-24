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

// ⚠️ IMPORTANTE: Rutas específicas ANTES de /:id
// Obtener usuario actual (autenticado) - DEBE IR ANTES DE /:id
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

// ⚠️ Estas rutas con /:id deben ir AL FINAL
// Obtener usuario por ID (debe ir después de las rutas específicas)
router.get('/:id', getUserById);

// Actualizar usuario
router.put('/:id', updateUser);

// Eliminar usuario
router.delete('/:id', deleteUser);


module.exports = router;