const router = require('express').Router();
const { getRooms, getRoomById } = require('../controllers/rooms.controller');

router.get('/', getRooms);
router.get('/:id', getRoomById);

module.exports = router;
