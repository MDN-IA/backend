#!/usr/bin/env node

/**
 * COMPLETE ML TEST: Demonstrate Progressive Learning of the System
 *
 * This test demonstrates that the ML system progressively learns from
 * the user's real behavior and prioritizes history over theoretical
 * preferences.
 *
 * Scenarios:
 * 1. New user (0 visits) → Based on temperature
 * 2. Occasional user (3 visits) → Starts learning
 * 3. Regular user (10 visits) → Learns patterns
 * 4. Frequent user (25 visits) → Strong learning
 * 5. Very frequent user (50 visits) → Dominant learning
 *
 * Rooms:
 * - Room A: 17°C (NOT ideal for COLD) but most visited
 * - Room H: 18°C (PERFECT for COLD) no visits
 * - Room C: 22°C (WARM) as control
 *
 * ML System Weights:
 * - Temperature (35%): Match with user preference
 * - Availability (30%): Current free spaces
 * - History (20%): Frequency of previous visits
 * - Similar Users (8%): Preferences of similar users
 * - Temporal Patterns (5%): Time and day of week
 * - Capacity (2%): Preferred room size
 */

const { recommender } = require('./roomRecommender');
const { Users, Rooms, RoomAccessHistory, sequelize } = require('../models');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function separator(title) {
  console.log('\n' + '='.repeat(80));
  log(colors.bright + colors.cyan, `  ${title}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Helper: Crear usuario con historial específico
 */
async function createUserWithHistory(name, visits, sala) {
  const user = await Users.create({
    nombre: name,
    correo: `${name.toLowerCase().replace(/\s+/g, '_')}@test.com`,
    contrasena: 'test123',
    preferenciaTemperatura: 'COLD',
    esAdmin: false
  });

  // Crear historial de visitas
  for (let i = 0; i < visits; i++) {
    await RoomAccessHistory.create({
      userId: user.id,
      roomId: sala.id,
      roomCode: sala.code,
      action: 'ENTER',
      timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
      roomTemperature: sala.temp,
      roomLight: sala.light,
      roomHumidity: sala.hum
    });
  }

  return user;
}

/**
 * Función principal del test
 */
async function runTest() {
  console.log('\n');
  log(colors.bright + colors.magenta, '╔═════════════════════════════════════════════════════════════════╗');
  log(colors.bright + colors.magenta, '║   FULL TEST: System learns about the user and their preferences ║');
  log(colors.bright + colors.magenta, '╚═════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const usersToCleanup = [];
  const roomsToCleanup = [];

  try {
    // ============================================================================
    // STEP 1: Prepare test rooms
    // ============================================================================
    separator('STEP 1: Room Setup');

    log(colors.yellow, 'Setting up test rooms...\n');

    // Sala A: NO ideal pero la que el usuario visita
    let salaA = await Rooms.findOne({ where: { code: 'SALA_A_TEST' } });
    let salaACreated = false;
    if (!salaA) {
      salaA = await Rooms.create({
        code: 'SALA_A_TEST',
        name: 'Sala A (Visitada)',
        temp: 17.0,
        light: 400,
        hum: 50,
        capacity: 30,
        currentOccupancy: 10,
        tempHistory: []
      });
      salaACreated = true;
      roomsToCleanup.push(salaA);
    } else {
      await salaA.update({ temp: 17.0, currentOccupancy: 10 });
    }

    // Sala H: PERFECTA temperatura pero sin visitas
    let salaH = await Rooms.findOne({ where: { code: 'SALA_H_TEST' } });
    let salaHCreated = false;
    if (!salaH) {
      salaH = await Rooms.create({
        code: 'SALA_H_TEST',
        name: 'Sala H',
        temp: 18.0,
        light: 400,
        hum: 50,
        capacity: 30,
        currentOccupancy: 3,
        tempHistory: []
      });
      salaHCreated = true;
      roomsToCleanup.push(salaH);
    } else {
      await salaH.update({ temp: 18.0, currentOccupancy: 3 });
    }

    // Sala C: WARM como control
    let salaC = await Rooms.findOne({ where: { code: 'SALA_C_TEST' } });
    let salaCCreated = false;
    if (!salaC) {
      salaC = await Rooms.create({
        code: 'SALA_C_TEST',
        name: 'Sala C (WARM)',
        temp: 22.0,
        light: 400,
        hum: 50,
        capacity: 30,
        currentOccupancy: 15,
        tempHistory: []
      });
      salaCCreated = true;
      roomsToCleanup.push(salaC);
    } else {
      await salaC.update({ temp: 22.0, currentOccupancy: 15 });
    }

    log(colors.green, 'Rooms configured:');
    console.log(`   Room A: ${salaA.temp}°C (NOT ideal for COLD) - Occupancy: ${salaA.currentOccupancy}/${salaA.capacity}`);
    console.log(`   Room H: ${salaH.temp}°C (PERFECT for COLD) - Occupancy: ${salaH.currentOccupancy}/${salaH.capacity}`);
    console.log(`   Room C: ${salaC.temp}°C (WARM) - Occupancy: ${salaC.currentOccupancy}/${salaC.capacity}`);

    // ============================================================================
    // STEP 2: Create users with different history levels
    // ============================================================================
    separator('STEP 2: Create Users with Different History Levels');

    log(colors.yellow, 'Creating 5 user profiles...\n');

    const perfiles = [
      { nombre: 'New User', visitas: 0},
      { nombre: 'Occasional User', visitas: 3},
      { nombre: 'Regular User', visitas: 10},
      { nombre: 'Frequent User', visitas: 25},
      { nombre: 'Very Frequent User', visitas: 50}
    ];

    const usuarios = [];

    for (const perfil of perfiles) {
      const user = await createUserWithHistory(perfil.nombre, perfil.visitas, salaA);
      usuarios.push({
        user,
        perfil
      });
      usersToCleanup.push(user);

      if (perfil.visitas > 0) {
        log(colors.green, `${perfil.nombre}: ${perfil.visitas} visits to Room A`);
      } else {
        log(colors.blue, `${perfil.nombre}: No previous history`);
      }
    }

    // ============================================================================
    // STEP 3: Get recommendations for each user
    // ============================================================================
    separator('STEP 3: Recommendations Analysis by History Level');

    log(colors.yellow, 'Getting recommendations from ML system...\n');

    const resultados = [];

    for (const userData of usuarios) {
      const rec = await recommender.getTopRecommendation(userData.user.id, {
        preferredCapacity: 'medium',
        preferredTimeSlot: 'morning'
      });

      if (rec) {
        resultados.push({
          perfil: userData.perfil,
          sala: rec.roomName,
          scoreTotal: rec.score,
          scoreTemp: rec.scoreBreakdown.features,
          scoreHist: rec.scoreBreakdown.history,
          scoreDisp: rec.scoreBreakdown.availability,
          razones: rec.reasons,
          features: rec.features
        });

        log(colors.cyan, `${userData.perfil.nombre} (${userData.perfil.visitas} visits):`);
        console.log(`   Recommendation: ${rec.roomName}`);
        console.log(`   Total Score: ${(rec.score * 100).toFixed(1)}%`);
        console.log(`   Temperature Score (35%): ${(rec.scoreBreakdown.features * 100).toFixed(1)}%`);
        console.log(`   History Score (20%): ${(rec.scoreBreakdown.history * 100).toFixed(1)}%`);
        console.log(`   Availability Score (30%): ${(rec.scoreBreakdown.availability * 100).toFixed(1)}%`);
        console.log('');
      }
    }

    // ============================================================================
    // STEP 4: Comparative table
    // ============================================================================
    separator('STEP 4: Comparative Table - Learning Evolution');

    log(colors.cyan, 'SCORE COMPARISON BY HISTORY LEVEL:\n');

    console.log('┌────────────────────┬─────────┬───────────────┬─────────┬─────────┬─────────┐');
    console.log('│ User               │ Visits  │ Recommendation│ Total   │ Temp    │ History │');
    console.log('├────────────────────┼─────────┼───────────────┼─────────┼─────────┼─────────┤');

    resultados.forEach(r => {
      const nombre = r.perfil.nombre.padEnd(18);
      const visitas = String(r.perfil.visitas).padEnd(7);
      const sala = (r.sala.includes('Sala A') || r.sala.includes('Room A')) ? 'Sala A       ' : r.sala.padEnd(13);
      const total = `${(r.scoreTotal * 100).toFixed(1)}%`.padEnd(7);
      const temp = `${(r.scoreTemp * 100).toFixed(1)}%`.padEnd(7);
      const hist = `${(r.scoreHist * 100).toFixed(1)}%`.padEnd(7);

      console.log(`│ ${nombre} │ ${visitas} │ ${sala} │ ${total} │ ${temp} │ ${hist} │`);
    });

    console.log('└────────────────────┴─────────┴───────────────┴─────────┴─────────┴─────────┘\n');

    // ============================================================================
    // STEP 5: Progression analysis
    // ============================================================================
    separator('STEP 5: Learning Progression Analysis');

    log(colors.cyan, 'HISTORY SCORE EVOLUTION:\n');

    const progresion = resultados.map(r => ({
      visitas: r.perfil.visitas,
      scoreHist: (r.scoreHist * 100).toFixed(1),
      contribucion: (r.scoreHist * 0.20 * 100).toFixed(1)
    }));

    progresion.forEach(p => {
      const bar = '█'.repeat(Math.floor(p.scoreHist / 5));
      console.log(`${String(p.visitas).padStart(2)} visits → Score: ${String(p.scoreHist).padStart(5)}% │${bar}│ → Contribution: ${p.contribucion}% to total`);
    });

    console.log('');
    log(colors.yellow, 'INTERPRETATION:');
    console.log('   • 0 visits: Base history score (~50%) = 10% contribution');
    console.log('   • 3 visits: History score rises (~75%) = 15% contribution');
    console.log('   • 10 visits: High history score (~85%) = 17% contribution');
    console.log('   • 25 visits: Very high history score (~92%) = 18.4% contribution');
    console.log('   • 50 visits: Maximum history score (~95%) = 19% contribution');

    // ============================================================================
    // STEP 6: Inflection point (when the recommendation changes)
    // ============================================================================
    separator('STEP 6: ML Inflection Point');

    log(colors.cyan, 'AT WHAT MOMENT DOES HISTORY OVERCOME TEMPERATURE?\n');

    const cambioDeRecomendacion = resultados.findIndex(r => r.sala.includes('Sala A') || r.sala.includes('Room A'));

    if (cambioDeRecomendacion > 0) {
      const usuarioAntes = resultados[cambioDeRecomendacion - 1];
      const usuarioDespues = resultados[cambioDeRecomendacion];

      log(colors.yellow, `Inflection point detected between ${usuarioAntes.perfil.visitas} and ${usuarioDespues.perfil.visitas} visits:\n`);

      console.log(`BEFORE (${usuarioAntes.perfil.visitas} visits):`);
      console.log(`   → Room: ${usuarioAntes.sala}`);
      console.log(`   → Temperature Score: ${(usuarioAntes.scoreTemp * 100).toFixed(1)}%`);
      console.log(`   → History Score: ${(usuarioAntes.scoreHist * 100).toFixed(1)}%`);
      console.log(`   → Decision: Prioritizes TEMPERATURE\n`);

      console.log(`AFTER (${usuarioDespues.perfil.visitas} visits):`);
      console.log(`   → Room: ${usuarioDespues.sala}`);
      console.log(`   → Temperature Score: ${(usuarioDespues.scoreTemp * 100).toFixed(1)}%`);
      console.log(`   → History Score: ${(usuarioDespues.scoreHist * 100).toFixed(1)}%`);
      console.log(`   → Decision: Prioritizes HISTORY\n`);

      const difHist = usuarioDespues.scoreHist - usuarioAntes.scoreHist;
      log(colors.green, `ML changed its decision when history increased ${(difHist * 100).toFixed(1)}% points`);
    } else if (cambioDeRecomendacion === 0) {
      log(colors.yellow, 'Even without history, it already recommends Room A (may be due to availability)');
    } else {
      log(colors.red, 'History failed to change the recommendation (increase history weight)');
    }

    // ============================================================================
    // STEP 7: Reasons demonstration
    // ============================================================================
    separator('STEP 7: Detailed Recommendation Reasons');

    log(colors.cyan, 'HOW THE ML EXPLAINS ITS DECISIONS:\n');

    // New user
    log(colors.blue, `${resultados[0].perfil.nombre}:`);
    console.log(`   Room: ${resultados[0].sala}`);
    console.log(`   Reasons:`);
    resultados[0].razones.slice(0, 3).forEach((r, i) => {
      console.log(`      ${i + 1}. ${r}`);
    });
    console.log('');

    // Very frequent user
    const ultimoIdx = resultados.length - 1;
    log(colors.blue, `${resultados[ultimoIdx].perfil.nombre}:`);
    console.log(`   Room: ${resultados[ultimoIdx].sala}`);
    console.log(`   Reasons:`);
    resultados[ultimoIdx].razones.slice(0, 3).forEach((r, i) => {
      console.log(`      ${i + 1}. ${r}`);
    });
    console.log('');

    log(colors.yellow, 'NOTICE: The reasons change according to the history!');

    // ============================================================================
    // STEP 8: Final verification
    // ============================================================================
    separator('STEP 8: ML System Verification');

    log(colors.cyan, 'SUCCESS CRITERIA:\n');

    const criterios = [
      {
        condicion: resultados[0].sala.includes('Sala H') || resultados[0].sala.includes('Room H') || !resultados[0].sala.includes('Sala A'),
        mensaje: 'New user recommends by temperature',
        cumple: true
      },
      {
        condicion: resultados[ultimoIdx].sala.includes('Sala A') || resultados[ultimoIdx].sala.includes('Room A'),
        mensaje: 'Frequent user recommends by history',
        cumple: true
      },
      {
        condicion: resultados[ultimoIdx].scoreHist > resultados[0].scoreHist + 0.3,
        mensaje: 'History score increases significantly (>30%)',
        cumple: true
      },
      {
        condicion: cambioDeRecomendacion >= 0,
        mensaje: 'Inflection point exists in recommendations',
        cumple: true
      }
    ];

    let todosOk = true;
    criterios.forEach(criterio => {
      if (criterio.condicion) {
        log(colors.green, `${criterio.mensaje}`);
      } else {
        log(colors.red, `${criterio.mensaje}`);
        todosOk = false;
      }
    });

    console.log('');

    if (todosOk) {
      log(colors.bright + colors.green, '╔═══════════════════════════════════════════════════════╗');
      log(colors.bright + colors.green, '║          TEST SUCCESSFUL - ML WORKS CORRECTLY         ║');
      log(colors.bright + colors.green, '╠═══════════════════════════════════════════════════════╣');
      log(colors.bright + colors.green, '║  ✓ Learns from user history                           ║');
      log(colors.bright + colors.green, '║  ✓ Prioritizes real behavior over theory              ║');
      log(colors.bright + colors.green, '║  ✓ Changes recommendations based on experience        ║');
      log(colors.bright + colors.green, '╚═══════════════════════════════════════════════════════╝');
    } else {
      log(colors.bright + colors.red, 'TEST FAILED - Review ML weights configuration');
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================
    separator('CLEANUP');

    log(colors.yellow, 'Cleaning up test data...');

    // 1. Eliminar historial de accesos de usuarios de prueba
    const userIds = usersToCleanup.map(u => u.id);
    if (userIds.length > 0) {
      await RoomAccessHistory.destroy({
        where: { userId: userIds }
      });
      log(colors.cyan, `   ✓ Removed ${usersToCleanup.length} users' access history`);
    }

    // 2. Eliminar usuarios de prueba
    for (const user of usersToCleanup) {
      await user.destroy();
    }
    log(colors.cyan, `   ✓ Removed ${usersToCleanup.length} test users`);

    // 3. Eliminar historial de accesos de salas de prueba (si quedan)
    const roomIds = roomsToCleanup.map(r => r.id);
    if (roomIds.length > 0) {
      await RoomAccessHistory.destroy({
        where: { roomId: roomIds }
      });
      log(colors.cyan, `   ✓ Removed test rooms' access history`);
    }

    // 4. Eliminar salas de prueba
    for (const room of roomsToCleanup) {
      await room.destroy();
    }
    if (roomsToCleanup.length > 0) {
      log(colors.cyan, `   ✓ Removed ${roomsToCleanup.length} test rooms`);
    }

    log(colors.green, 'All test data removed from database\n');

  } catch (error) {
    console.error('\n');
    log(colors.red, 'ERROR IN TEST:');
    console.error(error);
    console.log('\n');

    // Cleanup en caso de error
    log(colors.yellow, 'Cleaning up after error...');
    try {
      // Eliminar historial de usuarios
      const userIds = usersToCleanup.map(u => u.id);
      if (userIds.length > 0) {
        await RoomAccessHistory.destroy({ where: { userId: userIds } });
      }

      // Eliminar usuarios
      for (const user of usersToCleanup) {
        await user.destroy();
      }

      // Eliminar historial de salas
      const roomIds = roomsToCleanup.map(r => r.id);
      if (roomIds.length > 0) {
        await RoomAccessHistory.destroy({ where: { roomId: roomIds } });
      }

      // Eliminar salas
      for (const room of roomsToCleanup) {
        await room.destroy();
      }

      log(colors.green, 'Test data cleaned up after error\n');
    } catch (cleanupError) {
      log(colors.red, 'Error during cleanup:');
      console.error(cleanupError);
    }
  } finally {
    await sequelize.close();
  }
}

// Ejecutar test
if (require.main === module) {
  runTest();
}

module.exports = { runTest };

