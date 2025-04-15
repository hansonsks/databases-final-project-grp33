require('dotenv').config();

module.exports = {
    db: {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: {
            rejectUnauthorized: false
        }
    },
    api: {
        port: process.env.API_PORT
    }
}; 