const router = require('express').Router();
const {
  recommendRoom,
  trainModel,
  clearCache
} = require('../controllers/reco.controller');

// Obtener recomendación de sala usando ML
// GET /api/recommendations?userId=1&preferredCapacity=small
// POST /api/recommendations con body: { userId, preferredCapacity }
// NOTA: El ML aprende automáticamente los patrones temporales del historial del usuario
router.get('/', recommendRoom);
router.post('/', recommendRoom);

// Entrenar modelo con feedback de usuarios
// POST /api/recommendations/train
router.post('/train', trainModel);

// Limpiar cache del modelo
// POST /api/recommendations/clear-cache
router.post('/clear-cache', clearCache);

module.exports = router;
