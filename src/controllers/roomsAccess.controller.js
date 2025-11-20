const { Users, Rooms, sequelize } = require('../models');

/**
 * Registrar acceso a una sala (entrada o salida automática)
 * Recibe: userId y roomId (o qr y roomCode para compatibilidad)
 */
async function registerRoomAccess(req, res) {
  // Soporta ambos formatos
  const userId = req.body.userId || req.body.id;
  const roomId = req.body.roomId;
  const qr = req.body.qr;
  const roomCode = req.body.roomCode;

  if (!roomId && !roomCode) {
    return res.status(400).json({ 
      success: false,
      error: 'roomId o roomCode requerido' 
    });
  }

  if (!userId && !qr) {
    return res.status(400).json({ 
      success: false,
      error: 'userId o qr requerido' 
    });
  }

  const t = await sequelize.transaction();

  try {
    // Buscar usuario por ID o QR
    const user = await Users.findOne({ 
      where: qr ? { qr } : { id: userId },
      transaction: t 
    });
    
    if (!user) {
      await t.rollback();
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado' 
      });
    }

    // Buscar sala por ID o código
    const room = await Rooms.findOne({ 
      where: roomCode ? { code: roomCode } : { id: roomId },
      transaction: t 
    });
    
    if (!room) {
      await t.rollback();
      return res.status(404).json({ 
        success: false,
        error: 'Sala no encontrada' 
      });
    }

    // Determinar si es entrada o salida
    const isExit = user.activeRoomId === room.id || user.activeRoomCode === room.code;

    if (isExit) {
      // ===== SALIDA (siempre permitida) =====
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
    } else {
      // ===== ENTRADA =====
      
      // Verificar si el usuario ya está en otra sala
      if (user.activeRoomId !== null || user.activeRoomCode !== null) {
        await t.rollback();
        return res.status(409).json({ 
          success: false,
          action: 'BLOCKED',
          error: 'Usuario debe salir de otra sala primero',
          message: 'Usuario ya está en otra sala'
        });
      }

      // BLOQUEAR ENTRADA si la sala está llena
      if (room.currentOccupancy >= room.capacity) {
        await t.rollback();
        return res.status(409).json({ 
          success: false,
          action: 'BLOCKED',
          error: 'Sala llena',
          userName: user.nombre,
          roomName: room.name,
          currentOccupancy: room.currentOccupancy,
          capacity: room.capacity,
          message: 'Room is at maximum capacity'
        });
      }

      // Permitir entrada
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
    }
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

// Mantener para compatibilidad hacia atrás si es necesario
async function enterRoom(req, res) {
  return registerRoomAccess(req, res);
}

async function exitRoom(req, res) {
  return registerRoomAccess(req, res);
}

module.exports = { registerRoomAccess, enterRoom, exitRoom };