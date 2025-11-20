'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Hash de las contraseñas (todas serán "password123")
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Generar UUIDs únicos para los QR
    const qr1 = uuidv4();
    const qr2 = uuidv4();
    const qr3 = uuidv4();
    const qr4 = uuidv4();
    const qr5 = uuidv4();
    const qr6 = uuidv4();

    

    await queryInterface.bulkInsert('Users', [
      {
        nombre: 'Juan Pérez',
        correo: 'juan.perez@example.com',
        contrasena: hashedPassword,
        qr: qr1,
        preferenciaTemperatura: 'WARM',
        esAdmin: true,
        activeRoomCode: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'María García',
        correo: 'maria.garcia@example.com',
        contrasena: hashedPassword,
        qr: qr2,
        preferenciaTemperatura: 'COLD',
        esAdmin: false,
        activeRoomCode: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Carlos López',
        correo: 'carlos.lopez@example.com',
        contrasena: hashedPassword,
        qr: qr3,
        preferenciaTemperatura: 'HOT',
        esAdmin: false,
        activeRoomCode: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Ana Martínez',
        correo: 'ana.martinez@example.com',
        contrasena: hashedPassword,
        qr: qr4,
        preferenciaTemperatura: 'WARM',
        esAdmin: false,
        activeRoomCode: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'David Rodríguez',
        correo: 'david.rodriguez@example.com',
        contrasena: hashedPassword,
        qr: qr5,
        preferenciaTemperatura: 'COLD',
        esAdmin: false,
        activeRoomCode: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Mario Caudevilla',
        correo: 'mario9trzn@gmail.com',
        contrasena: hashedPassword,
        qr: qr6,
        preferenciaTemperatura: 'COLD',
        esAdmin: false,
        activeRoomCode: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    console.log('✓ Usuarios de demostración insertados correctamente');
    console.log(`QR de Juan Pérez (Admin): ${qr1}`);
    console.log(`QR de María García: ${qr2}`);
    console.log(`QR de Carlos López: ${qr3}`);
    console.log(`QR de Ana Martínez: ${qr4}`);
    console.log(`QR de David Rodríguez: ${qr5}`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};