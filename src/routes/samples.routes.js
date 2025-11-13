const { Router } = require('express');
const { registerSample } = require('../controllers/samples.controller');

const router = Router();

router.post('/:roomCode', registerSample);
module.exports = router;
