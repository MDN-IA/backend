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
      comment: 'Room id where the user is currently active'
    });

    console.log('Column activeRoomId added to Users');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar columna activeRoomId
    await queryInterface.removeColumn('Users', 'activeRoomId');

    console.log('Column activeRoomId deleted from Users');
  }
};

