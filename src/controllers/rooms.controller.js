const { Rooms, sequelize } = require('../models');

async function getRooms(req, res) {
  try {
    console.log('[getRooms] Retrieving all the rooms...');
    const rooms = await Rooms.findAll({ order: [['code','ASC']] });
    console.log(`[getRooms] Has been found ${rooms.length} rooms`);
    res.json(rooms);
  } catch (e) {
    console.error('[getRooms] Error:', e.message);
    res.status(500).json({ error: 'Error retrieving rooms', details: e.message });
  }
}

async function getRoomById(req, res) {
  try {
    const { id } = req.params;
    console.log(`[getRoomById] Finding room with ID: ${id}`);

    const room = await Rooms.findByPk(id);

    if (!room) {
      console.log(`[getRoomById] Room with ID ${id} not found`);
      return res.status(404).json({
        error: 'Room not found',
        id: parseInt(id)
      });
    }

    const availableSpaces = room.capacity - room.currentOccupancy;

    console.log(`[getRoomById] Room found it: ${room.name} - Occupation: ${room.currentOccupancy}/${room.capacity}`);
    
    res.json({
      ...room.toJSON(),
      availableSpaces: Math.max(0, availableSpaces)
    });
  } catch (e) {
    console.error('[getRoomById] Error:', e.message);
    res.status(500).json({ error: 'Error retrieving room', details: e.message });
  }
}

module.exports = { getRooms, getRoomById };