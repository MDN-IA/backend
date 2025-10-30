const { Room } = require('../models');

async function getRooms(req, res) {
  try {
    const rooms = await Room.findAll({ order: [['code','ASC']] });
    res.json(rooms);
  } catch (e) {
    res.status(500).json({ error: 'Error obteniendo salas' });
  }
}

module.exports = { getRooms };
