const router = require('express').Router();
const { registerRoomAccess } = require('../controllers/roomsAccess.controller');

// Ruta única para entrada/salida automática
router.post('/access', registerRoomAccess);

module.exports = router;