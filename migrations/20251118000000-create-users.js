'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: false
      },
      correo: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      contrasena: {
        type: Sequelize.STRING,
        allowNull: false
      },
      qr: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      preferenciaTemperatura: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'WARM'
      },
      esAdmin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      activeRoomCode: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Código de la sala en la que el usuario está actualmente activo'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Añadir índices para mejorar el rendimiento
    await queryInterface.addIndex('Users', ['correo'], {
      name: 'users_correo_index',
      unique: true
    });

    await queryInterface.addIndex('Users', ['qr'], {
      name: 'users_qr_index',
      unique: true,
      where: {
        qr: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};

