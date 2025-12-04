/**
 * TEST SIMPLE: Temporal Pattern Score Elevation
 *
 * Demuestra de forma simple y directa cómo el score temporal se ELEVA
 * cuando el usuario visita una sala a una hora específica dentro del baremo "morning".
 *
 * Escenario SUPER SIMPLE:
 * - Usuario A: Visita Sala A 15 veces a las 9:00 AM (morning)
 * - Usuario B: NO ha visitado nunca Sala A
 *
 * Test: Ambos piden recomendación a las 9:00 AM
 * - Usuario A → Score temporal ALTO (ha visitado en ese horario)
 * - Usuario B → Score temporal BAJO (sin historial)
 *
 * Resultado: Se ve claramente la diferencia en el score temporal
 */

const { Rooms, Users, RoomAccessHistory, sequelize } = require('../models');
const { RoomRecommenderML } = require('./roomRecommender');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runSimpleTest() {
  console.log('\n');
  log(colors.bright + colors.cyan, '╔═══════════════════════════════════════════════════════════╗');
  log(colors.bright + colors.cyan, '║     SIMPLE TEST: Temporal Pattern Score Elevation         ║');
  log(colors.bright + colors.cyan, '╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  const recommender = new RoomRecommenderML();
  let userA = null; // Usuario CON historial
  let userB = null; // Usuario SIN historial
  let sala = null;

  try {
    // ============================================================================
    // STEP 1: Setup - Create test room and users
    // ============================================================================
    log(colors.yellow, 'STEP 1: Setup test data\n');

    // Crear sala de prueba con temperatura de 18°C
    sala = await Rooms.create({
      name: 'Sala Prueba',
      code: 'TEST_TEMP_ROOM',
      temp: 18.0,
      light: 300,
      humidity: 45,
      capacity: 20,
      currentOccupancy: 0
    });

    log(colors.green, `Created test room: ${sala.name} (${sala.temp}°C)`);

    // Crear Usuario A - CON historial en 9:00 AM
    userA = await Users.create({
      nombre: 'User A - WITH morning pattern',
      correo: 'userA_temporal@test.com',
      contrasena: 'test123',
      preferenciaTemperatura: 'COLD',
      esAdmin: false
    });

    // Crear Usuario B - SIN historial
    userB = await Users.create({
      nombre: 'User B - NO pattern',
      correo: 'userB_temporal@test.com',
      contrasena: 'test123',
      preferenciaTemperatura: 'COLD',
      esAdmin: false
    });

    log(colors.green, `User A created: ${userA.nombre}`);
    log(colors.green, `User B created: ${userB.nombre}\n`);

    // ============================================================================
    // STEP 2: Create visiting pattern for User A ONLY - 15 visits at 9:00 AM
    // ============================================================================
    log(colors.yellow, 'STEP 2: Creating visiting pattern for User A\n');

    log(colors.cyan, `Creating 15 visits for User A to ${sala.name} at 9:00 AM (MORNING)...`);

    for (let i = 0; i < 15; i++) {
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() - (i + 1)); // Different days
      visitDate.setHours(9, 0, 0, 0); // Always at 9:00 AM (MORNING)

      await RoomAccessHistory.create({
        userId: userA.id,
        roomId: sala.id,
        roomCode: sala.code,
        action: 'ENTER',
        timestamp: visitDate,
        createdAt: visitDate
      });
    }

    log(colors.green, `User A: 15 visits at 9:00 AM (MORNING baremo)`);
    log(colors.green, `User B: 0 visits (NO pattern)\n`);

    // ============================================================================
    // STEP 3: Mock time to 9:00 AM and get recommendations for BOTH users
    // ============================================================================
    log(colors.bright + colors.magenta, '═══════════════════════════════════════════════════════════');
    log(colors.bright + colors.magenta, '  TEST: Request recommendations at 9:00 AM (MORNING)');
    log(colors.bright + colors.magenta, '═══════════════════════════════════════════════════════════\n');

    log(colors.cyan, 'Current time: 9:00 AM (MORNING baremo)\n');

    // Mock time to 9:00 AM
    const originalDateNow = Date.now;
    const mockDate9AM = new Date();
    mockDate9AM.setHours(9, 0, 0, 0);
    Date.now = () => mockDate9AM.getTime();

    // Get recommendation for User A (WITH pattern)
    log(colors.yellow, 'User A (WITH pattern at 9 AM):');
    const recUserA = await recommender.getTopRecommendation(userA.id, {
      preferredCapacity: 'medium',
      preferredTimeSlot: 'morning'
    });

    // Get recommendation for User B (NO pattern)
    log(colors.yellow, 'User B (NO pattern):');
    const recUserB = await recommender.getTopRecommendation(userB.id, {
      preferredCapacity: 'medium',
      preferredTimeSlot: 'morning'
    });

    Date.now = originalDateNow;

    console.log('');


    // ============================================================================
    // STEP 4: COMPARISON - User A vs User B
    // ============================================================================
    log(colors.bright + colors.magenta, '═══════════════════════════════════════════════════════════');
    log(colors.bright + colors.magenta, '  COMPARISON: Score Elevation Demonstration');
    log(colors.bright + colors.magenta, '═══════════════════════════════════════════════════════════\n');

    if (recUserA && recUserB) {
      const scoreUserA = recUserA.scoreBreakdown.temporal;
      const scoreUserB = recUserB.scoreBreakdown.temporal;
      const difference = scoreUserA - scoreUserB;

      // Mostrar resultados
      log(colors.bright + colors.green, 'RESULTS:\n');

      console.log('┌─────────────────────────┬──────────────┬──────────────────────────────┐');
      console.log('│ User                    │ Temporal     │ Explanation                  │');
      console.log('│                         │ Score        │                              │');
      console.log('├─────────────────────────┼──────────────┼──────────────────────────────┤');
      console.log(`│ User A (WITH pattern)   │ ${(scoreUserA * 100).toFixed(1).padEnd(12)} │ 15 visits at 9 AM            │`);
      console.log(`│ User B (NO pattern)     │ ${(scoreUserB * 100).toFixed(1).padEnd(12)} │ No visits at 9 AM            │`);
      console.log('├─────────────────────────┼──────────────┼──────────────────────────────┤');
      console.log(`│ DIFFERENCE              │ ${(difference * 100).toFixed(1).padEnd(12)} │ Pattern ELEVATES score!      │`);
      console.log('└─────────────────────────┴──────────────┴──────────────────────────────┘\n');

      // Visual comparison
      log(colors.cyan, 'VISUAL COMPARISON:');
      const barUserA = '█'.repeat(Math.floor(scoreUserA * 40));
      const barUserB = '█'.repeat(Math.floor(scoreUserB * 40));
      console.log(`   User A (WITH): ${barUserA} ${(scoreUserA * 100).toFixed(1)}%`);
      console.log(`   User B (NO):   ${barUserB} ${(scoreUserB * 100).toFixed(1)}%\n`);

      log(colors.bright + colors.yellow, `ELEVATION: +${(difference * 100).toFixed(1)}% for user with pattern!\n`);

      // Test success criteria: User A should have significantly higher score
      const threshold = 0.50; // 50% difference

      if (difference >= threshold) {
        log(colors.bright + colors.green, '╔═══════════════════════════════════════════════════════════╗');
        log(colors.bright + colors.green, '║  TEST PASSED - Temporal Pattern Score ELEVATES!           ║');
        log(colors.bright + colors.green, '╠═══════════════════════════════════════════════════════════╣');
        log(colors.bright + colors.green, '║  The ML system successfully learns:                       ║');
        log(colors.bright + colors.green, '║  - User A visits Sala Prueba at 9 AM (morning)            ║');
        log(colors.bright + colors.green, '║  - User B has NO visits at that time                      ║');
        log(colors.bright + colors.green, '║                                                           ║');
        log(colors.bright + colors.green, `║  - User A score: ${(scoreUserA * 100).toFixed(1)}% (HIGH)${' '.repeat(30 - (scoreUserA * 100).toFixed(1).length)}   ║`);
        log(colors.bright + colors.green, `║  - User B score: ${(scoreUserB * 100).toFixed(1)}% (LOW)${' '.repeat(31 - (scoreUserB * 100).toFixed(1).length)}   ║`);
        const diffStr = `${(difference * 100).toFixed(1)}%`;
        const threshStr = `${(threshold * 100).toFixed(0)}%`;
        const padding = 26 - diffStr.length - threshStr.length;
        log(colors.bright + colors.green, `║  - Difference: ${diffStr} (threshold: ${threshStr})${' '.repeat(Math.max(0, padding))}   ║`);
        log(colors.bright + colors.green, '╚═══════════════════════════════════════════════════════════╝');
      } else {
        log(colors.red, 'TEST FAILED - Score elevation not significant enough');
        log(colors.yellow, `   Difference: ${(difference * 100).toFixed(1)}% (required: >=${(threshold * 100).toFixed(0)}%)`);
        log(colors.yellow, '   Possible reasons:');
        console.log('   - Temporal pattern detection not working correctly');
        console.log('   - Pattern data not properly saved in database');
        console.log('   - Time mocking not working as expected');
        console.log('   - calculateTemporalScore() logic may need adjustment');
      }
    } else {
      log(colors.red, 'Could not get recommendations for both users');
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================
    console.log('\n');
    log(colors.yellow, 'Cleaning up test data...');

    if (userA) {
      await RoomAccessHistory.destroy({ where: { userId: userA.id } });
      await userA.destroy();
      log(colors.green, 'User A removed');
    }

    if (userB) {
      await RoomAccessHistory.destroy({ where: { userId: userB.id } });
      await userB.destroy();
      log(colors.green, 'User B removed');
    }

    if (sala) {
      await sala.destroy();
      log(colors.green, 'Test room removed');
    }

    log(colors.green, '\nAll test data removed\n');

  } catch (error) {
    console.error('\n');
    log(colors.red, 'ERROR IN TEST:');
    console.error(error);
    console.log('\n');

    // Cleanup on error
    if (userA) {
      try {
        await RoomAccessHistory.destroy({ where: { userId: userA.id } });
        await userA.destroy();
      } catch (e) {
        console.error('Error during cleanup userA:', e.message);
      }
    }

    if (userB) {
      try {
        await RoomAccessHistory.destroy({ where: { userId: userB.id } });
        await userB.destroy();
      } catch (e) {
        console.error('Error during cleanup userB:', e.message);
      }
    }

    if (sala) {
      try {
        await sala.destroy();
      } catch (e) {
        console.error('Error during cleanup sala:', e.message);
      }
    }
  } finally {
    await sequelize.close();
  }
}

// Execute test
if (require.main === module) {
  runSimpleTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = runSimpleTest;

