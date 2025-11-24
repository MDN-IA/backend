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
      comment: 'Código de la sala para búsquedas rápidas'
    },
    action: {
      type: DataTypes.ENUM('ENTER', 'EXIT'),
      allowNull: false,
      comment: 'Tipo de acción: entrada o salida'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Momento exacto del acceso'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duración de la visita en minutos (se calcula al salir)'
    },
    satisfaction: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Rating de satisfacción del usuario (1-5)',
      validate: {
        min: 1,
        max: 5
      }
    },
    roomTemperature: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Temperatura de la sala al momento del acceso'
    },
    roomLight: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Nivel de luz al momento del acceso'
    },
    roomHumidity: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Humedad al momento del acceso'
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

