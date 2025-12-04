const { Users, Rooms, sequelize } = require('../models');

const MIN_LIGHT = 900; // Minimum light threshold

/**
 * Register access to a room (automatic enter/exit)
 * Request: { userId: int, roomCode: string }
 *
 * Cases:
 * 1. User inside this room  -> EXIT (always allowed)
 * 2. User in another room   -> BLOCKED (must exit first)
 * 3. Room without light     -> BLOCKED
 * 4. Room full + new user   -> BLOCKED
 * 5. Room with space + user -> ENTER
 */
async function registerRoomAccess(req, res) {
  const userId = req.body.userId;
  const roomCode = req.body.roomCode;

  if (!userId || !roomCode) {
    return res.status(400).json({
      success: false,
      error: 'userId and roomCode are required'
    });
  }

  let t;
  try {
    // Find user (no transaction needed for read)
    const user = await Users.findOne({ where: { id: userId } });
    if (!user) {
      console.error(`[registerRoomAccess] User ${userId} not found`);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Find room by code (no transaction needed for read)
    const room = await Rooms.findOne({ where: { code: roomCode } });
    if (!room) {
      console.error(`[registerRoomAccess] Room with code ${roomCode} not found`);
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // CASE 1: User already inside this room -> EXIT
    if (user.activeRoomCode === roomCode) {
      t = await sequelize.transaction();

      // CRITICAL: Calculate duration and register EXIT in history
      const { RoomAccessHistory } = require('../models');

      // Find the last ENTER record for this user in this room
      const lastEntry = await RoomAccessHistory.findOne({
        where: {
          userId: user.id,
          roomId: room.id,
          action: 'ENTER'
        },
        order: [['timestamp', 'DESC']],
        transaction: t
      });

      // Calculate duration in minutes
      let duration = null;
      if (lastEntry) {
        const entryTime = new Date(lastEntry.timestamp);
        const exitTime = new Date();
        duration = Math.round((exitTime - entryTime) / 1000 / 60); // Convert to minutes

        // Update the ENTER record with the duration
        await lastEntry.update({ duration }, { transaction: t });
      }

      // Register EXIT action
      await RoomAccessHistory.create({
        userId: user.id,
        roomId: room.id,
        roomCode: room.code,
        action: 'EXIT',
        timestamp: new Date(),
        duration: duration,
        roomTemperature: room.temp,
        roomLight: room.light,
        roomHumidity: room.humidity
      }, { transaction: t });

      room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
      await room.save({ transaction: t });

      user.activeRoomId = null;
      user.activeRoomCode = null;
      await user.save({ transaction: t });

      await t.commit();

      console.log(`[EXIT] ${user.nombre} left ${room.name} (${room.currentOccupancy}/${room.capacity}) - Duration: ${duration || 'N/A'} min - History recorded`);

      return res.json({
        success: true,
        action: 'EXIT',
        message: 'Exit registered',
        userName: user.nombre,
        roomName: room.name,
        currentOccupancy: room.currentOccupancy,
        capacity: room.capacity,
        duration: duration
      });
    }

    // CASE 2: User in another room -> BLOCKED
    if (user.activeRoomCode !== null) {
      const otherRoom = await Rooms.findOne({ where: { code: user.activeRoomCode } });

      console.log(`[BLOCKED] ${user.nombre} is in ${otherRoom?.name}, trying to enter ${room.name}`);

      return res.status(409).json({
        success: false,
        action: 'BLOCKED',
        message: `You are already in ${otherRoom?.name}. Please exit first.`,
        userName: user.nombre,
        roomName: otherRoom?.name || 'Unknown',
        currentOccupancy: otherRoom?.currentOccupancy || 0,
        capacity: otherRoom?.capacity || 0
      });
    }

    // CASE 3: Room without enough light -> BLOCKED
    if (room.light === null || room.light >= MIN_LIGHT) {
      console.log(`[NO_LIGHT] ${user.nombre} tries to enter ${room.name} but there is not enough light (${room.light})`);

      return res.status(409).json({
        success: false,
        action: 'NO_LIGHT',
        message: 'There is not enough light in the room',
        userName: user.nombre,
        roomName: room.name,
        currentOccupancy: room.currentOccupancy,
        capacity: room.capacity,
        light: room.light
      });
    }

    // CASE 4: Room full + new user -> BLOCKED
    if (room.currentOccupancy >= room.capacity) {
      console.log(`[BLOCKED] ${user.nombre} tries to enter ${room.name} but it is full (${room.currentOccupancy}/${room.capacity})`);

      return res.status(409).json({
        success: false,
        action: 'BLOCKED',
        message: 'The room is full',
        userName: user.nombre,
        roomName: room.name,
        currentOccupancy: room.currentOccupancy,
        capacity: room.capacity
      });
    }

    // CASE 5: Room has space + user not inside any room -> ENTER
    t = await sequelize.transaction();

    room.currentOccupancy += 1;
    await room.save({ transaction: t });

    user.activeRoomId = room.id;
    user.activeRoomCode = room.code;
    await user.save({ transaction: t });

    // CRITICAL: Register ENTER in access history for ML learning
    const { RoomAccessHistory } = require('../models');
    await RoomAccessHistory.create({
      userId: user.id,
      roomId: room.id,
      roomCode: room.code,
      action: 'ENTER',
      timestamp: new Date(),
      roomTemperature: room.temp,
      roomLight: room.light,
      roomHumidity: room.humidity
    }, { transaction: t });

    await t.commit();

    console.log(`[ENTER] ${user.nombre} entered ${room.name} (${room.currentOccupancy}/${room.capacity}) - History recorded`);

    return res.json({
      success: true,
      action: 'ENTER',
      message: 'Entry registered',
      userName: user.nombre,
      roomName: room.name,
      currentOccupancy: room.currentOccupancy,
      capacity: room.capacity
    });

  } catch (e) {
    if (t) {
      try { await t.rollback(); } catch {}
    }
    console.error('[registerRoomAccess] Error:', e.message);
    return res.status(500).json({
      success: false,
      error: 'Error registering access',
      details: e.message
    });
  }
}

module.exports = { registerRoomAccess };