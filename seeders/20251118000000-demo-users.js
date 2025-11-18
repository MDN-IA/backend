'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Hash de las contraseñas (todas serán "password123")
    const hashedPassword = await bcrypt.hash('password123', 10);

    await queryInterface.bulkInsert('Users', [
      {
        nombre: 'Juan Pérez',
        correo: 'juan.perez@example.com',
        contrasena: hashedPassword,
        qr: 'QR001-JUAN-PEREZ',
        preferenciaTemperatura: 'WARM',
        esAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    console.log('✓ Usuarios de demostración insertados correctamente');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};

