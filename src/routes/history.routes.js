const router = require('express').Router();
const {
  getUserHistory,
  getUserStats
} = require('../controllers/history.controller');

// Obtener historial de accesos de un usuario
// GET /api/history/:userId?limit=50
router.get('/:userId', getUserHistory);

// Obtener estadísticas de un usuario
// GET /api/history/:userId/stats
router.get('/:userId/stats', getUserStats);

module.exports = router;

