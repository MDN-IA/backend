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
    console.log('[getUsers] Retrieving all the users...');
    const users = await Users.findAll({
      attributes: { exclude: ['contrasena'] }, // No enviar contraseñas
      order: [['id', 'ASC']]
    });
    console.log(`[getUsers] Found ${users.length} users`);
    res.json(users);
  } catch (e) {
    console.error('[getUsers] Error retrieving users:');
    console.error('Message:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error getting users', details: e.message });
  }
}

/**
 * Obtener un usuario por ID
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    console.log(`[getUserById] Looking for user with ID: ${id}`);

    const user = await Users.findByPk(id, {
      attributes: { exclude: ['contrasena'] } // No enviar contraseña
    });

    if (!user) {
      console.log(`[getUserById] User with ID ${id} not found`);
      return res.status(404).json({
        error: 'User not found',
        id: parseInt(id)
      });
    }

    console.log(`[getUserById] User found: ${user.nombre} (${user.correo})`);
    res.json(user);
  } catch (e) {
    console.error('[getUserById] Error retrieving user:');
    console.error('Message:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error getting user', details: e.message });
  }
}

/**
 * Obtener un usuario por correo electrónico
 */
async function getUserByEmail(req, res) {
  try {
    const { correo } = req.params;
    console.log(`[getUserByEmail] Searching for user with email: ${correo}`);

    const user = await Users.findOne({
      where: { correo },
      attributes: { exclude: ['contrasena'] }
    });

    if (!user) {
      console.log(`[getUserByEmail] User with email ${correo} not found`);
      return res.status(404).json({
        error: 'User not found',
        correo
      });
    }

    console.log(`[getUserByEmail] User found: ${user.nombre}`);
    res.json(user);
  } catch (e) {
    console.error('[getUserByEmail] Error retrieving user:');
    console.error('Message:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error getting user', details: e.message });
  }
}

/**
 * Obtener un usuario por código QR
 */
async function getUserByQR(req, res) {
  try {
    const { qr } = req.params;
    console.log(`[getUserByQR] Searching for user with QR: ${qr}`);

    const user = await Users.findOne({
      where: { qr },
      attributes: { exclude: ['contrasena'] }
    });

    if (!user) {
      console.log(`[getUserByQR] User with QR ${qr} not found`);
      return res.status(404).json({
        error: 'User not found',
        qr
      });
    }

    console.log(`[getUserByQR] User found: ${user.nombre}`);
    res.json(user);
  } catch (e) {
    console.error('[getUserByQR] Error retrieving user:');
    console.error('Message:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error getting user', details: e.message });
  }
}

/**
 * Crear un nuevo usuario
 */
async function createUser(req, res) {
  try {
    const { nombre, correo, contrasena, preferenciaTemperatura, esAdmin } = req.body;
    console.log(`[createUser] Creating user: ${nombre} (${correo})`);

    // Validar campos requeridos
    if (!nombre || !correo || !contrasena) {
      console.log('[createUser] Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['nombre', 'correo', 'contrasena']
      });
    }

    // Validar preferencia de temperatura si se proporciona
    if (preferenciaTemperatura && !['COLD', 'WARM', 'HOT'].includes(preferenciaTemperatura)) {
      console.log(`[createUser] Invalid temperature preference: ${preferenciaTemperatura}`);
      return res.status(400).json({
        error: 'Invalid temperature preference',
        validValues: ['COLD', 'WARM', 'HOT']
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);
    console.log('[createUser] Password hashed successfully');

    const qrCodeValue = uuidv4(); // Generar QR único

    const newUser = await Users.create({
      nombre,
      correo,
      contrasena: hashedPassword,
      qr: qrCodeValue, // Guardar QR
      preferenciaTemperatura: preferenciaTemperatura || 'WARM',
      esAdmin: esAdmin || false
    });

    console.log(`[createUser] User created successfully with ID: ${newUser.id} - Admin: ${newUser.esAdmin}`);
    console.log(`[createUser] User created with QR: ${qrCodeValue}`);


    // Devolver usuario sin contraseña
    const userResponse = newUser.toJSON();
    delete userResponse.contrasena;

    res.status(201).json(userResponse);
  } catch (e) {
    console.error('[createUser] Error creating user:');
    console.error('Message:', e.message);
    console.error('Stack:', e.stack);

    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Email or QR already registered',
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
    console.log(`[updateUser] Updating user with ID: ${id}`);

    const user = await Users.findByPk(id);

    if (!user) {
      console.log(`[updateUser] User with ID ${id} not found`);
      return res.status(404).json({
        error: 'User not found',
        id: parseInt(id)
      });
    }

    // Validar preferencia de temperatura si se proporciona
    if (preferenciaTemperatura && !['COLD', 'WARM', 'HOT'].includes(preferenciaTemperatura)) {
      console.log(`[updateUser] Invalid temperature preference: ${preferenciaTemperatura}`);
      return res.status(400).json({
        error: 'Invalid temperature preference',
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
      console.log('[updateUser] New password hashed');
    }

    await user.update(updateData);
    console.log(`[updateUser] User updated successfully: ${user.nombre} - Admin: ${user.esAdmin}`);

    // Devolver usuario sin contraseña
    const userResponse = user.toJSON();
    delete userResponse.contrasena;

    res.json(userResponse);
  } catch (e) {
    console.error('[updateUser] Error updating user:');
    console.error('Message:', e.message);
    console.error('Stack:', e.stack);

    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'El correo o QR ya está registrado',
        details: e.message
      });
    }

    if (e.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: e.errors.map(err => err.message)
      });
    }

    res.status(500).json({ error: 'Error updating user', details: e.message });
  }
}

