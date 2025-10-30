'use strict';

module.exports = {
  async up (queryInterface) {
    await queryInterface.bulkInsert('Rooms', [
      { code: 'sala-a', name: 'Sala A', temp: 22.3, light: 900, available: true,  bucket: 'templada', createdAt: new Date(), updatedAt: new Date() },
      { code: 'sala-b', name: 'Sala B', temp: 19.5, light: 350, available: false, bucket: 'fría',     createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('Rooms', null, {});
  }
};
