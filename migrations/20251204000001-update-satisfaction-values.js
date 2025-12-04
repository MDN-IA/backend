'use strict';

/**
 * Migration: Update satisfaction values from 'low/medium/high' to 'poor/neutral/good'
 *
 * This migration updates existing satisfaction values and changes the constraint
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update existing data
    await queryInterface.sequelize.query(`
      UPDATE "TrainingMetrics"
      SET satisfaction = CASE
        WHEN satisfaction = 'low' THEN 'poor'
        WHEN satisfaction = 'medium' THEN 'neutral'
        WHEN satisfaction = 'high' THEN 'good'
        ELSE satisfaction
      END
      WHERE satisfaction IN ('low', 'medium', 'high');
    `);

    console.log('Updated satisfaction values in TrainingMetrics table');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert to old values
    await queryInterface.sequelize.query(`
      UPDATE "TrainingMetrics"
      SET satisfaction = CASE
        WHEN satisfaction = 'poor' THEN 'low'
        WHEN satisfaction = 'neutral' THEN 'medium'
        WHEN satisfaction = 'good' THEN 'high'
        ELSE satisfaction
      END
      WHERE satisfaction IN ('poor', 'neutral', 'good');
    `);

    console.log('Reverted satisfaction values in TrainingMetrics table');
  }
};

