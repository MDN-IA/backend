'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Users extends Model {
    static associate(models) {
      // Relación con historial de accesos
      Users.hasMany(models.RoomAccessHistory, {
        foreignKey: 'userId',
        as: 'accessHistory'
      });
    }
  }

  Users.init({
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'The name cannot be empty'
        },
        len: {
          args: [2, 100],
          msg: 'The name must be between 2 and 100 characters long'
        }
      }
    },
    correo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'This email is already registered'
      },
      validate: {
        isEmail: {
          msg: 'A valid email must be provided'
        },
        notEmpty: {
          msg: 'The email cannot be empty'
        }
      }
    },
    contrasena: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'The password cannot be empty'
        },
        len: {
          args: [6, 255],
          msg: 'The password must be at least 6 characters long'
        }
      }
    },
    qr: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'Unique QR code of the user'
    },
    preferenciaTemperatura: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'WARM',
      validate: {
        isIn: {
          args: [['COLD', 'WARM', 'HOT']],
          msg: 'The temperature preference must be COLD, WARM, or HOT'
        }
      },
      comment: 'User temperature preference: COLD (cold), WARM (warm), HOT (hot)'
    },
    esAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates whether the user has admin permissions'
    },
    activeRoomCode: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: 'Room the user is currently in'
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Token to reset the password'
    },
    resetTokenExpiration: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration date of the password reset token'
    }
  }, {
    sequelize,
    modelName: 'Users',
    tableName: 'Users',
    timestamps: true, // Añade createdAt y updatedAt automáticamente
  });

  return Users;
};

