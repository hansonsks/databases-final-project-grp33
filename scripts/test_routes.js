const pool = require('../server/database/pool');

async function testRoutes() {
    try {
        console.log('Testing routes...\n');

        // Test genres routes
        console.log('Testing /genres/highest-grossing:');
        const genreQuery = `
            WITH genre_films AS (
                SELECT 
                    tconst,
                    unnest(genres) AS genre
                FROM 
                    public.titlebasics
            ),
            genre_revenues AS (
                SELECT 
                    gf.genre,
                    gf.tconst,
                    t.revenue
                FROM 
                    genre_films gf
                JOIN 
                    public.tmdb t ON gf.tconst = t.imdb_id
                WHERE 
                    t.revenue IS NOT NULL
            ),
            max_revenue_by_genre AS (
                SELECT 
                    genre,
                    MAX(revenue) AS max_revenue
                FROM 
                    genre_revenues
                GROUP BY 
                    genre
            ),
            top_films AS (
                SELECT 
                    mr.genre,
                    gr.tconst,
                    mr.max_revenue
                FROM 
                    max_revenue_by_genre mr
                JOIN 
                    genre_revenues gr ON mr.genre = gr.genre AND mr.max_revenue = gr.revenue
            )
            SELECT 
                tf.genre,
                b.primarytitle AS title,
                b.startyear AS year,
                r.averagerating,
                tf.max_revenue AS revenue
            FROM 
                top_films tf
            JOIN 
                public.titlebasics b ON tf.tconst = b.tconst
            LEFT JOIN 
                public.titleratings r ON b.tconst = r.tconst
            ORDER BY 
                tf.max_revenue DESC
            LIMIT 5
        `;

        const genreResult = await pool.query(genreQuery);
        console.log('Top 5 highest grossing films by genre:');
        console.log(JSON.stringify(genreResult.rows, null, 2));

        // Test films routes
        console.log('\nTesting /films/highest-roi:');
        const roiQuery = `
            WITH film_financials AS (
                SELECT 
                    t.imdb_id AS tconst,
                    t.budget,
                    t.revenue,
                    CASE 
                        WHEN t.budget > 0 THEN (t.revenue::float / t.budget)
                        ELSE NULL
                    END AS roi
                FROM 
                    public.tmdb t
                WHERE 
                    t.budget > 1000000
                    AND t.revenue > 0
            ),
            film_details AS (
                SELECT 
                    b.tconst,
                    b.primarytitle,
                    b.startyear,
                    r.averagerating,
                    r.numvotes,
                    ff.budget,
                    ff.revenue,
                    ff.roi
                FROM 
                    public.titlebasics b
                JOIN 
                    film_financials ff ON b.tconst = ff.tconst
                LEFT JOIN 
                    public.titleratings r ON b.tconst = r.tconst
                WHERE r.numvotes > 10000
            ),
            yearly_top_roi AS (
                SELECT 
                    startyear,
                    tconst,
                    primarytitle,
                    averagerating,
                    budget,
                    revenue,
                    roi,
                    RANK() OVER (PARTITION BY startyear ORDER BY roi DESC) AS roi_rank
                FROM 
                    film_details
            )
            SELECT 
                yt.startyear AS year,
                yt.primarytitle AS film_title,
                yt.averagerating AS imdb_rating,
                yt.budget,
                yt.revenue,
                ROUND(yt.roi::numeric, 2) AS return_on_investment,
                EXISTS (
                    SELECT 1
                    FROM public.theoscaraward o
                    WHERE o.filmid = yt.tconst
                    AND o.iswinner = TRUE
                ) AS won_oscar,
                (
                    SELECT string_agg(n.primaryname, ', ')
                    FROM public.titleprincipals p
                    JOIN public.namebasics n ON p.nconst = n.nconst
                    WHERE p.tconst = yt.tconst
                    AND p.category = 'director'
                ) AS director
            FROM 
                yearly_top_roi yt
            WHERE 
                roi_rank = 1
                AND startyear BETWEEN 2000 AND 2023
            ORDER BY 
                yt.roi DESC
            LIMIT 5
        `;

        const roiResult = await pool.query(roiQuery);
        console.log('Top 5 films by ROI:');
        console.log(JSON.stringify(roiResult.rows, null, 2));

        // Test directors routes
        console.log('\nTesting /directors/by-decade:');
        const directorsQuery = `
            WITH director_films AS (
                SELECT 
                    tp.nconst,
                    nb.primaryname AS director_name,
                    tb.tconst,
                    tb.primarytitle,
                    tb.startyear,
                    (tb.startyear / 10) * 10 AS decade
                FROM 
                    public.titleprincipals tp
                JOIN 
                    public.namebasics nb ON tp.nconst = nb.nconst
                JOIN 
                    public.titlebasics tb ON tp.tconst = tb.tconst
                WHERE 
                    tp.category = 'director'
                    AND tb.startyear IS NOT NULL
            ),
            oscar_nominations AS (
                SELECT 
                    filmid,
                    COUNT(*) AS nomination_count
                FROM 
                    public.theoscaraward
                GROUP BY 
                    filmid
            ),
            director_nominations AS (
                SELECT 
                    df.nconst,
                    df.director_name,
                    df.decade,
                    COUNT(DISTINCT df.tconst) AS total_films,
                    COUNT(DISTINCT CASE WHEN oscar_noms.filmid IS NOT NULL THEN df.tconst END) AS nominated_films
                FROM 
                    director_films df
                LEFT JOIN 
                    oscar_nominations oscar_noms ON df.tconst = oscar_noms.filmid
                GROUP BY 
                    df.nconst, df.director_name, df.decade
            ),
            top_directors_by_decade AS (
                SELECT 
                    decade,
                    nconst,
                    director_name,
                    nominated_films,
                    total_films,
                    RANK() OVER (PARTITION BY decade ORDER BY nominated_films DESC) AS decade_rank
                FROM 
                    director_nominations
                WHERE 
                    nominated_films > 0
            )
            SELECT 
                decade,
                director_name,
                nominated_films,
                total_films,
                ROUND((nominated_films::numeric / total_films) * 100, 2) AS nomination_percentage
            FROM 
                top_directors_by_decade
            WHERE 
                decade_rank <= 3
            ORDER BY 
                decade, decade_rank
            LIMIT 5
        `;

        const directorsResult = await pool.query(directorsQuery);
        console.log('Top directors by decade:');
        console.log(JSON.stringify(directorsResult.rows, null, 2));

    } catch (err) {
        console.error('Error testing routes:', err);
    } finally {
        await pool.end();
    }
}

testRoutes(); 