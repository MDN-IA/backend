#!/usr/bin/env node

/**
 * TEST COMPLETO: Demostrar que el ML aprende del comportamiento del usuario
 *
 * Escenarios Múltiples:
 * 1. Usuario nuevo (0 visitas) - Basado en temperatura
 * 2. Usuario ocasional (3 visitas) - Comienza a aprender
 * 3. Usuario regular (10 visitas) - Aprende patrones
 * 4. Usuario frecuente (25 visitas) - Fuerte aprendizaje
 * 5. Usuario muy frecuente (50 visitas) - Aprendizaje dominante
 *
 * Salas:
 * - Sala A: 17°C (NO ideal para COLD) - La que visitan
 * - Sala H: 18°C (PERFECTA para COLD) - La ideal teóricamente
 * - Sala C: 22°C (WARM) - Diferente preferencia
 *
 * Objetivo: Demostrar que el ML prioriza comportamiento real sobre preferencias teóricas
 */

const { recommender } = require('./roomRecommender');
const { Users, Rooms, RoomAccessHistory, sequelize } = require('../models');

// Colores
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
async function createUserWithHistory(name, visits, salaA) {
  const user = await Users.create({
    nombre: name,
    correo: `${name.toLowerCase().replace(/\s/g, '_')}@test.com`,
    contrasena: 'test123',
    preferenciaTemperatura: 'COLD',
    esAdmin: false
  });

  // Crear historial de visitas
  for (let i = 0; i < visits; i++) {
    await RoomAccessHistory.create({
      userId: user.id,
      roomId: salaA.id,
      roomCode: salaA.code,
      action: 'ENTER',
      timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
      roomTemperature: salaA.temp,
      roomLight: salaA.light,
      roomHumidity: salaA.hum
    });
  }

  return user;
}

