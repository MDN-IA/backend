const { Users } = require('../models');
const bcrypt = require('bcrypt');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

/**
 * Obtener todos los usuarios
 */
async function getUsers(req, res) {
  try {
    console.log('[getUsers] Obteniendo todos los usuarios...');
    const users = await Users.findAll({
      attributes: { exclude: ['contrasena'] }, // No enviar contraseñas
      order: [['id', 'ASC']]
    });
    console.log(`[getUsers] Se encontraron ${users.length} usuarios`);
    res.json(users);
  } catch (e) {
    console.error('[getUsers] Error obteniendo usuarios:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error obteniendo usuarios', details: e.message });
  }
}

/**
 * Obtener un usuario por ID
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    console.log(`[getUserById] Buscando usuario con ID: ${id}`);

    const user = await Users.findByPk(id, {
      attributes: { exclude: ['contrasena'] } // No enviar contraseña
    });

    if (!user) {
      console.log(`[getUserById] Usuario con ID ${id} no encontrado`);
      return res.status(404).json({
        error: 'Usuario no encontrado',
        id: parseInt(id)
      });
    }

    console.log(`[getUserById] Usuario encontrado: ${user.nombre} (${user.correo})`);
    res.json(user);
  } catch (e) {
    console.error('[getUserById] Error obteniendo usuario:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error obteniendo usuario', details: e.message });
  }
}

/**
 * Obtener un usuario por correo electrónico
 */
async function getUserByEmail(req, res) {
  try {
    const { correo } = req.params;
    console.log(`[getUserByEmail] Buscando usuario con correo: ${correo}`);

    const user = await Users.findOne({
      where: { correo },
      attributes: { exclude: ['contrasena'] }
    });

    if (!user) {
      console.log(`[getUserByEmail] Usuario con correo ${correo} no encontrado`);
      return res.status(404).json({
        error: 'Usuario no encontrado',
        correo
      });
    }

    console.log(`[getUserByEmail] Usuario encontrado: ${user.nombre}`);
    res.json(user);
  } catch (e) {
    console.error('[getUserByEmail] Error obteniendo usuario:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error obteniendo usuario', details: e.message });
  }
}

/**
 * Obtener un usuario por código QR
 */
async function getUserByQR(req, res) {
  try {
    const { qr } = req.params;
    console.log(`[getUserByQR] Buscando usuario con QR: ${qr}`);

    const user = await Users.findOne({
      where: { qr },
      attributes: { exclude: ['contrasena'] }
    });

    if (!user) {
      console.log(`[getUserByQR] Usuario con QR ${qr} no encontrado`);
      return res.status(404).json({
        error: 'Usuario no encontrado',
        qr
      });
    }

    console.log(`[getUserByQR] Usuario encontrado: ${user.nombre}`);
    res.json(user);
  } catch (e) {
    console.error('[getUserByQR] Error obteniendo usuario:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error obteniendo usuario', details: e.message });
  }
}

/**
 * Crear un nuevo usuario
 */
async function createUser(req, res) {
  try {
    const { nombre, correo, contrasena, preferenciaTemperatura, esAdmin } = req.body;
    console.log(`[createUser] Creando usuario: ${nombre} (${correo})`);

    // Validar campos requeridos
    if (!nombre || !correo || !contrasena) {
      console.log('[createUser] Faltan campos requeridos');
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        required: ['nombre', 'correo', 'contrasena']
      });
    }

    // Validar preferencia de temperatura si se proporciona
    if (preferenciaTemperatura && !['COLD', 'WARM', 'HOT'].includes(preferenciaTemperatura)) {
      console.log(`[createUser] Preferencia de temperatura inválida: ${preferenciaTemperatura}`);
      return res.status(400).json({
        error: 'Preferencia de temperatura inválida',
        validValues: ['COLD', 'WARM', 'HOT']
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);
    console.log('[createUser] Contraseña hasheada correctamente');

    const qrCodeValue = uuidv4(); // Generar QR único

    const newUser = await Users.create({
      nombre,
      correo,
      contrasena: hashedPassword,
      qr: qrCodeValue, // Guardar QR
      preferenciaTemperatura: preferenciaTemperatura || 'WARM',
      esAdmin: esAdmin || false
    });

    console.log(`[createUser] Usuario creado exitosamente con ID: ${newUser.id} - Admin: ${newUser.esAdmin}`);
    console.log(`[createUser] Usuario creado con QR: ${qrCodeValue}`);


    // Devolver usuario sin contraseña
    const userResponse = newUser.toJSON();
    delete userResponse.contrasena;

    res.status(201).json(userResponse);
  } catch (e) {
    console.error('[createUser] Error creando usuario:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);

    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'El correo o QR ya está registrado',
        details: e.message
      });
    }

    if (e.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Error: Check the data introduced',
        details: e.errors.map(err => err.message)
      });
    }

    res.status(500).json({ error: 'Error creando usuario', details: e.message });
  }
}

