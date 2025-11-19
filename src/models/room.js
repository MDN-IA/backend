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
    },
    tempHistory: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [0, 0, 0, 0, 0, 0, 0]
    },
    tempIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Capacidad máxima de personas en la sala'
    },
    currentOccupancy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Número actual de personas en la sala'
    }
  }, {
    sequelize,
    modelName: 'Rooms',
  });

  return Rooms;
};