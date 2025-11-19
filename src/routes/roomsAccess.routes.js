const router = require('express').Router();
const { enterRoom, exitRoom } = require('../controllers/roomsAccess.controller');

// Entrar a sala
router.post('/enter', enterRoom);

// Salir de sala
router.post('/exit', exitRoom);

module.exports = router;