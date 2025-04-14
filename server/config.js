require('dotenv').config();

const DB_CONFIG = {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10)
};

const API_CONFIG = {
    port: parseInt(process.env.API_PORT, 10),
    debug: process.env.DEBUG === 'true'
};

module.exports = {
    DB_CONFIG,
    API_CONFIG
}; 