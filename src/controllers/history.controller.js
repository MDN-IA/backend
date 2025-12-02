const { RoomAccessHistory, Rooms, Users, sequelize } = require('../models');

/**
 * Obtener historial de accesos de un usuario
 * GET /api/history/:userId
 */
async function getUserHistory(req, res) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    console.log(`[HISTORY] Retrieving user historical from ${userId}`);

    const history = await RoomAccessHistory.findAll({
      where: { userId },
      include: [
        {
          model: Rooms,
          as: 'room',
          attributes: ['id', 'code', 'name', 'capacity']
        }
      ],
      order: [['timestamp', 'DESC']],
      limit
    });

    console.log(`[HISTORY] Have been found ${history.length} registers`);

    res.json({
      success: true,
      count: history.length,
      history: history.map(h => ({
        id: h.id,
        action: h.action,
        timestamp: h.timestamp,
        duration: h.duration,
        room: {
          id: h.room.id,
          code: h.room.code,
          name: h.room.name,
          capacity: h.room.capacity
        },
        conditions: {
          temperature: h.roomTemperature,
          light: h.roomLight,
          humidity: h.roomHumidity
        }
      }))
    });

  } catch (error) {
    console.error('[HISTORY] Error:', error.message);

    // Si la tabla no existe, devolver array vacío
    if (error.message.includes('does not exist')) {
      return res.json({
        success: true,
        count: 0,
        history: [],
        message: 'Table historical does not exist. Execute the migrations.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error retrieving historical',
      details: error.message
    });
  }
}

/**
 * Obtener estadísticas de acceso de un usuario
 * GET /api/history/:userId/stats
 */
async function getUserStats(req, res) {
  try {
    const { userId } = req.params;

    console.log(`[STATS] Calculating stats from user ${userId}`);

    // Salas más visitadas
    const [mostVisited] = await sequelize.query(`
      SELECT
        r.id,
        r.name,
        r.code,
        COUNT(*) as visit_count
      FROM "RoomAccessHistory" rah
      JOIN "Rooms" r ON rah."roomId" = r.id
      WHERE rah."userId" = :userId AND rah.action = 'ENTER'
      GROUP BY r.id, r.name, r.code
      ORDER BY visit_count DESC
      LIMIT 5
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    // Total de visitas
    const totalVisits = await RoomAccessHistory.count({
      where: { userId, action: 'ENTER' }
    });

    // Duración promedio
    const avgDuration = await RoomAccessHistory.findOne({
      where: { userId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']
      ],
      raw: true
    });

    // Horario preferido
    const [preferredTime] = await sequelize.query(`
      SELECT
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as count
      FROM "RoomAccessHistory"
      WHERE "userId" = :userId AND action = 'ENTER'
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      stats: {
        totalVisits,
        avgDuration: avgDuration?.avgDuration || 0,
        mostVisitedRooms: mostVisited,
        preferredHour: preferredTime?.hour || null
      }
    });

  } catch (error) {
    console.error('[STATS] Error:', error.message);

    if (error.message.includes('does not exist')) {
      return res.json({
        success: true,
        stats: {
          totalVisits: 0,
          avgDuration: 0,
          mostVisitedRooms: [],
          preferredHour: null
        },
        message: 'Historical table does not exist. Execute the migrations.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error calculating stats',
      details: error.message
    });
  }
}

module.exports = {
  getUserHistory,
  getUserStats
};

