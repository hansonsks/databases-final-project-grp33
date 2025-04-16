require('dotenv').config({ path: '../.env' });
const pool = require('../server/database/pool');

async function testRoutes() {
    try {
        console.log('Testing all routes...\n');

        // Test genres routes
        console.log('Testing /genres/top:');
        const topGenresQuery = `
            WITH genre_stats AS (
                SELECT 
                    unnest(t.genres) as genre,
                    SUM(m.revenue) as total_revenue,
                    COUNT(DISTINCT o.awardid) as total_awards
                FROM 
                    public.titlebasics t
                    JOIN public.tmdb m ON t.tconst = m.imdb_id
                    LEFT JOIN public.theoscaraward o ON t.tconst = o.filmid
                GROUP BY 
                    unnest(t.genres)
            )
            SELECT 
                genre,
                total_revenue,
                total_awards
            FROM 
                genre_stats
            ORDER BY 
                total_revenue DESC
            LIMIT 5
        `;
        const topGenresResult = await pool.query(topGenresQuery);
        console.log('Top genres by revenue:');
        console.log(JSON.stringify(topGenresResult.rows, null, 2));

        console.log('\nTesting /genres/highest-grossing:');
        const highestGrossingQuery = `
            WITH ranked_films AS (
                SELECT 
                    unnest(t.genres) as genre,
                    t.primarytitle as title,
                    m.revenue,
                    ROW_NUMBER() OVER (PARTITION BY unnest(t.genres) ORDER BY m.revenue DESC) as rank
                FROM 
                    public.titlebasics t
                    JOIN public.tmdb m ON t.tconst = m.imdb_id
            )
            SELECT 
                genre,
                title,
                revenue
            FROM 
                ranked_films
            WHERE 
                rank = 1
            LIMIT 5
        `;
        const highestGrossingResult = await pool.query(highestGrossingQuery);
        console.log('Highest grossing films by genre:');
        console.log(JSON.stringify(highestGrossingResult.rows, null, 2));

        // Test films routes
        console.log('\nTesting /films/highest-roi:');
        const roiQuery = `
            WITH film_financials AS (
                SELECT 
                    m.imdb_id as tconst,
                    m.budget,
                    m.revenue,
                    CASE 
                        WHEN m.budget > 0 THEN (m.revenue::float / m.budget)
                        ELSE NULL
                    END AS roi
                FROM 
                    public.tmdb m
                WHERE 
                    m.budget > 1000000
                    AND m.revenue > 0
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
        console.log('Top films by ROI:');
        console.log(JSON.stringify(roiResult.rows, null, 2));

        console.log('\nTesting /films/by-actor:');
        const filmsByActorQuery = `
            SELECT 
                t.tconst,
                t.primarytitle AS title,
                t.startyear AS year,
                r.averagerating,
                m.revenue
            FROM 
                public.namebasics n
            JOIN 
                public.titleprincipals p ON n.nconst = p.nconst
            JOIN 
                public.titlebasics t ON p.tconst = t.tconst
            LEFT JOIN 
                public.titleratings r ON t.tconst = r.tconst
            LEFT JOIN 
                public.tmdb m ON t.tconst = m.imdb_id
            WHERE 
                n.primaryname = 'Tom Hanks'
                AND p.category IN ('actor', 'actress')
            ORDER BY 
                t.startyear DESC
            LIMIT 5
        `;
        const filmsByActorResult = await pool.query(filmsByActorQuery);
        console.log('Films by Tom Hanks:');
        console.log(JSON.stringify(filmsByActorResult.rows, null, 2));

        // Test directors routes
        console.log('\nTesting /directors/top:');
        const topDirectorsQuery = `
            WITH PrincipalsOnDirectors AS (
                SELECT tconst, nconst
                FROM public.titleprincipals
                WHERE category = 'director'
            ),
            JoinedWithRatings AS (
                SELECT pd.tconst, pd.nconst, r.averagerating
                FROM PrincipalsOnDirectors pd
                JOIN public.titleratings r ON pd.tconst = r.tconst
            ),
            AvgRatingsPerDirector AS (
                SELECT nconst, AVG(averagerating) as averageratingdirector
                FROM JoinedWithRatings
                GROUP BY nconst
                HAVING COUNT(*) >= 3
            ),
            RankedDirectors AS (
                SELECT nconst, averageratingdirector, 
                       DENSE_RANK() OVER (ORDER BY averageratingdirector DESC) as rank
                FROM AvgRatingsPerDirector
            )
            SELECT nb.primaryname, ra.averageratingdirector AS averagerating
            FROM RankedDirectors ra
            JOIN public.namebasics nb ON ra.nconst = nb.nconst
            WHERE ra.rank <= 5
            ORDER BY ra.averageratingdirector DESC
        `;
        const topDirectorsResult = await pool.query(topDirectorsQuery);
        console.log('Top directors by rating:');
        console.log(JSON.stringify(topDirectorsResult.rows, null, 2));

        console.log('\nTesting /directors/by-decade:');
        const directorsByDecadeQuery = `
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
        const directorsByDecadeResult = await pool.query(directorsByDecadeQuery);
        console.log('Top directors by decade:');
        console.log(JSON.stringify(directorsByDecadeResult.rows, null, 2));

        // Test actors routes
        console.log('\nTesting /actors/top:');
        const topActorsQuery = `
            WITH PrincipalsOnActors AS (
                SELECT tconst, nconst
                FROM public.titleprincipals
                WHERE category = 'actor' OR category = 'actress'
            ),
            JoinedWithRatings AS (
                SELECT pa.tconst, pa.nconst, r.averagerating
                FROM PrincipalsOnActors pa
                JOIN public.titleratings r ON pa.tconst = r.tconst
            ),
            AvgRatingsPerActor AS (
                SELECT nconst, AVG(averagerating) as averageratingactor
                FROM JoinedWithRatings
                GROUP BY nconst
                HAVING COUNT(*) >= 3
            ),
            RankedActors AS (
                SELECT nconst, averageratingactor, 
                       DENSE_RANK() OVER (ORDER BY averageratingactor DESC) as rank
                FROM AvgRatingsPerActor
            )
            SELECT nb.primaryname, ra.averageratingactor AS averagerating
            FROM RankedActors ra
            JOIN public.namebasics nb ON ra.nconst = nb.nconst
            WHERE ra.rank <= 5
            ORDER BY ra.averageratingactor DESC
        `;
        const topActorsResult = await pool.query(topActorsQuery);
        console.log('Top actors by rating:');
        console.log(JSON.stringify(topActorsResult.rows, null, 2));

        console.log('\nTesting /actors/by-decade:');
        const actorsByDecadeQuery = `
            WITH actor_films AS (
                SELECT 
                    tp.nconst,
                    nb.primaryname AS actor_name,
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
                    (tp.category = 'actor' OR tp.category = 'actress')
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
            actor_nominations AS (
                SELECT 
                    af.nconst,
                    af.actor_name,
                    af.decade,
                    COUNT(DISTINCT af.tconst) AS total_films,
                    COUNT(DISTINCT CASE WHEN oscar_noms.filmid IS NOT NULL THEN af.tconst END) AS nominated_films
                FROM 
                    actor_films af
                LEFT JOIN 
                    oscar_nominations oscar_noms ON af.tconst = oscar_noms.filmid
                GROUP BY 
                    af.nconst, af.actor_name, af.decade
            ),
            top_actors_by_decade AS (
                SELECT 
                    decade,
                    nconst,
                    actor_name,
                    nominated_films,
                    total_films,
                    RANK() OVER (PARTITION BY decade ORDER BY nominated_films DESC) AS decade_rank
                FROM 
                    actor_nominations
                WHERE 
                    nominated_films > 0
            )
            SELECT 
                decade,
                actor_name,
                nominated_films,
                total_films,
                ROUND((nominated_films::numeric / total_films) * 100, 2) AS nomination_percentage
            FROM 
                top_actors_by_decade
            WHERE 
                decade_rank <= 3
            ORDER BY 
                decade, decade_rank
            LIMIT 5
        `;
        const actorsByDecadeResult = await pool.query(actorsByDecadeQuery);
        console.log('Top actors by decade:');
        console.log(JSON.stringify(actorsByDecadeResult.rows, null, 2));

        // Test awards routes
        console.log('\nTesting /awards/by-actor:');
        const awardsByActorQuery = `
            WITH actor_nconst AS (
                SELECT nconst::text
                FROM public.namebasics
                WHERE ('actor' = ANY(primaryprofession) OR 'actress' = ANY(primaryprofession))
                AND primaryname = 'Tom Hanks'
                LIMIT 1
            )
            SELECT 
                o.category,
                o.year,
                o.filmtitle,
                o.iswinner,
                o.filmid,
                o.nomineeids
            FROM 
                public.theoscaraward o
            WHERE 
                EXISTS (
                    SELECT 1 
                    FROM actor_nconst an 
                    WHERE an.nconst = ANY(o.nomineeids)
                )
            ORDER BY 
                o.year DESC
            LIMIT 5
        `;
        const awardsByActorResult = await pool.query(awardsByActorQuery);
        console.log('Awards for Tom Hanks:');
        console.log(JSON.stringify(awardsByActorResult.rows, null, 2));

        console.log('\nAll tests completed successfully!');

    } catch (err) {
        console.error('Error testing routes:', err);
    } finally {
        await pool.end();
    }
}

testRoutes(); 

