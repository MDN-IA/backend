const router = require('express').Router();
const {
  getUsers,
  getUserById,
  getUserByEmail,
  getUserByQR,
  createUser,
  updateUser,
  deleteUser,
  loginUser
} = require('../controllers/users.controller');

// Obtener todos los usuarios
router.get('/', getUsers);

// Login de usuario
router.post('/login', loginUser);

// Obtener usuario por correo
router.get('/email/:correo', getUserByEmail);

// Obtener usuario por QR
router.get('/qr/:qr', getUserByQR);

// Obtener usuario por ID (debe ir después de las rutas específicas)
router.get('/:id', getUserById);

// Crear nuevo usuario
router.post('/', createUser);

// Actualizar usuario
router.put('/:id', updateUser);

// Eliminar usuario
router.delete('/:id', deleteUser);

module.exports = router;

