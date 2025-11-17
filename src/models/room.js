'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Rooms extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }

  Rooms.init({
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    temp: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    light: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    hum: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Rooms',
  });

  return Rooms;
};
