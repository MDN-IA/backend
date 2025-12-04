'use strict';

/**
 * Migración para tabla de métricas de entrenamiento ML
 * Almacena el historial de entrenamiento del modelo para análisis y auditoría
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TrainingMetrics', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      roomId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Rooms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Feedback del usuario
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Rating del usuario (1-5)'
      },
      actualUsage: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Tiempo real de uso en minutos'
      },
      satisfaction: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Nivel de satisfacción (low, medium, high)'
      },
      // Scores
      originalScore: {
        type: Sequelize.FLOAT,
        allowNull: false,
        comment: 'Score predicho antes del entrenamiento'
      },
      targetScore: {
        type: Sequelize.FLOAT,
        allowNull: false,
        comment: 'Score objetivo basado en feedback'
      },
      error: {
        type: Sequelize.FLOAT,
        allowNull: false,
        comment: 'Error de predicción (target - original)'
      },
      newScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Score después del entrenamiento'
      },
      newError: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Nuevo error después del ajuste'
      },
      improvement: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Mejora obtenida (|error| - |newError|)'
      },
      // Pesos del modelo
      weightsAdjusted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      oldWeights: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Pesos antes del entrenamiento'
      },
      newWeights: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Pesos después del entrenamiento'
      },
      // Metadata
      learningRate: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0.05,
        comment: 'Tasa de aprendizaje usada'
      },
      trainingDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duración del entrenamiento en ms'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Índices para mejorar consultas
    await queryInterface.addIndex('TrainingMetrics', ['userId']);
    await queryInterface.addIndex('TrainingMetrics', ['roomId']);
    await queryInterface.addIndex('TrainingMetrics', ['rating']);
    await queryInterface.addIndex('TrainingMetrics', ['createdAt']);
    await queryInterface.addIndex('TrainingMetrics', ['weightsAdjusted']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TrainingMetrics');
  }
};

