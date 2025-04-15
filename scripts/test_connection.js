const pool = require('../server/database/pool');

async function testConnection() {
    try {
        // Check which database we're connected to
        const dbInfo = await pool.query('SELECT current_database(), current_schema()');
        console.log('\nConnected to:');
        console.log('Database:', dbInfo.rows[0].current_database);
        console.log('Schema:', dbInfo.rows[0].current_schema);

        // Check specific tables in public schema
        const tablesToCheck = [
            'tmdb',
            'theoscaraward',
            'namebasics',
            'titleratings',
            'titleprincipals',
            'titlebasics',
            'custom'
        ];

        console.log('\nChecking table structure and data:');
        for (const tableName of tablesToCheck) {
            try {
                console.log(`\nChecking public.${tableName}:`);
                
                // Get table structure
                const structureQuery = `
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = $1
                    ORDER BY ordinal_position;
                `;
                const structure = await pool.query(structureQuery, [tableName]);
                console.log('Table structure:');
                console.log(JSON.stringify(structure.rows, null, 2));

                // Get row count
                const countQuery = `SELECT COUNT(*) FROM public.${tableName}`;
                const count = await pool.query(countQuery);
                console.log(`Total rows: ${count.rows[0].count}`);

                // If there's data, show a sample
                if (parseInt(count.rows[0].count) > 0) {
                    const sampleQuery = `SELECT * FROM public.${tableName} LIMIT 1`;
                    const sample = await pool.query(sampleQuery);
                    console.log('Sample row:');
                    console.log(JSON.stringify(sample.rows[0], null, 2));
                }

            } catch (err) {
                console.error(`Error checking public.${tableName}:`, err);
            }
        }

    } catch (err) {
        console.error('Error testing connection:', err);
    } finally {
        await pool.end();
    }
}

testConnection(); 