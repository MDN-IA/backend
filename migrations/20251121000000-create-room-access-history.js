'use strict';

/**
 * Migración: Crear tabla de historial de accesos a salas
 *
 * Esta tabla registra cada entrada/salida de usuarios a salas
 * para mejorar las recomendaciones del módulo ML
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RoomAccessHistory', {
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
      roomCode: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Code from the rooom accessed'
      },
      action: {
        type: Sequelize.ENUM('ENTER', 'EXIT'),
        allowNull: false,
        comment: 'Type of access action: enter or exit'
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Exact time of the access event'
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Visit duration in minutes (only for EXIT actions)'
      },
      satisfaction: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Rating of user satisfaction after the visit (1-5)',
        validate: {
          min: 1,
          max: 5
        }
      },
      roomTemperature: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Room temperature at the time of access'
      },
      roomLight: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Light level at the time of access'
      },
      roomHumidity: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Humidity level at the time of access'
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

    // Índices para optimizar consultas del módulo ML
    await queryInterface.addIndex('RoomAccessHistory', ['userId'], {
      name: 'idx_room_access_user'
    });

    await queryInterface.addIndex('RoomAccessHistory', ['roomId'], {
      name: 'idx_room_access_room'
    });

    await queryInterface.addIndex('RoomAccessHistory', ['timestamp'], {
      name: 'idx_room_access_timestamp'
    });

    await queryInterface.addIndex('RoomAccessHistory', ['userId', 'roomId'], {
      name: 'idx_room_access_user_room'
    });

    console.log('Table RoomAccessHistory created with indices for ML module');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    await queryInterface.removeIndex('RoomAccessHistory', 'idx_room_access_user');
    await queryInterface.removeIndex('RoomAccessHistory', 'idx_room_access_room');
    await queryInterface.removeIndex('RoomAccessHistory', 'idx_room_access_timestamp');
    await queryInterface.removeIndex('RoomAccessHistory', 'idx_room_access_user_room');

    // Eliminar tabla
    await queryInterface.dropTable('RoomAccessHistory');

    console.log('Table RoomAccessHistory deleted');
  }
};

