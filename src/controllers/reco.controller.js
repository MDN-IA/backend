const { Room } = require('../models');

function idealByPref(pref) {
  if (pref === 'fría') return 18;
  if (pref === 'cálida') return 26;
  return 22;
}

async function recommendRoom(req, res) {
  try {
    const pref = (req.query.pref || 'templada').toLowerCase();
    const rooms = await Room.findAll({ where: { available: true } });
    if (!rooms.length) return res.json({ message: 'No hay salas disponibles', rooms: [] });

    const ideal = idealByPref(pref);
    const best = rooms.reduce((prev, curr) => {
      const dp = Math.abs((prev?.temp ?? ideal) - ideal);
      const dc = Math.abs(curr.temp - ideal);
      return dc < dp ? curr : prev;
    }, rooms[0]);

    res.json({ preference: pref, recommended: best, rooms });
  } catch (e) {
    res.status(500).json({ error: 'Error recomendando sala' });
  }
}

module.exports = { recommendRoom };
