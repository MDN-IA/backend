const router = require('express').Router();
const { recommendRoom } = require('../controllers/reco.controller');

router.get('/', recommendRoom);
module.exports = router;
