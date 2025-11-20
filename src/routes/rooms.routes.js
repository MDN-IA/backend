const router = require('express').Router();
const { getRooms, getRoomById, registerRoomAccess } = require('../controllers/rooms.controller');

router.get('/', getRooms);
router.get('/:id', getRoomById);
router.post('/access', registerRoomAccess);

module.exports = router;
