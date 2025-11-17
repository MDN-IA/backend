const express = require('express');
const cors = require('cors');

const roomsRoutes = require('./routes/rooms.routes');
const samplesRoutes = require('./routes/samples.routes');
const recoRoutes = require('./routes/reco.routes');

console.log(' Rutas cargadas correctamente');

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
      recommendations: '/api/recommendations'
    }
  });
});

console.log('Registrando rutas...');
app.use('/api/rooms', roomsRoutes);
app.use('/api/samples', samplesRoutes);
app.use('/api/recommendations', recoRoutes);

module.exports = app;
