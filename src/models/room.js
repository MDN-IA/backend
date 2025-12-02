'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Rooms extends Model {
    static associate(models) {
      // Relación con historial de accesos
      Rooms.hasMany(models.RoomAccessHistory, {
        foreignKey: 'roomId',
        as: 'accessHistory'
      });
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
      comment: 'Maximum capacity of people in the room'
    },
    currentOccupancy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Actual number of people in the room'
    }
  }, {
    sequelize,
    modelName: 'Rooms',
  });

  return Rooms;
};