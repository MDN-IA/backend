'use strict';

/**
 * Migration: Add scoreBreakdown column to TrainingMetrics table
 *
 * This allows storing detailed breakdown of ML scores for each factor:
 * - features (temperature matching)
 * - availability
 * - history (user visit history)
 * - similarUsers
 * - temporal (time patterns)
 * - capacity
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('TrainingMetrics', 'scoreBreakdown', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Detailed breakdown of ML scores by factor'
    });

    console.log('Added scoreBreakdown column to TrainingMetrics table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('TrainingMetrics', 'scoreBreakdown');
    console.log('Removed scoreBreakdown column from TrainingMetrics table');
  }
};

