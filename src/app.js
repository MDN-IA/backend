const express = require('express');
const cors = require('cors');

const roomsRoutes = require('./routes/rooms.routes');
const samplesRoutes = require('./routes/samples.routes');
const recoRoutes = require('./routes/reco.routes');
const usersRoutes = require('./routes/users.routes');
const accessRoutes = require('./routes/roomsAccess.routes');

console.log('✓ Rutas cargadas correctamente');

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/api', (req, res) => {
  console.log(' Petición a /api recibida correctamente');
  res.json({
    message: 'API funcionando correctamente',
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
      login: '/api/users/login'
    }
  });
});

console.log('Registrando rutas...');
app.use('/api/rooms', roomsRoutes);
app.use('/api/samples', samplesRoutes);
app.use('/api/recommendations', recoRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/access', accessRoutes);
console.log('✓ Rutas registradas: /api/rooms, /api/samples, /api/recommendations, /api/users, /api/access');

module.exports = app;
