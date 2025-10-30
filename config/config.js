require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'citizix_user',
    password: process.env.DB_PASSWORD || 'S3cret',
    database: process.env.DB_NAME || 'citizix_db',
    host: process.env.DB_HOST || 'db', // 'db' es el nombre del servicio en docker-compose
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  test: {
    username: process.env.DB_USER || 'citizix_user',
    password: process.env.DB_PASSWORD || 'S3cret',
    database: 'citizix_db_test',
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
};
