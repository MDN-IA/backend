const express = require('express');
const cors = require('cors');

const roomsRoutes = require('./routes/rooms.routes');
const samplesRoutes = require('./routes/samples.routes');
const recoRoutes = require('./routes/reco.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/rooms', roomsRoutes);
app.use('/api/samples', samplesRoutes);
app.use('/api/recommendations', recoRoutes);

module.exports = app;
