const { Rooms } = require('../models');

function idealByPref(pref) {
  if (pref === 'fría') return 18;
  if (pref === 'cálida') return 26;
  return 22;
}

async function recommendRoom(req, res) {
  try {
    const pref = (req.query.pref || 'templada').toLowerCase();
    const rooms = await Room.findAll({ where: { available: true } });
    if (!rooms.length) return res.json({ message: 'No rooms available', rooms: [] });

    const ideal = idealByPref(pref);
    console.log(` Temperatura ideal para '${pref}': ${ideal}°C`);

    const best = rooms.reduce((prev, curr) => {
      const dp = Math.abs((prev?.temp ?? ideal) - ideal);
      const dc = Math.abs(curr.temp - ideal);
      return dc < dp ? curr : prev;
    }, rooms[0]);

    console.log(` [recommendRoom] Sala recomendada: ${best.name} (${best.code}) - ${best.temp}°C`);

    res.json({ preference: pref, recommended: best, rooms });
  } catch (e) {
    console.error(' [recommendRoom] Error recomendando sala:');
    console.error('   Mensaje:', e.message);
    console.error('   Stack:', e.stack);
    res.status(500).json({ error: 'Error recomendando sala', details: e.message });
  }
}

module.exports = { recommendRoom };
