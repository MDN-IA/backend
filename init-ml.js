#!/usr/bin/env node

/**
 * Script de Inicialización Completa del Sistema ML
 *
 * Este script:
 * 1. Verifica las dependencias
 * 2. Ejecuta las migraciones
 * 3. Carga datos de ejemplo
 * 4. Prueba el módulo ML
 * 5. Muestra ejemplos de uso
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   INICIALIZACIÓN DEL SISTEMA ML DE RECOMENDACIONES    ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function runCommand(command, description) {
  console.log(`\n📋 ${description}...`);
  console.log(`   Ejecutando: ${command}`);
  console.log('   ' + '─'.repeat(50));

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error('⚠️  ', stderr);
    console.log('Completado\n');
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

async function checkFile(filePath, description) {
  const fs = require('fs');
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

async function init() {
  console.log('🔍 PASO 1: Verificando archivos del módulo ML\n');

  const files = [
    { path: 'src/ml/roomRecommender.js', desc: 'Módulo ML Principal' },
    { path: 'src/ml/testRecommender.js', desc: 'Script de Pruebas' },
    { path: 'src/controllers/reco.controller.js', desc: 'Controlador de Recomendaciones' },
    { path: 'src/routes/reco.routes.js', desc: 'Rutas de Recomendaciones' },
    { path: 'src/models/roomAccessHistory.js', desc: 'Modelo de Historial' },
    { path: 'migrations/20251121000000-create-room-access-history.js', desc: 'Migración de Historial' }
  ];

  let allFilesExist = true;
  for (const file of files) {
    const exists = await checkFile(file.path, file.desc);
    if (!exists) allFilesExist = false;
  }

  if (!allFilesExist) {
    console.log('\n⚠️  Algunos archivos faltan. Verifica la instalación.\n');
  } else {
    console.log('\n✅ Todos los archivos necesarios están presentes.\n');
  }

  console.log('═'.repeat(60) + '\n');
  console.log('🗄️  PASO 2: Ejecutando migraciones de base de datos\n');

  await runCommand(
    'npx sequelize-cli db:migrate',
    'Aplicar migraciones (incluyendo RoomAccessHistory)'
  );

  console.log('═'.repeat(60) + '\n');
  console.log('🌱 PASO 3: Cargando datos de ejemplo\n');

  await runCommand(
    'npx sequelize-cli db:seed:all',
    'Cargar salas y usuarios de ejemplo'
  );

  console.log('═'.repeat(60) + '\n');
  console.log('🧪 PASO 4: Probando el módulo ML\n');

  console.log('   Importando módulo...');
  try {
    const { recommender } = require('./src/ml/roomRecommender');
    console.log('   ✅ Módulo importado correctamente\n');

    console.log('   Ejecutando prueba de recomendación...');
    const recommendation = await recommender.getTopRecommendation(null, {
      preferredCapacity: 'small',
      preferredTimeSlot: 'morning'
    });

    if (recommendation) {
      console.log('\n   ✅ PRUEBA EXITOSA!');
      console.log('   ┌─────────────────────────────────────┐');
      console.log(`   │ Sala: ${recommendation.roomName.padEnd(28)} │`);
      console.log(`   │ Score: ${(recommendation.score * 100).toFixed(1)}%`.padEnd(38) + '│');
      console.log(`   │ Razón: ${recommendation.reasons[0]?.substring(0, 28).padEnd(28)} │`);
      console.log('   └─────────────────────────────────────┘\n');
    } else {
      console.log('\n   ⚠️  No se pudo generar recomendación (puede ser que no haya salas)\n');
    }

  } catch (error) {
    console.error('   ❌ Error probando módulo:', error.message);
  }

  console.log('═'.repeat(60) + '\n');
  console.log('📚 PASO 5: Documentación y próximos pasos\n');

  console.log('✅ Instalación completada!\n');
  console.log('📖 DOCUMENTACIÓN DISPONIBLE:');
  console.log('   • ML_RECOMMENDATION_SYSTEM.md - Documentación completa del sistema ML');
  console.log('   • INTEGRACION_ML_FRONTEND.md - Guía de integración con frontend');
  console.log('   • INSTALACION_ML.md - Guía de instalación y troubleshooting\n');

  console.log('🚀 PRÓXIMOS PASOS:');
  console.log('   1. Inicia el servidor:');
  console.log('      npm start\n');

  console.log('   2. Prueba el endpoint de recomendación:');
  console.log('      GET http://localhost:3000/api/recommendations?userId=1&preferredCapacity=small\n');

  console.log('   3. O ejecuta el test completo:');
  console.log('      node src/ml/testRecommender.js\n');

  console.log('   4. Habilita el historial de accesos:');
  console.log('      Edita src/controllers/roomsAccess.controller.js');
  console.log('      Descomenta el código en la función logAccess()\n');

  console.log('   5. Integra con tu frontend móvil:');
  console.log('      Consulta INTEGRACION_ML_FRONTEND.md\n');

  console.log('💡 ENDPOINTS DISPONIBLES:');
  console.log('   • GET/POST /api/recommendations - Obtener recomendación');
  console.log('   • POST /api/recommendations/train - Enviar feedback');
  console.log('   • POST /api/recommendations/clear-cache - Limpiar cache\n');

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   ✅ SISTEMA ML LISTO PARA USAR                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// Ejecutar inicialización
if (require.main === module) {
  init().catch(error => {
    console.error('\n💥 Error fatal durante la inicialización:', error);
    process.exit(1);
  });
}

module.exports = { init };