/**
 * Actualizar un usuario
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { nombre, correo, contrasena, qr, preferenciaTemperatura, esAdmin } = req.body;
    console.log(`[updateUser] Actualizando usuario con ID: ${id}`);

    const user = await Users.findByPk(id);

    if (!user) {
      console.log(`[updateUser] Usuario con ID ${id} no encontrado`);
      return res.status(404).json({
        error: 'Usuario no encontrado',
        id: parseInt(id)
      });
    }

    // Validar preferencia de temperatura si se proporciona
    if (preferenciaTemperatura && !['COLD', 'WARM', 'HOT'].includes(preferenciaTemperatura)) {
      console.log(`[updateUser] Preferencia de temperatura inválida: ${preferenciaTemperatura}`);
      return res.status(400).json({
        error: 'Preferencia de temperatura inválida',
        validValues: ['COLD', 'WARM', 'HOT']
      });
    }

    // Preparar datos a actualizar
    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (correo) updateData.correo = correo;
    if (qr !== undefined) updateData.qr = qr;
    if (preferenciaTemperatura !== undefined) updateData.preferenciaTemperatura = preferenciaTemperatura;
    if (esAdmin !== undefined) updateData.esAdmin = esAdmin;

    // Si se proporciona contraseña, hashearla
    if (contrasena) {
      updateData.contrasena = await bcrypt.hash(contrasena, 10);
      console.log('[updateUser] Nueva contraseña hasheada');
    }

    await user.update(updateData);
    console.log(`[updateUser] Usuario actualizado exitosamente: ${user.nombre} - Admin: ${user.esAdmin}`);

    // Devolver usuario sin contraseña
    const userResponse = user.toJSON();
    delete userResponse.contrasena;

    res.json(userResponse);
  } catch (e) {
    console.error('[updateUser] Error actualizando usuario:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);

    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'El correo o QR ya está registrado',
        details: e.message
      });
    }

    if (e.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Error de validación',
        details: e.errors.map(err => err.message)
      });
    }

    res.status(500).json({ error: 'Error actualizando usuario', details: e.message });
  }
}

/**
 * Eliminar un usuario
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    console.log(`[deleteUser] Eliminando usuario con ID: ${id}`);

    const user = await Users.findByPk(id);

    if (!user) {
      console.log(`[deleteUser] Usuario con ID ${id} no encontrado`);
      return res.status(404).json({
        error: 'Usuario no encontrado',
        id: parseInt(id)
      });
    }

    const userName = user.nombre;
    await user.destroy();
    console.log(`[deleteUser] Usuario eliminado exitosamente: ${userName}`);

    res.json({
      message: 'Usuario eliminado exitosamente',
      nombre: userName
    });
  } catch (e) {
    console.error('[deleteUser] Error eliminando usuario:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error eliminando usuario', details: e.message });
  }
}

/**
 * Login de usuario
 */
