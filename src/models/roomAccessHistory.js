'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RoomAccessHistory extends Model {
    static associate(models) {
      // Relación con Users
      RoomAccessHistory.belongsTo(models.Users, {
        foreignKey: 'userId',
        as: 'user'
      });

      // Relación con Rooms
      RoomAccessHistory.belongsTo(models.Rooms, {
        foreignKey: 'roomId',
        as: 'room'
      });
    }
  }

  RoomAccessHistory.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    roomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Rooms',
        key: 'id'
      }
    },
    roomCode: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Code of the room for quick searches'
    },
    action: {
      type: DataTypes.ENUM('ENTER', 'EXIT'),
      allowNull: false,
      comment: 'Action type: entry or exit'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Exact moment of access'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration of the visit in minutes (calculated upon exit)'
    },
    satisfaction: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User satisfaction rating (1-5)',
      validate: {
        min: 1,
        max: 5
      }
    },
    roomTemperature: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Room temperature at the time of access'
    },
    roomLight: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Light level at the time of access'
    },
    roomHumidity: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Room humidity at the time of access'
    }
  }, {
    sequelize,
    modelName: 'RoomAccessHistory',
    tableName: 'RoomAccessHistory',
    timestamps: true,
    indexes: [
      {
        name: 'idx_room_access_user',
        fields: ['userId']
      },
      {
        name: 'idx_room_access_room',
        fields: ['roomId']
      },
      {
        name: 'idx_room_access_timestamp',
        fields: ['timestamp']
      },
      {
        name: 'idx_room_access_user_room',
        fields: ['userId', 'roomId']
      }
    ]
  });

  return RoomAccessHistory;
};

