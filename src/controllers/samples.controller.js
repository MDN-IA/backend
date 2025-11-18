const db = require('../models');
const Room = db.Room || db.Rooms;

// Map para almacenar timers de actualización de array (cada 30 segundos)
const tempHistoryTimers = new Map();
// Map para rastrear si ya se guardó la primera temperatura
const firstTempSaved = new Map();

async function registerSample(req, res) {
  try {
    const { roomCode } = req.params;
    const { temp, light, hum, name } = req.body;

    const [room, created] = await Room.findOrCreate({
      where: { code: roomCode },
      defaults: { 
        name: name || roomCode.toUpperCase(),
        tempHistory: [0, 0, 0, 0, 0, 0, 0],
        tempIndex: 0
      }
    });

    // ACTUALIZAR TEMPERATURA EN TIEMPO REAL
    room.temp = temp;
    room.light = light;
    room.hum = hum;
    
    await room.save();

    // GUARDAR LA PRIMERA TEMPERATURA INMEDIATAMENTE
    if (!firstTempSaved.has(roomCode)) {
      if (!room.tempHistory || !Array.isArray(room.tempHistory)) {
        room.tempHistory = [0, 0, 0, 0, 0, 0, 0];
        room.tempIndex = 0;
      }

      room.tempHistory[0] = temp || 0;
      room.tempIndex = 1; // La próxima irá en posición 1

      room.changed('tempHistory', true);
      room.changed('tempIndex', true);

      await room.save();
      firstTempSaved.set(roomCode, true);
      console.log(` Primera temperatura guardada en posición 0: ${temp}`);
    }

    // INICIAR TIMER DE ACTUALIZACIÓN DEL ARRAY (cada 30 segundos)
    if (!tempHistoryTimers.has(roomCode)) {
      console.log(` Iniciando timer de 30 segundos para ${roomCode}`);
      
      const timer = setInterval(async () => {
        try {
          const updatedRoom = await Room.findOne({ where: { code: roomCode } });
          if (!updatedRoom) return;

          // Inicializar si no existe
          if (!updatedRoom.tempHistory || !Array.isArray(updatedRoom.tempHistory)) {
            updatedRoom.tempHistory = [0, 0, 0, 0, 0, 0, 0];
            updatedRoom.tempIndex = 0;
          }

          // Si el índice llegó a 7, vuelve a 0
          if (updatedRoom.tempIndex >= 7) {
            updatedRoom.tempIndex = 0;
          }

          // Guardar la temperatura actual en la posición actual
          updatedRoom.tempHistory[updatedRoom.tempIndex] = updatedRoom.temp || 0;
          console.log(` Temperatura ${updatedRoom.temp} guardada en posición ${updatedRoom.tempIndex}`);

          // Avanzar el índice para la próxima
          updatedRoom.tempIndex = (updatedRoom.tempIndex + 1) % 7;

          // Marcar campos como modificados
          updatedRoom.changed('tempHistory', true);
          updatedRoom.changed('tempIndex', true);

          await updatedRoom.save();
          console.log(` Array para ${roomCode}:`, updatedRoom.tempHistory, `| Próxima posición: ${updatedRoom.tempIndex}`);
        } catch (e) {
          console.error(`Error actualizando array para ${roomCode}:`, e.message);
        }
      }, 30000); // Cada 30 segundos

      tempHistoryTimers.set(roomCode, timer);
    }

    res.json({ 
      success: true, 
      created, 
      message: 'Temperatura actualizada',
      temp: room.temp,
      tempHistory: room.tempHistory,
      tempIndex: room.tempIndex
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error registrando muestra', details: e.message });
  }
}

module.exports = { registerSample };