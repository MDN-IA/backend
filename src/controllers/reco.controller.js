const { Rooms } = require('../models');
const { recommender } = require('../ml/roomRecommender');

/**
 * Controlador de recomendaciones usando módulo ML independiente
 *
 * Endpoints:
 * - GET /api/recommendations?userId=X&preferredCapacity=small&preferredTimeSlot=morning
 * - POST /api/recommendations con body: { userId, preferences }
 */

/**
 * Obtener recomendación de sala usando ML
 * Query params:
 * - userId: ID del usuario (opcional)
 * - preferredCapacity: small/medium/large (opcional)
 * - preferredTimeSlot: morning/afternoon/evening (opcional)
 */
async function recommendRoom(req, res) {
  try {
    console.log('========================================');
    console.log('[RECOMENDACIÓN ML] Nueva petición');
    console.log('========================================');

    // Extraer parámetros de query o body
    const userId = req.query.userId || req.body?.userId || null;
    const preferences = {
      preferredCapacity: req.query.preferredCapacity || req.body?.preferredCapacity || null,
      preferredTimeSlot: req.query.preferredTimeSlot || req.body?.preferredTimeSlot || null
    };

    console.log(`User ID: ${userId || 'sin usuario'}`);
    console.log(`Preferencias:`, preferences);

    // Obtener recomendación usando el módulo ML
    const recommendation = await recommender.getTopRecommendation(
      userId ? parseInt(userId) : null,
      preferences
    );

    if (!recommendation) {
      console.log('No se pudo generar recomendación');
      return res.status(404).json({
        success: false,
        message: 'No hay salas disponibles para recomendar',
        recommendation: null
      });
    }

    console.log('Recomendación generada exitosamente');
    console.log(`Sala: ${recommendation.roomName}`);
    console.log(`Score: ${(recommendation.score * 100).toFixed(1)}%`);
    console.log('========================================\n');

    res.json({
      success: true,
      message: 'Recomendación generada por ML',
      recommendation,
      timestamp: new Date().toISOString()
    });

  } catch (e) {
    console.error('[recommendRoom] Error generando recomendación:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({
      success: false,
      error: 'Error generando recomendación',
      details: e.message
    });
  }
}

/**
 * Endpoint para entrenar el modelo (feedback de usuarios)
 * POST /api/recommendations/train
 * Body: { userId, roomId, rating, actualUsage }
 */
async function trainModel(req, res) {
  try {
    const feedback = req.body;

    console.log('[TRAIN] Entrenando modelo con feedback:', feedback);

    const result = await recommender.trainModel(feedback);

    res.json({
      success: true,
      message: 'Modelo actualizado con feedback',
      result
    });

  } catch (e) {
    console.error('[trainModel] Error:', e.message);
    res.status(500).json({
      success: false,
      error: 'Error entrenando modelo',
      details: e.message
    });
  }
}

/**
 * Endpoint para limpiar cache del modelo
 * POST /api/recommendations/clear-cache
 */
async function clearCache(req, res) {
  try {
    recommender.clearCache();

    res.json({
      success: true,
      message: 'Cache limpiado exitosamente'
    });

  } catch (e) {
    console.error('[clearCache] Error:', e.message);
    res.status(500).json({
      success: false,
      error: 'Error limpiando cache',
      details: e.message
    });
  }
}

module.exports = {
  recommendRoom,
  trainModel,
  clearCache
};
