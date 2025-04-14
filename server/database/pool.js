const { Pool } = require('pg');
const { DB_CONFIG } = require('../config');

const pool = new Pool(DB_CONFIG);

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = pool; 