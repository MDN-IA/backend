const { Room } = require('../models');
const { classifyTemp, isAvailableByLight } = require('../utils/comfort');

/**
 * POST /api/samples/:roomCode
 * body: { temp: number, light: number, name?: string }
 */
async function registerSample(req, res) {
  try {
    const { roomCode } = req.params;
    const { temp, light, name } = req.body;

    const available = isAvailableByLight(light);
    const bucket = classifyTemp(temp);

    const [room, created] = await Room.findOrCreate({
      where: { code: roomCode },
      defaults: { name: name || roomCode.toUpperCase() }
    });

    room.temp = temp;
    room.light = light;
    room.available = available;
    room.bucket = bucket;
    await room.save();

    res.json({ success: true, created, room });
  } catch (e) {
    res.status(500).json({ error: 'Error registrando muestra', details: e.message });
  }
}

module.exports = { registerSample };
