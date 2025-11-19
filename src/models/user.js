'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Users extends Model {
    static associate(models) {
      // Define associations here if needed
      // Por ejemplo, si un usuario tiene muchas habitaciones favoritas
      // Users.belongsToMany(models.Rooms, { through: 'UserRooms' });
    }
  }

  Users.init({
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El nombre no puede estar vacío'
        },
        len: {
          args: [2, 100],
          msg: 'El nombre debe tener entre 2 y 100 caracteres'
        }
      }
    },
    correo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'Este correo ya está registrado'
      },
      validate: {
        isEmail: {
          msg: 'Debe proporcionar un correo válido'
        },
        notEmpty: {
          msg: 'El correo no puede estar vacío'
        }
      }
    },
    contrasena: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La contraseña no puede estar vacía'
        },
        len: {
          args: [6, 255],
          msg: 'La contraseña debe tener al menos 6 caracteres'
        }
      }
    },
    qr: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'Código QR único del usuario'
    },
    preferenciaTemperatura: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'WARM',
      validate: {
        isIn: {
          args: [['COLD', 'WARM', 'HOT']],
          msg: 'La preferencia de temperatura debe ser COLD, WARM o HOT'
        }
      },
      comment: 'Preferencia de temperatura del usuario: COLD (frío), WARM (templado), HOT (caliente)'
    },
    esAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si el usuario tiene permisos de administrador'
    },
    activeRoomCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Sala en la que el usuario está actualmente'
    }
  }, {
    sequelize,
    modelName: 'Users',
    tableName: 'Users',
    timestamps: true, // Añade createdAt y updatedAt automáticamente
  });

  return Users;
};

