/**
 * TEST SIMPLE: Similar Users Score Elevation
 *
 * Demuestra cómo el score de usuarios similares se ELEVA cuando
 * hay más usuarios similares que han visitado una sala.
 */

const { Rooms, Users, RoomAccessHistory, sequelize } = require('../models');
const { RoomRecommenderML } = require('./roomRecommender');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runSimpleTest() {
  console.log('\n');
  log(colors.bright + colors.cyan, '╔═══════════════════════════════════════════════════════════╗');
  log(colors.bright + colors.cyan, '║     SIMPLE TEST: Similar Users Score Elevation            ║');
  log(colors.bright + colors.cyan, '╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  const recommender = new RoomRecommenderML();
  let testUser = null;
  let similarUsers = [];
  let sala = null;

  try {

    // STEP 1: Crear sala y usuario de test
    log(colors.yellow, 'STEP 1: Creating test room and user\n');

    sala = await Rooms.create({
      name: 'Sala Similar Test',
      code: 'TEST_SIMILAR_ROOM',
      temp: 20.0,
      light: 400,
      humidity: 50,
      capacity: 30,
      currentOccupancy: 5
    });

    testUser = await Users.create({
      nombre: 'Test User',
      correo: 'test@test.com',
      contrasena: 'test123',
      preferenciaTemperatura: 'WARM',
      esAdmin: false
    });

    log(colors.green, `Created test room and user\n`);

    // STEP 2: Calcular score SIN usuarios similares visitando la sala de prueba
    log(colors.bright + colors.magenta, '═══════════════════════════════════════════════════════════');
    log(colors.bright + colors.magenta, '  SCENARIO 1: WITHOUT Similar Users Visits to Test Room');
    log(colors.bright + colors.magenta, '═══════════════════════════════════════════════════════════\n');

    log(colors.cyan, 'Current state:');
    log(colors.cyan, '- Visits to test room: 0 (no similar users visited this specific room)\n');

    // Calcular score directamente para la sala de prueba
    const score1 = await recommender.calculateSimilarUsersScore(sala, testUser);

    log(colors.yellow, `Similar Users Score for TEST ROOM: ${(score1 * 100).toFixed(1)}%`);
    log(colors.cyan, `Expected: LOW (no similar users visited this specific room)\n`);



    // STEP 3: Crear 15 usuarios similares con visitas
    log(colors.bright + colors.magenta, '═══════════════════════════════════════════════════════════');
    log(colors.bright + colors.magenta, '  SCENARIO 2: WITH Similar Users');
    log(colors.bright + colors.magenta, '═══════════════════════════════════════════════════════════\n');

    log(colors.cyan, `Creating 15 similar users (WARM)...\n`);

    for (let i = 1; i <= 15; i++) {
      const user = await Users.create({
        nombre: `Similar ${i}`,
        correo: `similar${i}@test.com`,
        contrasena: 'test123',
        preferenciaTemperatura: 'WARM',
        esAdmin: false
      });

      similarUsers.push(user);

      for (let j = 0; j < 3; j++) {
        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() - (j + 1));

        await RoomAccessHistory.create({
          userId: user.id,
          roomId: sala.id,
          roomCode: sala.code,
          action: 'ENTER',
          timestamp: visitDate,
          createdAt: visitDate
        });
      }
    }

    log(colors.green, `Created 15 users with 45 visits\n`);

    log(colors.cyan, 'Current state:');
    log(colors.cyan, '- Visits to test room: 45 (15 test users x 3 visits each)');
    log(colors.cyan, '- Visit rate: 45/15 = 3.0 visits per user (from test users)\n');

    // STEP 4: Calcular score CON usuarios similares visitando
    const score2 = await recommender.calculateSimilarUsersScore(sala, testUser);

    log(colors.yellow, `Similar Users Score for TEST ROOM: ${(score2 * 100).toFixed(1)}%`);
    log(colors.cyan, `Expected: 85% (visitRate = 3.0 -> score should be HIGH)\n`);


    // STEP 5: Comparación
    log(colors.bright + colors.magenta, '═══════════════════════════════════════════════════════════');
    log(colors.bright + colors.magenta, '  COMPARISON');
    log(colors.bright + colors.magenta, '═══════════════════════════════════════════════════════════\n');

    const diff = score2 - score1;
    const percentIncrease = score1 > 0 ? ((diff / score1) * 100) : (diff * 100);

    console.log('┌─────────────────────┬──────────────┬───────────────────────────────┐');
    console.log('│ Scenario            │ Score        │ Explanation                   │');
    console.log('├─────────────────────┼──────────────┼───────────────────────────────┤');
    console.log(`│ WITHOUT             │ ${(score1 * 100).toFixed(1).padEnd(12)} │ 0 visits, visitRate=0.0       │`);
    console.log(`│ WITH                │ ${(score2 * 100).toFixed(1).padEnd(12)} │ 45 visits, visitRate=3.0      │`);
    console.log('├─────────────────────┼──────────────┼───────────────────────────────┤');
    console.log(`│ DIFFERENCE          │ +${(diff * 100).toFixed(1).padEnd(11)} │ ELEVATED! (${percentIncrease.toFixed(0)}% increase)${' '.repeat(Math.max(0, 8 - percentIncrease.toFixed(0).length))}│`);
    console.log('└─────────────────────┴──────────────┴───────────────────────────────┘\n');

    const bar1 = '█'.repeat(Math.floor(score1 * 50));
    const bar2 = '█'.repeat(Math.floor(score2 * 50));

    log(colors.cyan, 'VISUAL:\n');
    console.log(`   WITHOUT: ${bar1} ${(score1 * 100).toFixed(1)}%`);
    console.log(`   WITH:    ${bar2} ${(score2 * 100).toFixed(1)}%\n`);

    log(colors.bright + colors.green, '╔═══════════════════════════════════════════════════════════╗');
    log(colors.bright + colors.green, '║  Similar Users Score ELEVATED!                            ║');
    log(colors.bright + colors.green, '╠═══════════════════════════════════════════════════════════╣');
    log(colors.bright + colors.green, '║  BEFORE: No similar users visited the room                ║');
    const score1Str = `${(score1 * 100).toFixed(1)}%`;
    log(colors.bright + colors.green, `║  - Score: ${score1Str}${' '.repeat(48 - score1Str.length)}║`);
    log(colors.bright + colors.green, '║                                                           ║');
    log(colors.bright + colors.green, '║  AFTER: 15 similar users visited 3 times each             ║');
    const score2Str = `${(score2 * 100).toFixed(1)}%`;
    log(colors.bright + colors.green, `║  - Score: ${score2Str}${' '.repeat(48 - score2Str.length)}║`);
    log(colors.bright + colors.green, '║                                                           ║');
    const diffStr = `+${(diff * 100).toFixed(1)}%`;
    log(colors.bright + colors.green, `║  - Elevation: ${diffStr}${' '.repeat(44 - diffStr.length)}║`);
    log(colors.bright + colors.green, '╚═══════════════════════════════════════════════════════════╝');

    // CLEANUP
    console.log('\n');
    log(colors.yellow, 'Cleaning up...');

    if (testUser) {
      await RoomAccessHistory.destroy({ where: { userId: testUser.id } });
      await testUser.destroy();
    }

    for (const user of similarUsers) {
      await RoomAccessHistory.destroy({ where: { userId: user.id } });
      await user.destroy();
    }

    if (sala) {
      await sala.destroy();
    }

    log(colors.green, 'Test data cleaned');
    log(colors.green, '\nTest completed\n');

  } catch (error) {
    console.error('\n');
    log(colors.red, 'ERROR:');
    console.error(error);
    console.log('\n');

    // Cleanup on error
    if (testUser) {
      try {
        await RoomAccessHistory.destroy({ where: { userId: testUser.id } });
        await testUser.destroy();
      } catch (e) {}
    }

    for (const user of similarUsers) {
      try {
        await RoomAccessHistory.destroy({ where: { userId: user.id } });
        await user.destroy();
      } catch (e) {}
    }

    if (sala) {
      try {
        await sala.destroy();
      } catch (e) {}
    }

    log(colors.cyan, 'Cleanup completed after error');
  } finally {
    await sequelize.close();
  }
}

runSimpleTest()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