async function runTest() {
  console.log('\n');
  log(colors.bright + colors.magenta, '╔═══════════════════════════════════════════════════════════════════════╗');
  log(colors.bright + colors.magenta, '║  TEST: HISTORIAL vs TEMPERATURA - Usuario COLD con 50 visitas      ║');
  log(colors.bright + colors.magenta, '╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // ============================================================================
    // PASO 1: Preparar datos
    // ============================================================================
    separator('PASO 1: Preparación de Datos');

    log(colors.yellow, '🔧 Creando salas de prueba...\n');

    // Buscar o crear salas
    let salaA = await Rooms.findOne({ where: { code: 'SALA_A_TEST' } });
    let salaH = await Rooms.findOne({ where: { code: 'SALA_H_TEST' } });

    if (!salaA) {
      salaA = await Rooms.create({
        code: 'SALA_A_TEST',
        name: 'Sala A (Visitada)',
        temp: 17.0,  // ❌ NO ideal para COLD (18°C ideal) - 1°C de diferencia
        light: 400,
        hum: 50,
        capacity: 30,
        currentOccupancy: 10,
        tempHistory: []
      });
    } else {
      await salaA.update({ temp: 17.0, currentOccupancy: 10 });
    }

    if (!salaH) {
      salaH = await Rooms.create({
        code: 'SALA_H_TEST',
        name: 'Sala H (Perfecta Temp)',
        temp: 18.0,  // ✅ PERFECTA para COLD (18°C ideal)
        light: 400,
        hum: 50,
        capacity: 30,
        currentOccupancy: 3,  // ✅ Mejor disponibilidad (solo 3 ocupados)
        tempHistory: []
      });
    } else {
      await salaH.update({ temp: 18.0, currentOccupancy: 3 });
    }

    log(colors.green, '✅ Salas creadas:');
    console.log(`   📍 Sala A: Temp=${salaA.temp}°C (NO ideal para COLD), Ocupación=${salaA.currentOccupancy}/${salaA.capacity}`);
    console.log(`   📍 Sala H: Temp=${salaH.temp}°C (PERFECTA para COLD), Ocupación=${salaH.currentOccupancy}/${salaH.capacity}`);

    // ============================================================================
    // PASO 2: Usuario SIN historial
    // ============================================================================
    separator('PASO 2: Usuario SIN Historial (Baseline)');

    log(colors.yellow, '👤 Creando usuario COLD sin historial...\n');

    const userNoHistory = await Users.create({
      nombre: 'Usuario COLD Sin Historial',
      correo: 'cold_no_history@test.com',
      contrasena: 'test123',
      preferenciaTemperatura: 'COLD',
      esAdmin: false
    });

    log(colors.blue, `✅ Usuario creado: ${userNoHistory.nombre}`);
    log(colors.blue, `   Preferencia: COLD (18°C ideal)\n`);

    log(colors.yellow, '🤖 Obteniendo recomendación SIN historial...\n');

    const recNoHistory = await recommender.getTopRecommendation(userNoHistory.id, {
      preferredCapacity: 'medium',
      preferredTimeSlot: 'morning'
    });

    if (recNoHistory) {
      log(colors.cyan, '📊 RESULTADO SIN HISTORIAL:');
      console.log(`   🏢 Sala recomendada: ${recNoHistory.roomName}`);
      console.log(`   📊 Score total: ${(recNoHistory.score * 100).toFixed(1)}%`);
      console.log(`   🌡️  Score temperatura: ${(recNoHistory.scoreBreakdown.features * 100).toFixed(1)}%`);
      console.log(`   📚 Score historial: ${(recNoHistory.scoreBreakdown.history * 100).toFixed(1)}%`);
      console.log(`   💡 Razón principal: ${recNoHistory.reasons[0]}\n`);

      if (recNoHistory.roomName.includes('Sala H')) {
        log(colors.green, '✅ CORRECTO: Sin historial recomienda Sala H (mejor temperatura)');
      } else {
        log(colors.yellow, '⚠️  Sala recomendada no es la H (puede ser por disponibilidad)');
      }
    } else {
      log(colors.red, '❌ No se pudo obtener recomendación');
    }

    // ============================================================================
    // PASO 3: Usuario CON historial (50 visitas a Sala A)
    // ============================================================================
    separator('PASO 3: Usuario CON Historial (50 visitas a Sala A)');

    log(colors.yellow, '👤 Creando usuario COLD con historial...\n');

    const userWithHistory = await Users.create({
      nombre: 'Usuario COLD Con Historial',
      correo: 'cold_with_history@test.com',
      contrasena: 'test123',
      preferenciaTemperatura: 'COLD',
      esAdmin: false
    });

    log(colors.blue, `✅ Usuario creado: ${userWithHistory.nombre}`);
    log(colors.blue, `   Preferencia: COLD (18°C ideal)\n`);

    log(colors.yellow, '📝 Registrando 50 visitas a Sala A...\n');

    // Crear 50 visitas a Sala A
    for (let i = 0; i < 50; i++) {
      await RoomAccessHistory.create({
        userId: userWithHistory.id,
        roomId: salaA.id,
        roomCode: salaA.code,
        action: 'ENTER',
        timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Últimos 50 días
        roomTemperature: salaA.temp,
        roomLight: salaA.light,
        roomHumidity: salaA.hum
      });
    }

    log(colors.green, `✅ 50 visitas registradas a Sala A (Temp: ${salaA.temp}°C)\n`);

    log(colors.yellow, '🤖 Obteniendo recomendación CON historial...\n');

    const recWithHistory = await recommender.getTopRecommendation(userWithHistory.id, {
      preferredCapacity: 'medium',
      preferredTimeSlot: 'morning'
    });

    if (recWithHistory) {
      log(colors.cyan, '📊 RESULTADO CON HISTORIAL:');
      console.log(`   🏢 Sala recomendada: ${recWithHistory.roomName}`);
      console.log(`   📊 Score total: ${(recWithHistory.score * 100).toFixed(1)}%`);
      console.log(`   🌡️  Score temperatura: ${(recWithHistory.scoreBreakdown.features * 100).toFixed(1)}%`);
      console.log(`   📚 Score historial: ${(recWithHistory.scoreBreakdown.history * 100).toFixed(1)}%`);
      console.log(`   💡 Razones:`);
      recWithHistory.reasons.forEach((reason, i) => {
        console.log(`      ${i + 1}. ${reason}`);
      });
      console.log('');

      if (recWithHistory.roomName.includes('Sala A')) {
        log(colors.green, '✅ CORRECTO: Con historial recomienda Sala A (por las 50 visitas)');
      } else {
        log(colors.red, '❌ ERROR: Debería recomendar Sala A pero recomendó otra sala');
      }
    } else {
      log(colors.red, '❌ No se pudo obtener recomendación');
    }

    // ============================================================================
    // PASO 4: Análisis comparativo
    // ============================================================================
    separator('PASO 4: Análisis Comparativo');

    log(colors.cyan, '📊 COMPARACIÓN DE SCORES:\n');

    console.log('┌────────────────────────┬─────────────────┬─────────────────┐');
    console.log('│ Factor                 │ Sin Historial   │ Con Historial   │');
    console.log('├────────────────────────┼─────────────────┼─────────────────┤');

    if (recNoHistory && recWithHistory) {
      const tempNoHist = (recNoHistory.scoreBreakdown.features * 100).toFixed(1);
      const tempWithHist = (recWithHistory.scoreBreakdown.features * 100).toFixed(1);
      console.log(`│ 🌡️  Temperatura (35%)  │ ${tempNoHist.padEnd(15)}│ ${tempWithHist.padEnd(15)}│`);

      const availNoHist = (recNoHistory.scoreBreakdown.availability * 100).toFixed(1);
      const availWithHist = (recWithHistory.scoreBreakdown.availability * 100).toFixed(1);
      console.log(`│ 📊 Disponibilidad (30%)│ ${availNoHist.padEnd(15)}│ ${availWithHist.padEnd(15)}│`);

      const histNoHist = (recNoHistory.scoreBreakdown.history * 100).toFixed(1);
      const histWithHist = (recWithHistory.scoreBreakdown.history * 100).toFixed(1);
      console.log(`│ 📚 Historial (20%)     │ ${histNoHist.padEnd(15)}│ ${histWithHist.padEnd(15)}│`);

      console.log('├────────────────────────┼─────────────────┼─────────────────┤');

      const totalNoHist = (recNoHistory.score * 100).toFixed(1);
      const totalWithHist = (recWithHistory.score * 100).toFixed(1);
      console.log(`│ TOTAL                  │ ${totalNoHist.padEnd(15)}│ ${totalWithHist.padEnd(15)}│`);
      console.log('└────────────────────────┴─────────────────┴─────────────────┘\n');

      // Calcular diferencias
      const historialDiff = recWithHistory.scoreBreakdown.history - recNoHistory.scoreBreakdown.history;
      const totalDiff = recWithHistory.score - recNoHistory.score;

      log(colors.cyan, '📈 ANÁLISIS:');
      console.log(`   ➤ Diferencia en score de historial: ${(historialDiff * 100).toFixed(1)}% puntos`);
      console.log(`   ➤ Diferencia en score total: ${(totalDiff * 100).toFixed(1)}% puntos\n`);

      // Calcular contribuciones al score total
      const tempContribution = recWithHistory.scoreBreakdown.features * 0.40;
      const histContribution = recWithHistory.scoreBreakdown.history * 0.12;

      log(colors.cyan, '💡 CONTRIBUCIÓN AL SCORE TOTAL:');
      console.log(`   🌡️  Temperatura (40% peso): ${(tempContribution * 100).toFixed(1)}% puntos`);
      console.log(`   📚 Historial (12% peso): ${(histContribution * 100).toFixed(1)}% puntos\n`);

      // Verificación final
      log(colors.cyan, '🎯 VERIFICACIÓN DEL TEST:');

      const testPassed =
        (!recNoHistory.roomName.includes('Sala A') || recNoHistory.roomName.includes('Sala H')) &&
        recWithHistory.roomName.includes('Sala A') &&
        recWithHistory.scoreBreakdown.history > 0.8;

      if (testPassed) {
        log(colors.bright + colors.green, '\n✅ ¡TEST EXITOSO!');
        console.log('   ✓ Sin historial: NO recomienda Sala A (o recomienda Sala H)');
        console.log('   ✓ Con historial: SÍ recomienda Sala A');
        console.log('   ✓ Score de historial aumentó significativamente (>80%)');
        console.log('   ✓ El historial de 50 visitas superó la preferencia de temperatura');
      } else {
        log(colors.bright + colors.red, '\n❌ TEST FALLÓ');

        if (recNoHistory.roomName.includes('Sala A') && !recNoHistory.roomName.includes('Sala H')) {
          console.log('   ✗ Sin historial ya recomienda Sala A (debería recomendar Sala H)');
        }

        if (!recWithHistory.roomName.includes('Sala A')) {
          console.log('   ✗ Con historial NO recomienda Sala A (debería recomendarla por las 50 visitas)');
        }

        if (recWithHistory.scoreBreakdown.history <= 0.8) {
          console.log('   ✗ Score de historial muy bajo (<80%)');
        }

        log(colors.yellow, '\n💡 POSIBLES CAUSAS:');
        console.log('   • El peso del historial (12%) no es suficiente');
        console.log('   • La disponibilidad está afectando mucho (30%)');
        console.log('   • La temperatura tiene demasiado peso (40%)');
        console.log('\n   Considera ajustar los pesos en roomRecommender.js');
      }
    }

    // ============================================================================
    // LIMPIEZA
    // ============================================================================
    separator('LIMPIEZA');

    log(colors.yellow, '🧹 Limpiando datos de prueba...');

    // Eliminar historial
    await RoomAccessHistory.destroy({
      where: {
        userId: [userNoHistory.id, userWithHistory.id]
      }
    });

    // Eliminar usuarios
    await userNoHistory.destroy();
    await userWithHistory.destroy();

    // Opcional: eliminar salas de prueba
    // await salaA.destroy();
    // await salaH.destroy();

    log(colors.green, '✅ Datos de prueba eliminados\n');

    console.log('');
    log(colors.bright + colors.magenta, '════════════════════════════════════════════════════════════════════════');
    log(colors.bright + colors.green, '                        TEST COMPLETADO                                  ');
    log(colors.bright + colors.magenta, '════════════════════════════════════════════════════════════════════════');
    console.log('\n');

  } catch (error) {
    console.error('\n');
    log(colors.red, '❌ ERROR EN EL TEST:');
    console.error(error);
    console.log('\n');
  } finally {
    await sequelize.close();
  }
}

// Ejecutar test
if (require.main === module) {
  runTest();
}

module.exports = { runTest };