/**
 * Eliminar un usuario
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    console.log(`[deleteUser] Deleting user with ID: ${id}`);

    const user = await Users.findByPk(id);

    if (!user) {
      console.log(`[deleteUser] User with ID ${id} not found`);
      return res.status(404).json({
        error: 'User not found',
        id: parseInt(id)
      });
    }

    const userName = user.nombre;
    await user.destroy();
    console.log(`[deleteUser] User deleted successfully: ${userName}`);

    res.json({
      message: 'User deleted successfully',
      nombre: userName
    });
  } catch (e) {
    console.error('[deleteUser] Error deleting user:');
    console.error('Message:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error deleting user', details: e.message });
  }
}

/**
 * Login de usuario
 */
async function loginUser(req, res) {
  try {
    const { correo, contrasena } = req.body;
    console.log(`[loginUser] Attempting login for: ${correo}`);
    console.log(`[loginUser] Entered password: ${contrasena}`);

    if (!correo || !contrasena) {
      console.log('[loginUser] Missing credentials');
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const user = await Users.findOne({ where: { correo } });

    if (!user) {
      console.log(`[loginUser] User not found: ${correo}`);
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(contrasena, user.contrasena);

    if (!isPasswordValid) {
      console.log(`[loginUser] Password incorrect for: ${correo}`);
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    console.log(`[loginUser] Login successful for: ${user.nombre} - Preference: ${user.preferenciaTemperatura} - Admin: ${user.esAdmin}`);

    // Devolver usuario sin contraseña
    const userResponse = user.toJSON();
    delete userResponse.contrasena;

    res.json({
      message: 'Login successful',
      user: {
        ...userResponse,
        activeRoomCode: user.activeRoomCode || null
      }
    });
  } catch (e) {
    console.error('[loginUser] Error in login:');
    console.error('Message:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: 'Error in login', details: e.message });
  }
}

/** 
 * Obtener imagen PNG del QR de un usuario
 */
/**
 * Obtener imagen PNG del QR de un usuario
 */
async function getQRImage(req, res) {
  try {
    const { id } = req.params;
    console.log(`[getQRImage] Getting QR image for user with ID: ${id}`);

    const user = await Users.findByPk(id);
    
    if (!user) {
      console.log(`[getQRImage] User not found for ID: ${id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // ← USAR EL ID DEL USUARIO, NO EL UUID
    const qrData = `USER_ID:${id}`;

    console.log(`[getQRImage] Generating QR with data: '${qrData}' for user: ${user.nombre}`);

    // Generar la imagen QR
    const qrImage = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log(`[getQRImage] QR successfully generated: ${qrImage.length} bytes`);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', qrImage.length);
    res.send(qrImage);

    console.log(`[getQRImage] QR image sent successfully for user: ${user.nombre}`);

  } catch (e) {
    console.error(`[getQRImage] Error generating QR: ${e.message}`);
    res.status(500).json({ error: 'Error generating QR', details: e.message });
  }
}

/**
 * Solicitar reset de contraseña
 */
async function forgotPassword(req, res) {
  try {
    const { correo } = req.body;
    console.log(`[forgotPassword] Requesting reset for: ${correo}`);

    const user = await Users.findOne({ where: { correo } });

    if (!user) {
      console.log(`[forgotPassword] User not found: ${correo}`);
      return res.status(404).json({ error: 'User not found' });
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
      subject: 'Code of Recovery - IOT Mobile',
      html: `
        <h2>Reset Password</h2>
        <p>You have requested to reset your password.</p>
        <p>Your recovery code is:</p>
        <h3 style="background-color: #42A5F5; color: white; padding: 15px; border-radius: 5px; text-align: center; font-family: monospace; letter-spacing: 2px; font-size: 32px;">
          ${resetToken}
        </h3>
        <p>Introduce this code in the IOT Mobile app to reset your password.</p>
        <p style="margin-top: 20px; font-size: 12px; color: #757575;">
          This code expires in 1 hour.
        </p>
        <p style="font-size: 12px; color: #757575;">
          If you did not request this, please ignore this email.
        </p>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`[forgotPassword] Reset email sent to: ${correo}`);
    res.json({ message: 'It has been sent a recovery code to your email' });

  } catch (e) {
    console.error(`[forgotPassword] Error: ${e.message}`);
    res.status(500).json({ error: 'Error requesting password reset' });
  }
}

/**
 * Verificar token de reset
 */
async function verifyResetToken(req, res) {
  try {
    const { token } = req.params;
    console.log(`[verifyResetToken] Verifying token...`);

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
      console.log(`[verifyResetToken] Invalid or expired token`);
      return res.status(400).json({ error: 'Invalid token or expired' });
    }

    res.json({ message: 'Valid token', userId: user.id });

  } catch (e) {
    console.error(`[verifyResetToken] Error: ${e.message}`);
    res.status(500).json({ error: 'Error verifying token', details: e.message });
  }
}

/**
 * Reset de contraseña con token
 */
async function resetPassword(req, res) {
  try {
    const { token, nuevaContrasena } = req.body;
    console.log(`[resetPassword] Reseting password...`);

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
      console.log(`[resetPassword] Invalid or expired token`);
      return res.status(400).json({ error: 'Invalid token or expired' });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

    await user.update({
      contrasena: hashedPassword,
      resetToken: null,
      resetTokenExpiration: null
    });

    console.log(`[resetPassword] Updated password for user: ${user.correo}`);
    res.json({ message: 'Password updated successfully' });

  } catch (e) {
    console.error(`[resetPassword] Error: ${e.message}`);
    res.status(500).json({ error: 'Error resetting password', details: e.message });
  }
}

/**
 * Obtener el usuario actual (autenticado)
 * Espera userId como query parameter: GET /api/users/me?userId=123
 */
async function getCurrentUser(req, res) {
  try {
    // Intentar obtener userId de query params o body
    const userId = req.query.userId || req.body.userId;

    console.log(`[getCurrentUser] Getting current user with ID: ${userId}`);

    if (!userId) {
      console.log('[getCurrentUser] userId not provided');
      return res.status(400).json({
        error: 'userId is required',
        hint: 'Use: GET /api/users/me?userId=YOUR_USER_ID'
      });
    }

    const user = await Users.findByPk(userId, {
      attributes: { exclude: ['contrasena', 'resetToken'] } // No enviar datos sensibles
    });

    if (!user) {
      console.log(`[getCurrentUser] User with ID ${userId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[getCurrentUser] User found: ${user.nombre} - Active room: ${user.activeRoomCode || 'none'}`);

    const userResponse = user.toJSON();

    return res.json({
      success: true,
      user: {
        ...userResponse,
        activeRoomCode: user.activeRoomCode || null
      }
    });
  } catch (e) {
    console.error('[getCurrentUser] Error:', e.message);
    console.error('Stack:', e.stack);
    return res.status(500).json({
      error: 'Error getting current user',
      details: e.message
    });
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
  resetPassword,
  getCurrentUser
};

