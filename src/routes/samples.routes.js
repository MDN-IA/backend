const router = require('express').Router();
const { registerSample } = require('../controllers/samples.controller');

router.post('/:roomCode', registerSample);
module.exports = router;
