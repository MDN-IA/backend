'use strict';

/**
 * Modelo para almacenar métricas de entrenamiento del ML
 * Permite análisis histórico y auditoría del modelo
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrainingMetrics extends Model {
    static associate(models) {
      // Relación con Users
      TrainingMetrics.belongsTo(models.Users, {
        foreignKey: 'userId',
        as: 'user'
      });

      // Relación con Rooms
      TrainingMetrics.belongsTo(models.Rooms, {
        foreignKey: 'roomId',
        as: 'room'
      });
    }

    /**
     * Obtener estadísticas de entrenamiento
     */
    static async getTrainingStats(limit = 100) {
      const metrics = await this.findAll({
        order: [['createdAt', 'DESC']],
        limit,
        include: [
          {
            model: sequelize.models.Users,
            as: 'user',
            attributes: ['id', 'nombre', 'preferenciaTemperatura']
          },
          {
            model: sequelize.models.Rooms,
            as: 'room',
            attributes: ['id', 'name', 'temperatura', 'capacity']
          }
        ]
      });

      // Calcular estadísticas agregadas
      const avgError = metrics.reduce((sum, m) => sum + Math.abs(m.error), 0) / metrics.length;
      const avgImprovement = metrics.reduce((sum, m) => sum + (m.improvement || 0), 0) / metrics.length;
      const trainingCount = metrics.filter(m => m.weightsAdjusted).length;

      return {
        totalTrainings: metrics.length,
        adjustedWeights: trainingCount,
        avgError: avgError,
        avgImprovement: avgImprovement,
        recentMetrics: metrics
      };
    }

    /**
     * Obtener evolución de pesos en el tiempo
     */
    static async getWeightEvolution(limit = 50) {
      const metrics = await this.findAll({
        where: { weightsAdjusted: true },
        order: [['createdAt', 'ASC']],
        limit,
        attributes: ['id', 'createdAt', 'newWeights']
      });

      return metrics.map(m => ({
        timestamp: m.createdAt,
        weights: m.newWeights
      }));
    }
  }

  TrainingMetrics.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    roomId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    actualUsage: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    satisfaction: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['low', 'medium', 'high']]
      }
    },
    originalScore: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    targetScore: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    error: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    newScore: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    newError: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    improvement: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    weightsAdjusted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    oldWeights: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    newWeights: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    learningRate: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.05
    },
    trainingDuration: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'TrainingMetrics',
    tableName: 'TrainingMetrics',
    timestamps: true
  });

  return TrainingMetrics;
};

