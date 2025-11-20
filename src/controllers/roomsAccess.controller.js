const { Users, Rooms, sequelize } = require('../models');

/**
 * Registrar acceso a una sala (entrada o salida automática)
 * Request: { userId: int, roomCode: string }
 * 
 * Casos:
 * 1. Usuario dentro de sala = SALIDA (siempre permitida)
 * 2. Usuario en otra sala = BLOQUEADO (debe salir primero)
 * 3. Sala llena + usuario nuevo = BLOQUEADO
 * 4. Sala con espacio + usuario nuevo = ENTRADA
 */
async function registerRoomAccess(req, res) {
  const userId = req.body.userId;
  const roomCode = req.body.roomCode;

  if (!userId || !roomCode) {
    return res.status(400).json({ 
      success: false,
      error: 'userId y roomCode requeridos' 
    });
  }

  const t = await sequelize.transaction();

  try {
    // Buscar usuario
    const user = await Users.findOne({ 
      where: { id: userId },
      transaction: t 
    });
    
    if (!user) {
      await t.rollback();
      console.error(`[registerRoomAccess] Usuario ${userId} no encontrado`);
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado' 
      });
    }

    // Buscar sala por código
    const room = await Rooms.findOne({ 
      where: { code: roomCode },
      transaction: t 
    });
    
    if (!room) {
      await t.rollback();
      console.error(`[registerRoomAccess] Sala con código ${roomCode} no encontrada`);
      return res.status(404).json({ 
        success: false,
        error: 'Sala no encontrada' 
      });
    }

    // CASO 1: Usuario dentro de esta sala = SALIDA
    if (user.activeRoomCode === roomCode) {
      room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
      await room.save({ transaction: t });

      user.activeRoomId = null;
      user.activeRoomCode = null;
      await user.save({ transaction: t });

      await t.commit();

      console.log(`✅ [EXIT] ${user.nombre} salió de ${room.name} (${room.currentOccupancy}/${room.capacity})`);

      return res.json({ 
        success: true,
        action: 'EXIT',
        message: 'Salida registrada',
        userName: user.nombre,
        roomName: room.name,
        currentOccupancy: room.currentOccupancy,
        capacity: room.capacity
      });
    }

    // CASO 2: Usuario en otra sala = BLOQUEADO
    if (user.activeRoomCode !== null) {
      await t.rollback();
      const otherRoom = await Rooms.findOne({ 
        where: { code: user.activeRoomCode },
        transaction: t 
      });
      
      console.log(`❌ [BLOCKED] ${user.nombre} está en ${otherRoom?.name}, intenta entrar a ${room.name}`);

      return res.status(409).json({ 
        success: false,
        action: 'BLOCKED',
        message: `Ya estás en ${otherRoom?.name}. Debes salir primero.`,
        userName: user.nombre,
        roomName: otherRoom?.name || 'Unknown',
        currentOccupancy: otherRoom?.currentOccupancy || 0,
        capacity: otherRoom?.capacity || 0
      });
    }

    // CASO 3: Sala llena + usuario nuevo = BLOQUEADO
    if (room.currentOccupancy >= room.capacity) {
      await t.rollback();
      
      console.log(`❌ [BLOCKED] ${user.nombre} intenta entrar a ${room.name} pero está llena (${room.currentOccupancy}/${room.capacity})`);

      return res.status(409).json({ 
        success: false,
        action: 'BLOCKED',
        message: 'No hay espacio disponible en la sala',
        userName: user.nombre,
        roomName: room.name,
        currentOccupancy: room.currentOccupancy,
        capacity: room.capacity
      });
    }

    // CASO 4: Sala con espacio + usuario nuevo = ENTRADA
    room.currentOccupancy += 1;
    await room.save({ transaction: t });

    user.activeRoomId = room.id;
    user.activeRoomCode = room.code;
    await user.save({ transaction: t });

    await t.commit();

    console.log(`✅ [ENTER] ${user.nombre} entró a ${room.name} (${room.currentOccupancy}/${room.capacity})`);

    return res.json({ 
      success: true,
      action: 'ENTER',
      message: 'Entrada registrada',
      userName: user.nombre,
      roomName: room.name,
      currentOccupancy: room.currentOccupancy,
      capacity: room.capacity
    });

  } catch (e) {
    await t.rollback();
    console.error('[registerRoomAccess] Error:', e.message);
    res.status(500).json({ 
      success: false,
      error: 'Error registrando acceso', 
      details: e.message 
    });
  }
}

module.exports = { registerRoomAccess };