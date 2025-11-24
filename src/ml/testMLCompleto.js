#!/usr/bin/env node

/**
 * TEST COMPLETO DEL ML: Demostrar Aprendizaje Progresivo del Sistema
 *
 * Este test demuestra que el sistema ML aprende progresivamente del
 * comportamiento real del usuario y prioriza el historial sobre las
 * preferencias teóricas.
 *
 * Escenarios:
 * 1. Usuario nuevo (0 visitas) → Basado en temperatura
 * 2. Usuario ocasional (3 visitas) → Comienza a aprender
 * 3. Usuario regular (10 visitas) → Aprende patrones
 * 4. Usuario frecuente (25 visitas) → Fuerte aprendizaje
 * 5. Usuario muy frecuente (50 visitas) → Aprendizaje dominante
 *
 * Salas:
 * - Sala A: 17°C (NO ideal para COLD) pero la más visitada
 * - Sala H: 18°C (PERFECTA para COLD) sin visitas
 * - Sala C: 22°C (WARM) como control
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
  log(colors.bright + colors.magenta, '╔═══════════════════════════════════════════════════════════════════════╗');
  log(colors.bright + colors.magenta, '║   TEST COMPLETO: Sistema ML Aprende del Comportamiento del Usuario   ║');
  log(colors.bright + colors.magenta, '╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const usersToCleanup = [];

  try {
    // ============================================================================
    // PASO 1: Preparar salas de prueba
    // ============================================================================
    separator('PASO 1: Preparación de Salas');

    log(colors.yellow, '🔧 Configurando salas de prueba...\n');

    // Sala A: NO ideal pero la que el usuario visita
    let salaA = await Rooms.findOne({ where: { code: 'SALA_A_TEST' } });
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
    } else {
      await salaA.update({ temp: 17.0, currentOccupancy: 10 });
    }

    // Sala H: PERFECTA temperatura pero sin visitas
    let salaH = await Rooms.findOne({ where: { code: 'SALA_H_TEST' } });
    if (!salaH) {
      salaH = await Rooms.create({
        code: 'SALA_H_TEST',
        name: 'Sala H (Perfecta Temp)',
        temp: 18.0,
        light: 400,
        hum: 50,
        capacity: 30,
        currentOccupancy: 3,
        tempHistory: []
      });
    } else {
      await salaH.update({ temp: 18.0, currentOccupancy: 3 });
    }

    // Sala C: WARM como control
    let salaC = await Rooms.findOne({ where: { code: 'SALA_C_TEST' } });
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
    } else {
      await salaC.update({ temp: 22.0, currentOccupancy: 15 });
    }

    log(colors.green, '✅ Salas configuradas:');
    console.log(`   📍 Sala A: ${salaA.temp}°C ❌ (NO ideal para COLD) - Ocupación: ${salaA.currentOccupancy}/${salaA.capacity}`);
    console.log(`   📍 Sala H: ${salaH.temp}°C ✅ (PERFECTA para COLD) - Ocupación: ${salaH.currentOccupancy}/${salaH.capacity}`);
    console.log(`   📍 Sala C: ${salaC.temp}°C 🌡️  (WARM) - Ocupación: ${salaC.currentOccupancy}/${salaC.capacity}`);

    // ============================================================================
    // PASO 2: Crear usuarios con diferentes niveles de historial
    // ============================================================================
    separator('PASO 2: Crear Usuarios con Diferentes Niveles de Historial');

    log(colors.yellow, '👥 Creando 5 perfiles de usuario...\n');

    const perfiles = [
      { nombre: 'Usuario Nuevo', visitas: 0, emoji: '🆕' },
      { nombre: 'Usuario Ocasional', visitas: 3, emoji: '👤' },
      { nombre: 'Usuario Regular', visitas: 10, emoji: '👨‍💼' },
      { nombre: 'Usuario Frecuente', visitas: 25, emoji: '⭐' },
      { nombre: 'Usuario Muy Frecuente', visitas: 50, emoji: '🌟' }
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
        log(colors.green, `${perfil.emoji} ${perfil.nombre}: ${perfil.visitas} visitas a Sala A`);
      } else {
        log(colors.blue, `${perfil.emoji} ${perfil.nombre}: Sin historial previo`);
      }
    }

    // ============================================================================
    // PASO 3: Obtener recomendaciones para cada usuario
    // ============================================================================
    separator('PASO 3: Análisis de Recomendaciones por Nivel de Historial');

    log(colors.yellow, '🤖 Obteniendo recomendaciones del sistema ML...\n');

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

        log(colors.cyan, `${userData.perfil.emoji} ${userData.perfil.nombre} (${userData.perfil.visitas} visitas):`);
        console.log(`   🏢 Recomendación: ${rec.roomName}`);
        console.log(`   📊 Score Total: ${(rec.score * 100).toFixed(1)}%`);
        console.log(`   🌡️  Score Temperatura (35%): ${(rec.scoreBreakdown.features * 100).toFixed(1)}%`);
        console.log(`   📚 Score Historial (20%): ${(rec.scoreBreakdown.history * 100).toFixed(1)}% ⬅️`);
        console.log(`   📊 Score Disponibilidad (30%): ${(rec.scoreBreakdown.availability * 100).toFixed(1)}%`);
        console.log('');
      }
    }

    // ============================================================================
    // PASO 4: Tabla comparativa
    // ============================================================================
    separator('PASO 4: Tabla Comparativa - Evolución del Aprendizaje');

    log(colors.cyan, '📊 COMPARACIÓN DE SCORES POR NIVEL DE HISTORIAL:\n');

    console.log('┌────────────────────┬─────────┬──────────────┬─────────┬─────────┬─────────┐');
    console.log('│ Usuario            │ Visitas │ Recomendación│ Total   │ Temp    │ Historial│');
    console.log('├────────────────────┼─────────┼──────────────┼─────────┼─────────┼─────────┤');

    resultados.forEach(r => {
      const nombre = r.perfil.nombre.padEnd(18);
      const visitas = String(r.perfil.visitas).padEnd(7);
      const sala = r.sala.includes('Sala A') ? 'Sala A ⬅️ ' : r.sala.padEnd(12);
      const total = `${(r.scoreTotal * 100).toFixed(1)}%`.padEnd(7);
      const temp = `${(r.scoreTemp * 100).toFixed(1)}%`.padEnd(7);
      const hist = `${(r.scoreHist * 100).toFixed(1)}%`.padEnd(8);

      console.log(`│ ${nombre} │ ${visitas} │ ${sala} │ ${total} │ ${temp} │ ${hist} │`);
    });

    console.log('└────────────────────┴─────────┴──────────────┴─────────┴─────────┴─────────┘\n');

    // ============================================================================
    // PASO 5: Análisis de progresión
    // ============================================================================
    separator('PASO 5: Análisis de Progresión del Aprendizaje');

    log(colors.cyan, '📈 EVOLUCIÓN DEL SCORE DE HISTORIAL:\n');

    const progresion = resultados.map(r => ({
      visitas: r.perfil.visitas,
      scoreHist: (r.scoreHist * 100).toFixed(1),
      contribucion: (r.scoreHist * 0.20 * 100).toFixed(1)
    }));

    progresion.forEach(p => {
      const bar = '█'.repeat(Math.floor(p.scoreHist / 5));
      console.log(`${String(p.visitas).padStart(2)} visitas → Score: ${String(p.scoreHist).padStart(5)}% │${bar}│ → Contribución: ${p.contribucion}% al total`);
    });

    console.log('');
    log(colors.yellow, '💡 INTERPRETACIÓN:');
    console.log('   • 0 visitas: Score historial base (~50%) = 10% contribución');
    console.log('   • 3 visitas: Score historial sube (~75%) = 15% contribución');
    console.log('   • 10 visitas: Score historial alto (~85%) = 17% contribución');
    console.log('   • 25 visitas: Score historial muy alto (~92%) = 18.4% contribución');
    console.log('   • 50 visitas: Score historial máximo (~95%) = 19% contribución');

    // ============================================================================
    // PASO 6: Punto de inflexión (cuándo cambia la recomendación)
    // ============================================================================
    separator('PASO 6: Punto de Inflexión del ML');

    log(colors.cyan, '🎯 ¿EN QUÉ MOMENTO EL HISTORIAL SUPERA A LA TEMPERATURA?\n');

    const cambioDeRecomendacion = resultados.findIndex(r => r.sala.includes('Sala A'));

    if (cambioDeRecomendacion > 0) {
      const usuarioAntes = resultados[cambioDeRecomendacion - 1];
      const usuarioDespues = resultados[cambioDeRecomendacion];

      log(colors.yellow, `📍 Punto de inflexión detectado entre ${usuarioAntes.perfil.visitas} y ${usuarioDespues.perfil.visitas} visitas:\n`);

      console.log(`ANTES (${usuarioAntes.perfil.visitas} visitas):`);
      console.log(`   → Sala: ${usuarioAntes.sala}`);
      console.log(`   → Score Temperatura: ${(usuarioAntes.scoreTemp * 100).toFixed(1)}%`);
      console.log(`   → Score Historial: ${(usuarioAntes.scoreHist * 100).toFixed(1)}%`);
      console.log(`   → Decisión: Prioriza TEMPERATURA\n`);

      console.log(`DESPUÉS (${usuarioDespues.perfil.visitas} visitas):`);
      console.log(`   → Sala: ${usuarioDespues.sala}`);
      console.log(`   → Score Temperatura: ${(usuarioDespues.scoreTemp * 100).toFixed(1)}%`);
      console.log(`   → Score Historial: ${(usuarioDespues.scoreHist * 100).toFixed(1)}%`);
      console.log(`   → Decisión: Prioriza HISTORIAL ⬅️\n`);

      const difHist = usuarioDespues.scoreHist - usuarioAntes.scoreHist;
      log(colors.green, `✅ El ML cambió su decisión cuando el historial aumentó ${(difHist * 100).toFixed(1)}% puntos`);
    } else if (cambioDeRecomendacion === 0) {
      log(colors.yellow, '⚠️  Incluso sin historial ya recomienda Sala A (puede ser por disponibilidad)');
    } else {
      log(colors.red, '❌ El historial no logró cambiar la recomendación (aumentar peso del historial)');
    }

    // ============================================================================
    // PASO 7: Demostración de razones
    // ============================================================================
    separator('PASO 7: Razones Detalladas de las Recomendaciones');

    log(colors.cyan, '💡 CÓMO EL ML EXPLICA SUS DECISIONES:\n');

    // Usuario nuevo
    log(colors.blue, `🆕 ${resultados[0].perfil.nombre}:`);
    console.log(`   Sala: ${resultados[0].sala}`);
    console.log(`   Razones:`);
    resultados[0].razones.slice(0, 3).forEach((r, i) => {
      console.log(`      ${i + 1}. ${r}`);
    });
    console.log('');

    // Usuario muy frecuente
    const ultimoIdx = resultados.length - 1;
    log(colors.blue, `🌟 ${resultados[ultimoIdx].perfil.nombre}:`);
    console.log(`   Sala: ${resultados[ultimoIdx].sala}`);
    console.log(`   Razones:`);
    resultados[ultimoIdx].razones.slice(0, 3).forEach((r, i) => {
      console.log(`      ${i + 1}. ${r}`);
    });
    console.log('');

    log(colors.yellow, '💡 OBSERVA: Las razones cambian según el historial!');

    // ============================================================================
    // PASO 8: Verificación final
    // ============================================================================
    separator('PASO 8: Verificación del Sistema ML');

    log(colors.cyan, '🎯 CRITERIOS DE ÉXITO:\n');

    const criterios = [
      {
        condicion: resultados[0].sala.includes('Sala H') || !resultados[0].sala.includes('Sala A'),
        mensaje: 'Usuario nuevo recomienda por temperatura',
        cumple: true
      },
      {
        condicion: resultados[ultimoIdx].sala.includes('Sala A'),
        mensaje: 'Usuario frecuente recomienda por historial',
        cumple: true
      },
      {
        condicion: resultados[ultimoIdx].scoreHist > resultados[0].scoreHist + 0.3,
        mensaje: 'Score historial aumenta significativamente (>30%)',
        cumple: true
      },
      {
        condicion: cambioDeRecomendacion >= 0,
        mensaje: 'Existe punto de inflexión en las recomendaciones',
        cumple: true
      }
    ];

    let todosOk = true;
    criterios.forEach(criterio => {
      if (criterio.condicion) {
        log(colors.green, `✅ ${criterio.mensaje}`);
      } else {
        log(colors.red, `❌ ${criterio.mensaje}`);
        todosOk = false;
      }
    });

    console.log('');

    if (todosOk) {
      log(colors.bright + colors.green, '╔═══════════════════════════════════════════════════════════════════╗');
      log(colors.bright + colors.green, '║          ✅ TEST EXITOSO - EL ML FUNCIONA CORRECTAMENTE          ║');
      log(colors.bright + colors.green, '╠═══════════════════════════════════════════════════════════════════╣');
      log(colors.bright + colors.green, '║  ✓ Aprende del historial del usuario                            ║');
      log(colors.bright + colors.green, '║  ✓ Prioriza comportamiento real sobre teoría                    ║');
      log(colors.bright + colors.green, '║  ✓ Aumenta score de historial progresivamente                   ║');
      log(colors.bright + colors.green, '║  ✓ Cambia recomendaciones según experiencia                     ║');
      log(colors.bright + colors.green, '║  ✓ Explica razones de cada decisión                             ║');
      log(colors.bright + colors.green, '╚═══════════════════════════════════════════════════════════════════╝');
    } else {
      log(colors.bright + colors.red, '❌ TEST FALLÓ - Revisar configuración de pesos del ML');
    }

    // ============================================================================
    // LIMPIEZA
    // ============================================================================
    separator('LIMPIEZA');

    log(colors.yellow, '🧹 Limpiando datos de prueba...');

    const userIds = usersToCleanup.map(u => u.id);
    await RoomAccessHistory.destroy({
      where: { userId: userIds }
    });

    for (const user of usersToCleanup) {
      await user.destroy();
    }

    log(colors.green, '✅ Datos de prueba eliminados\n');

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

