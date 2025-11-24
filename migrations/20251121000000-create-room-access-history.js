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
        comment: 'Código de la sala para búsquedas rápidas'
      },
      action: {
        type: Sequelize.ENUM('ENTER', 'EXIT'),
        allowNull: false,
        comment: 'Tipo de acción: entrada o salida'
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Momento exacto del acceso'
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duración de la visita en minutos (se calcula al salir)'
      },
      satisfaction: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Rating de satisfacción del usuario (1-5)',
        validate: {
          min: 1,
          max: 5
        }
      },
      roomTemperature: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Temperatura de la sala al momento del acceso'
      },
      roomLight: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Nivel de luz al momento del acceso'
      },
      roomHumidity: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Humedad al momento del acceso'
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

    console.log('✅ Tabla RoomAccessHistory creada con índices optimizados para ML');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    await queryInterface.removeIndex('RoomAccessHistory', 'idx_room_access_user');
    await queryInterface.removeIndex('RoomAccessHistory', 'idx_room_access_room');
    await queryInterface.removeIndex('RoomAccessHistory', 'idx_room_access_timestamp');
    await queryInterface.removeIndex('RoomAccessHistory', 'idx_room_access_user_room');

    // Eliminar tabla
    await queryInterface.dropTable('RoomAccessHistory');

    console.log('✅ Tabla RoomAccessHistory eliminada');
  }
};

