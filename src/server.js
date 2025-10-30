require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models'); // generado por sequelize-cli

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');
    app.listen(PORT, () => console.log(`🚀 API lista en http://localhost:${PORT}`));
  } catch (e) {
    console.error('❌ Error al iniciar:', e);
    process.exit(1);
  }
})();