async function loginUser(req, res) {
  try {
    const { correo, contrasena } = req.body;
    console.log(`[loginUser] Intento de login para: ${correo}`);
    console.log(`[loginUser] Contraseña introducida: ${contrasena}`);

    if (!correo || !contrasena) {
      console.log('[loginUser] Faltan credenciales');
      return res.status(400).json({
        error: 'Se requiere correo y contraseña'
      });
    }

    const user = await Users.findOne({ where: { correo } });

    if (!user) {
      console.log(`[loginUser] Usuario no encontrado: ${correo}`);
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    const isPasswordValid = await bcrypt.compare(contrasena, user.contrasena);

    if (!isPasswordValid) {
      console.log(`[loginUser] Contraseña incorrecta para: ${correo}`);
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    console.log(`[loginUser] Login exitoso para: ${user.nombre} - Preferencia: ${user.preferenciaTemperatura} - Admin: ${user.esAdmin}`);

    // Devolver usuario sin contraseña
    const userResponse = user.toJSON();
    delete userResponse.contrasena;

    res.json({
      message: 'Login exitoso',
      user: userResponse
    });
  } catch (e) {
    console.error('[loginUser] Error en login:');
    console.error('Mensaje:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error en login', details: e.message });
  }
}

/** 
 * Obtener imagen PNG del QR de un usuario
 */
async function getQRImage(req, res) {
  try {
    const { id } = req.params;
    console.log(`[getQRImage] Obteniendo imagen QR para usuario con ID: ${id}`);

    const user = await Users.findByPk(id);
    
    if (!user || !user.qr) {
      console.log(`[getQRImage] Usuario o QR no encontrado para ID: ${id}`);
      return res.status(404).json({ error: 'Usuario o QR no encontrado' });
    }

    console.log(`[getQRImage] Generando imagen QR para: ${user.nombre}`);

    const pngDataUrl = await QRCode.toDataURL(user.qr, { 
      margin: 1, 
      scale: 6,
      errorCorrectionLevel: 'H'
    });

    const base64 = pngDataUrl.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');

    console.log(`[getQRImage] Enviando imagen QR: ${buffer.length} bytes`);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

    console.log(`[getQRImage] Imagen QR enviada exitosamente para usuario: ${user.nombre}`);

  } catch (e) {
    console.error(`[getQRImage] Error: ${e.message}`);
    res.status(500).json({ error: 'Error generando QR', details: e.message });
  }
}

/**
 * Solicitar reset de contraseña
 */
async function forgotPassword(req, res) {
  try {
    const { correo } = req.body;
    console.log(`[forgotPassword] Solicitando reset para: ${correo}`);

    const user = await Users.findOne({ where: { correo } });

    if (!user) {
      console.log(`[forgotPassword] Usuario no encontrado: ${correo}`);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Generar código de 5 dígitos
    const resetToken = Math.floor(10000 + Math.random() * 90000).toString();
    const resetTokenExpiration = new Date(Date.now() + 3600000); // 1 hora

    await user.update({
      resetToken: crypto.createHash('sha256').update(resetToken).digest('hex'),
      resetTokenExpiration
    });

    // Configurar nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: correo,
      subject: 'Código de recuperación - IOT Mobile',
      html: `
        <h2>Restablecer Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña.</p>
        <p>Tu código de recuperación es:</p>
        <h3 style="background-color: #42A5F5; color: white; padding: 15px; border-radius: 5px; text-align: center; font-family: monospace; letter-spacing: 2px; font-size: 32px;">
          ${resetToken}
        </h3>
        <p>Introduce este código en la app IOT Mobile para restablecer tu contraseña.</p>
        <p style="margin-top: 20px; font-size: 12px; color: #757575;">
          Este código expira en 1 hora.
        </p>
        <p style="font-size: 12px; color: #757575;">
          Si no solicitaste esto, ignora este correo.
        </p>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`[forgotPassword] Email de reset enviado a: ${correo}`);
    res.json({ message: 'Se ha enviado un código de recuperación a tu correo electrónico' });

  } catch (e) {
    console.error(`[forgotPassword] Error: ${e.message}`);
    res.status(500).json({ error: 'Error solicitando reset de contraseña' });
  }
}

/**
 * Verificar token de reset
 */
async function verifyResetToken(req, res) {
  try {
    const { token } = req.params;
    console.log(`[verifyResetToken] Verificando token...`);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await Users.findOne({
      where: {
        resetToken: hashedToken,
        resetTokenExpiration: {
          [require('sequelize').Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      console.log(`[verifyResetToken] Token inválido o expirado`);
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    res.json({ message: 'Token válido', userId: user.id });

  } catch (e) {
    console.error(`[verifyResetToken] Error: ${e.message}`);
    res.status(500).json({ error: 'Error verificando token', details: e.message });
  }
}

/**
 * Reset de contraseña con token
 */
async function resetPassword(req, res) {
  try {
    const { token, nuevaContrasena } = req.body;
    console.log(`[resetPassword] Reseteando contraseña...`);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await Users.findOne({
      where: {
        resetToken: hashedToken,
        resetTokenExpiration: {
          [require('sequelize').Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      console.log(`[resetPassword] Token inválido o expirado`);
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

    await user.update({
      contrasena: hashedPassword,
      resetToken: null,
      resetTokenExpiration: null
    });

    console.log(`[resetPassword] Contraseña actualizada para usuario: ${user.correo}`);
    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (e) {
    console.error(`[resetPassword] Error: ${e.message}`);
    res.status(500).json({ error: 'Error reseteando contraseña', details: e.message });
  }
}

module.exports = { 
  getUsers, 
  getUserById, 
  getUserByEmail, 
  getUserByQR, 
  createUser, 
  updateUser, 
  deleteUser, 
  loginUser, 
  getQRImage,
  forgotPassword,
  verifyResetToken,
  resetPassword
};

