'use strict';

/**
 * Migración: Agregar campo activeRoomId a la tabla Users
 *
 * Este campo almacena el ID de la sala activa del usuario
 * Complementa a activeRoomCode para mejor performance
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar columna activeRoomId
    await queryInterface.addColumn('Users', 'activeRoomId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'Rooms',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID de la sala en la que el usuario está actualmente'
    });

    console.log('✅ Columna activeRoomId agregada a Users');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar columna activeRoomId
    await queryInterface.removeColumn('Users', 'activeRoomId');

    console.log('✅ Columna activeRoomId eliminada de Users');
  }
};

