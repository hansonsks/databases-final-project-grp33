require('dotenv').config({ path: '../.env' });
console.log("Database host:", process.env.DB_HOST);
console.log("Database name:", process.env.DB_NAME);
console.log("Database user:", process.env.DB_USER);
console.log("Database password:", process.env.DB_PASSWORD);
console.log("Database port:", process.env.DB_PORT);
console.log("API port:", process.env.API_PORT);
console.log("JWT secret:", process.env.JWT_SECRET);
console.log("JWT expiry:", process.env.JWT_EXPIRY);

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
        port: process.env.API_PORT || 8080
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'AndyEmilyHansonOlivia',
        jwtExpiry: process.env.JWT_EXPIRY || '24h'
    }
}; 