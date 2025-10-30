'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Rooms', {
      id: { allowNull:false, autoIncrement:true, primaryKey:true, type: Sequelize.INTEGER },
      code: { type: Sequelize.STRING, allowNull:false, unique:true },
      name: { type: Sequelize.STRING, allowNull:false },
      temp: { type: Sequelize.FLOAT },
      light: { type: Sequelize.FLOAT },
      available: { type: Sequelize.BOOLEAN, defaultValue: false },
      bucket: { type: Sequelize.STRING },
      createdAt: { allowNull:false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull:false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('Rooms'); }
};
