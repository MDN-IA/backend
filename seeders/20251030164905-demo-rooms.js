'use strict';

module.exports = {
  async up (queryInterface) {
    await queryInterface.bulkInsert('Rooms', [
      { code: 'sala-a', name: 'Sala A', temp: null, light: null, hum: null, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-b', name: 'Sala B', temp: 19.5, light: 350, hum: 45.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-c', name: 'Sala C', temp: 24.0, light: 950, hum: 60.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-d', name: 'Sala D', temp: 21.8, light: 350, hum: 55.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-e', name: 'Sala E', temp: 22.3, light: 350, hum: 50.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-f', name: 'Sala F', temp: 20.0, light: 950, hum: 48.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-g', name: 'Sala G', temp: 28.0, light: 350, hum: 70.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-h', name: 'Sala H', temp: 17.0, light: 350, hum: 40.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-i', name: 'Sala I', temp: 23.5, light: 350, hum: 52.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-j', name: 'Sala J', temp: 25.0, light: 950, hum: 65.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-k', name: 'Sala K', temp: 16.5, light: 350, hum: 38.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-l', name: 'Sala L', temp: 27.0, light: 350, hum: 68.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-m', name: 'Sala M', temp: 22.0, light: 950, hum: 50.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-n', name: 'Sala N', temp: 24.5, light: 350, hum: 60.0, createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-o', name: 'Sala O', temp: 21.0, light: 350, hum: 55.0, createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('Rooms', null, {});
  }
};
