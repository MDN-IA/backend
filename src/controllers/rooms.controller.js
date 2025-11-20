const { Rooms, sequelize } = require('../models');

async function getRooms(req, res) {
  try {
    console.log('[getRooms] Obteniendo todas las salas...');
    const rooms = await Rooms.findAll({ order: [['code','ASC']] });
    console.log(`[getRooms] Se encontraron ${rooms.length} salas`);
    res.json(rooms);
  } catch (e) {
    console.error('[getRooms] Error:', e.message);
    res.status(500).json({ error: 'Error obteniendo salas', details: e.message });
  }
}

async function getRoomById(req, res) {
  try {
    const { id } = req.params;
    console.log(`[getRoomById] Buscando sala con ID: ${id}`);

    const room = await Rooms.findByPk(id);

    if (!room) {
      console.log(`[getRoomById] Sala con ID ${id} no encontrada`);
      return res.status(404).json({
        error: 'Sala no encontrada',
        id: parseInt(id)
      });
    }

    const availableSpaces = room.capacity - room.currentOccupancy;

    console.log(`[getRoomById] Sala encontrada: ${room.name} - Ocupación: ${room.currentOccupancy}/${room.capacity}`);
    
    res.json({
      ...room.toJSON(),
      availableSpaces: Math.max(0, availableSpaces)
    });
  } catch (e) {
    console.error('[getRoomById] Error:', e.message);
    res.status(500).json({ error: 'Error obteniendo sala', details: e.message });
  }
}

module.exports = { getRooms, getRoomById };