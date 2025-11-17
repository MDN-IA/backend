require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models'); // generado por sequelize-cli

const PORT = process.env.PORT || 4000;

console.log('========================================');
console.log(' Iniciando servidor...');
console.log('========================================');
console.log(' Variables de entorno:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   PORT: ${PORT}`);
console.log(`   DB_HOST: ${process.env.DB_HOST || 'db'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || 5432}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'citizix_db'}`);
console.log(`   DB_USER: ${process.env.DB_USER || 'citizix_user'}`);
console.log('========================================');

(async () => {
  try {
    await sequelize.authenticate();
    console.log(' Conectado a PostgreSQL');
    app.listen(PORT, () => console.log(` API lista en http://localhost:${PORT}`));
  } catch (e) {
    console.error('========================================');
    console.error(' ERROR AL INICIAR EL SERVIDOR');
    console.error('========================================');
    console.error('Tipo de error:', e.name);
    console.error('Mensaje:', e.message);
    console.error('Stack completo:', e.stack);
    console.error('========================================');
    process.exit(1);
  }
})();
