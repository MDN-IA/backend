const { Users, Rooms, sequelize } = require('../models');

/**
 * Registrar entrada a una sala
 */
async function enterRoom(req, res) {
  const { qr, roomCode } = req.body;

  if (!qr || !roomCode) {
    return res.status(400).json({ error: 'qr y roomCode requeridos' });
  }

  const t = await sequelize.transaction();

  try {
    const user = await Users.findOne({ where: { qr }, transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const room = await Rooms.findOne({ where: { code: roomCode }, transaction: t });
    if (!room) {
      await t.rollback();
      return res.status(404).json({ error: 'Sala no encontrada' });
    }

    if (user.activeRoomCode === roomCode) {
      await t.rollback();
      return res.status(409).json({ error: 'Usuario ya está en la sala' });
    }

    if (room.currentOccupancy >= room.capacity) {
      await t.rollback();
      return res.status(409).json({ 
        error: 'Sala llena',
        current: room.currentOccupancy,
        capacity: room.capacity
      });
    }

    if (user.activeRoomCode && user.activeRoomCode !== roomCode) {
      await t.rollback();
      return res.status(409).json({ 
        error: 'Usuario debe salir de la otra sala primero',
        activeRoomCode: user.activeRoomCode 
      });
    }

    room.currentOccupancy += 1;
    await room.save({ transaction: t });

    user.activeRoomCode = roomCode;
    await user.save({ transaction: t });

    await t.commit();

    console.log(`✅ [enterRoom] ${user.nombre} entró a ${roomCode} (${room.currentOccupancy}/${room.capacity})`);

    res.json({ 
      success: true, 
      message: 'Entrada registrada',
      userName: user.nombre,
      roomCode: roomCode,
      currentOccupancy: room.currentOccupancy,
      capacity: room.capacity
    });
  } catch (e) {
    await t.rollback();
    console.error('[enterRoom] Error:', e.message);
    res.status(500).json({ error: 'Error registrando entrada', details: e.message });
  }
}

/**
 * Registrar salida de una sala
 */
async function exitRoom(req, res) {
  const { qr, roomCode } = req.body;

  if (!qr || !roomCode) {
    return res.status(400).json({ error: 'qr y roomCode requeridos' });
  }

  const t = await sequelize.transaction();

  try {
    const user = await Users.findOne({ where: { qr }, transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.activeRoomCode !== roomCode) {
      await t.rollback();
      return res.status(409).json({ 
        error: 'Usuario no está en esa sala',
        activeRoomCode: user.activeRoomCode 
      });
    }

    const room = await Rooms.findOne({ where: { code: roomCode }, transaction: t });
    if (!room) {
      await t.rollback();
      return res.status(404).json({ error: 'Sala no encontrada' });
    }

    room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
    await room.save({ transaction: t });

    user.activeRoomCode = null;
    await user.save({ transaction: t });

    await t.commit();

    console.log(`✅ [exitRoom] ${user.nombre} salió de ${roomCode} (${room.currentOccupancy}/${room.capacity})`);

    res.json({ 
      success: true, 
      message: 'Salida registrada',
      userName: user.nombre,
      roomCode: roomCode,
      currentOccupancy: room.currentOccupancy,
      capacity: room.capacity
    });
  } catch (e) {
    await t.rollback();
    console.error('[exitRoom] Error:', e.message);
    res.status(500).json({ error: 'Error registrando salida', details: e.message });
  }
}

module.exports = { enterRoom, exitRoom };