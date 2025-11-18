'use strict';

module.exports = {
  async up (queryInterface) {
    await queryInterface.bulkInsert('Rooms', [
      { code: 'sala-a', name: 'Sala A', temp: null, light: null, hum: null, tempHistory: JSON.stringify([0, 0, 0, 0, 0, 0, 0]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-b', name: 'Sala B', temp: 19.5, light: 350, hum: 45.0, tempHistory: JSON.stringify([19.5, 19.3, 19.7, 19.4, 19.6, 19.2, 19.8]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-c', name: 'Sala C', temp: 24.0, light: 950, hum: 60.0, tempHistory: JSON.stringify([24.0, 24.2, 23.8, 24.1, 23.9, 24.3, 23.7]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-d', name: 'Sala D', temp: 21.8, light: 350, hum: 55.0, tempHistory: JSON.stringify([21.8, 21.5, 22.0, 21.7, 21.9, 21.6, 22.1]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-e', name: 'Sala E', temp: 22.3, light: 350, hum: 50.0, tempHistory: JSON.stringify([22.3, 22.1, 22.5, 22.2, 22.4, 22.0, 22.6]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-f', name: 'Sala F', temp: 20.0, light: 950, hum: 48.0, tempHistory: JSON.stringify([20.0, 20.2, 19.8, 20.1, 19.9, 20.3, 19.7]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-g', name: 'Sala G', temp: 28.0, light: 350, hum: 70.0, tempHistory: JSON.stringify([28.0, 27.8, 28.2, 27.9, 28.1, 27.7, 28.3]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-h', name: 'Sala H', temp: 17.0, light: 350, hum: 40.0, tempHistory: JSON.stringify([17.0, 17.2, 16.8, 17.1, 16.9, 17.3, 16.7]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-i', name: 'Sala I', temp: 23.5, light: 350, hum: 52.0, tempHistory: JSON.stringify([23.5, 23.3, 23.7, 23.4, 23.6, 23.2, 23.8]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-j', name: 'Sala J', temp: 25.0, light: 950, hum: 65.0, tempHistory: JSON.stringify([25.0, 24.8, 25.2, 24.9, 25.1, 24.7, 25.3]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-k', name: 'Sala K', temp: 16.5, light: 350, hum: 38.0, tempHistory: JSON.stringify([16.5, 16.7, 16.3, 16.6, 16.4, 16.8, 16.2]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-l', name: 'Sala L', temp: 27.0, light: 350, hum: 68.0, tempHistory: JSON.stringify([27.0, 26.8, 27.2, 26.9, 27.1, 26.7, 27.3]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-m', name: 'Sala M', temp: 22.0, light: 950, hum: 50.0, tempHistory: JSON.stringify([22.0, 21.8, 22.2, 21.9, 22.1, 21.7, 22.3]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-n', name: 'Sala N', temp: 24.5, light: 350, hum: 60.0, tempHistory: JSON.stringify([24.5, 24.3, 24.7, 24.4, 24.6, 24.2, 24.8]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-o', name: 'Sala O', temp: 21.0, light: 350, hum: 55.0, tempHistory: JSON.stringify([21.0, 20.8, 21.2, 20.9, 21.1, 20.7, 21.3]), tempIndex: 0, createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('Rooms', null, {});
  }
};