const express = require('express');
const cors = require('cors');

const roomsRoutes = require('./routes/rooms.routes');
const samplesRoutes = require('./routes/samples.routes');
const recoRoutes = require('./routes/reco.routes');
const usersRoutes = require('./routes/users.routes');
const accessRoutes = require('./routes/roomsAccess.routes');
const historyRoutes = require('./routes/history.routes');

console.log('Routes loaded successfully');

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/api', (req, res) => {
  console.log(' Request to /api received successfully');
  res.json({
    message: 'API working correctly',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      rooms: '/api/rooms',
      roomById: '/api/rooms/:id',
      samples: '/api/samples',
      recommendations: '/api/recommendations',
      users: '/api/users',
      userById: '/api/users/:id',
      userByEmail: '/api/users/email/:correo',
      userByQR: '/api/users/qr/:qr',
      qrImage: '/api/users/qr-image/:id',
      login: '/api/users/login',
      access: '/api/access',
      history: '/api/history/:userId',
      stats: '/api/history/:userId/stats'
    }
  });
});

console.log('Registering routes...');
app.use('/api/rooms', roomsRoutes);
app.use('/api/samples', samplesRoutes);
app.use('/api/recommendations', recoRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/history', historyRoutes);
console.log('Routes registered: /api/rooms, /api/samples, /api/recommendations, /api/users, /api/access, /api/history');

module.exports = app;
