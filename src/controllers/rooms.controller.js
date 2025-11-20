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
  console.log(`\n[registerRoomAccess] ====== INICIO ======`);
  console.log(`[registerRoomAccess] Datos recibidos:`, { userId, roomId });

  if (!userId || !roomId) {
    console.error(`[registerRoomAccess] ERROR: Faltan datos - userId: ${userId}, roomId: ${roomId}`);
    return res.status(400).json({ 
      success: false,
      error: 'userId y roomId requeridos' 
    });
  }

  const t = await sequelize.transaction();

  try {
    console.log(`[registerRoomAccess] Buscando usuario ID: ${userId}`);
    const user = await Users.findByPk(userId, { transaction: t });
    
    if (!user) {
      await t.rollback();
      console.error(`[registerRoomAccess] ERROR: Usuario ${userId} no encontrado`);
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado' 
      });
    }
    
    console.log(`[registerRoomAccess] Usuario encontrado: ${user.nombre}`);
    console.log(`[registerRoomAccess] activeRoomCode actual: ${user.activeRoomCode}`);

    console.log(`[registerRoomAccess] Buscando sala ID: ${roomId}`);
    const room = await Rooms.findByPk(roomId, { transaction: t });
    
    if (!room) {
      await t.rollback();
      console.error(`[registerRoomAccess] ERROR: Sala ${roomId} no encontrada`);
      return res.status(404).json({ 
        success: false,
        error: 'Sala no encontrada' 
      });
    }
    
    console.log(`[registerRoomAccess] Sala encontrada: ${room.name}`);
    console.log(`[registerRoomAccess] Capacidad: ${room.currentOccupancy}/${room.capacity}`);

    let action = 'ENTRY';

    // Determinar si es entrada o salida
    if (user.activeRoomCode === room.code) {
      action = 'EXIT';
      room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
      user.activeRoomCode = null;
      console.log(`[registerRoomAccess] Detectado: SALIDA`);
    } else if (user.activeRoomCode === null) {
      action = 'ENTRY';
      
      if (room.currentOccupancy >= room.capacity) {
        await t.rollback();
        console.log(`[registerRoomAccess] SALA LLENA: ${room.currentOccupancy}/${room.capacity}`);
        return res.status(409).json({
          success: false,
          error: 'Sala llena',
          current: room.currentOccupancy,
          capacity: room.capacity,
          message: 'Room is full'
        });
      }

      room.currentOccupancy += 1;
      user.activeRoomCode = room.code;
      console.log(`[registerRoomAccess] Detectado: ENTRADA`);
    } else {
      await t.rollback();
      console.log(`[registerRoomAccess] ERROR: Usuario en otra sala (${user.activeRoomCode})`);
      return res.status(409).json({
        success: false,
        error: 'Usuario debe salir de la otra sala primero',
        activeRoomCode: user.activeRoomCode,
        message: 'User must exit current room first'
      });
    }

    console.log(`[registerRoomAccess] Guardando cambios...`);
    await room.save({ transaction: t });
    console.log(`[registerRoomAccess] Sala guardada - Nueva ocupación: ${room.currentOccupancy}/${room.capacity}`);
    
    await user.save({ transaction: t });
    console.log(`[registerRoomAccess] Usuario guardado - activeRoomCode: ${user.activeRoomCode}`);
    
    await t.commit();
    console.log(`[registerRoomAccess] Transacción confirmada`);

    const response = {
      success: true,
      action: action,
      userName: user.nombre,
      roomName: room.name,
      roomId: room.id,
      currentOccupancy: room.currentOccupancy,
      capacity: room.capacity,
      message: `${action === 'ENTRY' ? 'Entrada registrada' : 'Salida registrada'}`
    };
    
    console.log(`✅ [registerRoomAccess] ÉXITO:`, response);
    console.log(`[registerRoomAccess] ====== FIN ======\n`);
    
    res.json(response);
  } catch (e) {
    await t.rollback();
    console.error(`❌ [registerRoomAccess] ERROR:`, e.message);
    console.error(`[registerRoomAccess] Stack:`, e.stack);
    console.log(`[registerRoomAccess] ====== FIN CON ERROR ======\n`);
    
    res.status(500).json({ 
      success: false,
      error: 'Error registrando acceso', 
      details: e.message 
    });
  }
}

module.exports = { getRooms, getRoomById, registerRoomAccess };