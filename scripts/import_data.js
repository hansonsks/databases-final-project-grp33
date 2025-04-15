const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../server/config');

const pool = new Pool(config.db);

async function importData() {
    try {
        console.log('Starting data import...');

        // Import title.basics
        console.log('\nImporting title.basics...');
        await pool.query(`
            COPY title.basics FROM STDIN WITH CSV HEADER DELIMITER ',' NULL '\\N'
        `, null, (err, result) => {
            if (err) console.error('Error importing title.basics:', err);
        });

        // Import title.ratings
        console.log('\nImporting title.ratings...');
        await pool.query(`
            COPY title.ratings FROM STDIN WITH CSV HEADER DELIMITER ',' NULL '\\N'
        `, null, (err, result) => {
            if (err) console.error('Error importing title.ratings:', err);
        });

        // Import public.tmdb
        console.log('\nImporting public.tmdb...');
        await pool.query(`
            COPY public.tmdb FROM STDIN WITH CSV HEADER DELIMITER ',' NULL '\\N'
        `, null, (err, result) => {
            if (err) console.error('Error importing public.tmdb:', err);
        });

        // Import public.the_oscar_award
        console.log('\nImporting public.theoscaraward...');
        await pool.query(`
            COPY public.the_oscar_award FROM STDIN WITH CSV HEADER DELIMITER ',' NULL '\\N'
        `, null, (err, result) => {
            if (err) console.error('Error importing public.the_oscar_award:', err);
        });

        // Import name.basics
        console.log('\nImporting name.basics...');
        await pool.query(`
            COPY name.basics FROM STDIN WITH CSV HEADER DELIMITER ',' NULL '\\N'
        `, null, (err, result) => {
            if (err) console.error('Error importing name.basics:', err);
        });

        console.log('\nData import completed!');

    } catch (err) {
        console.error('Error during data import:', err);
    } finally {
        await pool.end();
    }
}

importData();
