const { Rooms, Users, sequelize } = require('../models');

async function getRooms(req, res) {
  try {
    console.log('[getRooms] Obteniendo todas las salas...');
    const rooms = await Rooms.findAll({ order: [['code','ASC']] });
    console.log(`[getRooms] Se encontraron ${rooms.length} salas`);
    res.json(rooms);
  } catch (e) {
    console.error('[getRooms] Error obteniendo salas:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);
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
    console.error('[getRoomById] Error obteniendo sala:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error obteniendo sala', details: e.message });
  }
}

/**
 * Registrar entrada/salida de usuario en sala
 */
async function registerRoomAccess(req, res) {
  const { userId, roomId } = req.body;
  console.log(`[registerRoomAccess] User: ${userId}, Room: ${roomId}`);

  if (!userId || !roomId) {
    return res.status(400).json({ error: 'userId y roomId requeridos' });
  }

  const t = await sequelize.transaction();

  try {
    const user = await Users.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const room = await Rooms.findByPk(roomId, { transaction: t });
    if (!room) {
      await t.rollback();
      return res.status(404).json({ error: 'Sala no encontrada' });
    }

    let action = 'ENTRY';

    // Determinar si es entrada o salida
    if (user.activeRoomCode === room.code) {
      // El usuario ya está en esta sala → SALIDA
      action = 'EXIT';
      room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
      user.activeRoomCode = null;
    } else if (user.activeRoomCode === null) {
      // El usuario no está en ninguna sala → ENTRADA
      action = 'ENTRY';
      
      if (room.currentOccupancy >= room.capacity) {
        await t.rollback();
        return res.status(409).json({
          error: 'Sala llena',
          current: room.currentOccupancy,
          capacity: room.capacity
        });
      }

      room.currentOccupancy += 1;
      user.activeRoomCode = room.code;
    } else {
      // El usuario está en otra sala → ERROR
      await t.rollback();
      return res.status(409).json({
        error: 'Usuario debe salir de la otra sala primero',
        activeRoomCode: user.activeRoomCode
      });
    }

    await room.save({ transaction: t });
    await user.save({ transaction: t });
    await t.commit();

    console.log(`✅ [registerRoomAccess] ${action}: ${user.nombre} - ${room.name} (${room.currentOccupancy}/${room.capacity})`);

    res.json({
      success: true,
      action: action, // "ENTRY" o "EXIT"
      userName: user.nombre,
      roomName: room.name,
      roomId: room.id,
      currentOccupancy: room.currentOccupancy,
      capacity: room.capacity,
      message: `${action === 'ENTRY' ? 'Entrada registrada' : 'Salida registrada'}`
    });
  } catch (e) {
    await t.rollback();
    console.error('[registerRoomAccess] Error:', e.message);
    res.status(500).json({ error: 'Error registrando acceso', details: e.message });
  }
}

module.exports = { getRooms, getRoomById, registerRoomAccess };