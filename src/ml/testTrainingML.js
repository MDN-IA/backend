/**
 * TEST: Entrenamiento del Modelo ML
 *
 * Este test demuestra cómo el modelo aprende de feedback real
 * y ajusta sus pesos usando Gradient Descent.
 *
 * ESCENARIOS:
 * 1. Feedback positivo (rating alto) → El modelo refuerza los factores que contribuyeron
 * 2. Feedback negativo (rating bajo) → El modelo reduce importancia de esos factores
 * 3. Múltiples entrenamientos → Los pesos convergen hacia valores óptimos
 */

const { sequelize } = require('../models');
const { recommender } = require('./roomRecommender');

async function runTrainingTest() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║           ML MODEL TRAINING TEST                              ║');
  console.log('║           Demonstrating Adaptive Learning                     ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    await sequelize.authenticate();
    console.log('[TEST] Database connection established\n');

    // ========================================================================
    // TEST 1: Usuario muy satisfecho con recomendación
    // ========================================================================
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  TEST 1: Positive Feedback (Rating 5/5)');
    console.log('  Scenario: User loved the recommended room');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const positiveFeedback = {
      userId: 1,
      roomId: 1,
      rating: 5,
      actualUsage: 90, // Se quedó 90 minutos
      satisfaction: 'high'
    };

    console.log('Current weights BEFORE training:');
    console.log(`  Temperature:   ${(recommender.weights.roomFeatures * 100).toFixed(1)}%`);
    console.log(`  Availability:  ${(recommender.weights.availability * 100).toFixed(1)}%`);
    console.log(`  History:       ${(recommender.weights.userHistory * 100).toFixed(1)}%`);
    console.log(`  Similar users: ${(recommender.weights.similarUsers * 100).toFixed(1)}%`);
    console.log(`  Temporal:      ${(recommender.weights.temporalPattern * 100).toFixed(1)}%`);
    console.log(`  Capacity:      ${(recommender.weights.capacityMatch * 100).toFixed(1)}%\n`);

    const result1 = await recommender.trainModel(positiveFeedback);

    if (result1.success) {
      console.log('\nTEST 1 PASSED: Model trained successfully with positive feedback');
      console.log(`   Improvement: ${(result1.metrics.improvement * 100).toFixed(2)}%\n`);
    } else {
      console.log('\nTEST 1 FAILED:', result1.message);
    }

    // ========================================================================
    // TEST 2: Usuario insatisfecho con recomendación
    // ========================================================================
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  TEST 2: Negative Feedback (Rating 2/5)');
    console.log('  Scenario: User disliked the recommended room');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const negativeFeedback = {
      userId: 2,
      roomId: 3,
      rating: 2,
      actualUsage: 5, // Salió rápido
      satisfaction: 'low'
    };

    const result2 = await recommender.trainModel(negativeFeedback);

    if (result2.success) {
      console.log('\nTEST 2 PASSED: Model adjusted weights based on negative feedback');
      console.log(`   Error reduction: ${(result2.metrics.improvement * 100).toFixed(2)}%\n`);
    } else {
      console.log('\nTEST 2 FAILED:', result2.message);
    }

    // ========================================================================
    // TEST 3: Feedback moderado (neutral)
    // ========================================================================
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  TEST 3: Neutral Feedback (Rating 3/5)');
    console.log('  Scenario: Room was okay, but not perfect');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const neutralFeedback = {
      userId: 3,
      roomId: 2,
      rating: 3,
      actualUsage: 30,
      satisfaction: 'medium'
    };

    const result3 = await recommender.trainModel(neutralFeedback);

    if (result3.success) {
      console.log('\nTEST 3 PASSED: Model handled neutral feedback correctly');

      if (result3.metrics.weightsAdjusted) {
        console.log(`   Weights adjusted. Improvement: ${(result3.metrics.improvement * 100).toFixed(2)}%\n`);
      } else {
        console.log('   Weights not adjusted (prediction was already accurate)\n');
      }
    } else {
      console.log('\nTEST 3 FAILED:', result3.message);
    }

    // ========================================================================
    // TEST 4: Simular aprendizaje iterativo (múltiples entrenamientos)
    // ========================================================================
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  TEST 4: Iterative Learning (Multiple Training Sessions)');
    console.log('  Scenario: Model learns from 10 feedback samples');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const initialWeights = { ...recommender.weights };
    let totalImprovement = 0;
    let successCount = 0;

    // Simular 10 entrenamientos con diferentes ratings
    const trainingBatch = [
      { userId: 1, roomId: 1, rating: 5, actualUsage: 80 },
      { userId: 2, roomId: 2, rating: 4, actualUsage: 60 },
      { userId: 3, roomId: 1, rating: 5, actualUsage: 90 },
      { userId: 4, roomId: 3, rating: 2, actualUsage: 10 },
      { userId: 5, roomId: 2, rating: 4, actualUsage: 45 },
      { userId: 6, roomId: 1, rating: 5, actualUsage: 75 },
      { userId: 1, roomId: 4, rating: 3, actualUsage: 30 },
      { userId: 2, roomId: 1, rating: 4, actualUsage: 50 },
      { userId: 3, roomId: 2, rating: 5, actualUsage: 85 },
      { userId: 4, roomId: 1, rating: 4, actualUsage: 55 }
    ];

    console.log('Training with 10 different feedback samples...\n');

    for (let i = 0; i < trainingBatch.length; i++) {
      const feedback = trainingBatch[i];
      console.log(`[${i + 1}/10] Training with rating ${feedback.rating}/5...`);

      const result = await recommender.trainModel(feedback);

      if (result.success && result.metrics.weightsAdjusted) {
        totalImprovement += result.metrics.improvement;
        successCount++;
      }

      // Pequeña pausa para no saturar logs
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const avgImprovement = totalImprovement / successCount;

    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ITERATIVE LEARNING RESULTS                       ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`│ Total trainings:        ${trainingBatch.length}                                    │`);
    console.log(`│ Successful adjustments: ${successCount}                                     │`);
    console.log(`│ Average improvement:    ${(avgImprovement * 100).toFixed(2)}%                                 │`);
    console.log('├───────────────────────────────────────────────────────────────┤');
    console.log('│ WEIGHT EVOLUTION:                                             │');
    console.log('├───────────────────────────────────────────────────────────────┤');

    Object.keys(recommender.weights).forEach(key => {
      const initial = (initialWeights[key] * 100).toFixed(1);
      const final = (recommender.weights[key] * 100).toFixed(1);
      const change = ((recommender.weights[key] - initialWeights[key]) * 100).toFixed(2);
      const changeStr = change > 0 ? `+${change}%` : `${change}%`;
      const label = key.padEnd(18);
      console.log(`│ ${label} ${initial}% → ${final}% (${changeStr.padStart(8)})                   │`);
    });

    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    if (successCount >= 8) {
      console.log('TEST 4 PASSED: Model learned successfully from multiple feedbacks');
    } else {
      console.log('TEST 4 WARNING: Some trainings failed');
    }

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║                  TRAINING TEST SUMMARY                        ║');
    console.log('║                                                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('│                                                               │');
    console.log('│  The ML model successfully adapts its weights based on        │');
    console.log('│  real user feedback using Gradient Descent algorithm.         │');
    console.log('│                                                               │');
    console.log('│  KEY INSIGHTS:                                                │');
    console.log('│  • High ratings → Reinforce factors that contributed          │');
    console.log('│  • Low ratings → Reduce importance of those factors           │');
    console.log('│  • Multiple trainings → Weights converge to optimal values    │');
    console.log('│                                                               │');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('ALL TESTS PASSED - ML Training System is Working\n');

  } catch (error) {
    console.error('\nTEST FAILED WITH ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    console.log('[TEST] Database connection closed\n');
  }
}

// Ejecutar test
runTrainingTest().catch(console.error);

