# Movie Database Analytics Project

This project is a fullstack application for analyzing movie data from multiple sources, including Oscar Awards, TMDB, and IMDB databases. The system allows users to query and analyze relationships between movies, actors, directors, genres, and awards.

## Database Sources

The project integrates data from the following sources:

1. **Oscar Awards Database**
   - [Link to be added]
   - Contains information about Oscar nominations and winners
   - Total rows: 8,713

2. **TMDB (The Movie Database)**
   - [Link to be added]
   - Provides financial data (budget, revenue) and additional movie metadata
   - Total rows: 313,359

3. **IMDB Datasets**
   - [Link to be added]
   - Includes several key datasets:
     - `name.basics`: Information about actors, directors, and other industry professionals (11,086,134 rows)
     - `title.basics`: Basic information about movies and TV shows (536,283 rows)
     - `title.ratings`: User ratings and vote counts (1,553,024 rows)
     - `title.principals`: Cast and crew information for each title (6,893,823 rows)

## Database Schema

### Oscar Awards Table
```sql
CREATE TABLE public.theoscaraward (
    awardid INTEGER,
    year INTEGER,
    filmid INTEGER,
    nomineeids INTEGER[],
    category VARCHAR(255),
    iswinner BOOLEAN,
    filmtitle VARCHAR(255)
);
```

### TMDB Table
```sql
CREATE TABLE public.tmdb (
    imdb_id INTEGER PRIMARY KEY,
    budget BIGINT,
    revenue BIGINT,
    popularity DOUBLE PRECISION
);
```

### IMDB Tables

#### name.basics
```sql
CREATE TABLE public.namebasics (
    nconst INTEGER PRIMARY KEY,
    primaryname VARCHAR(255),
    primaryprofession TEXT[],
    knownfortitles INTEGER[]
);
```

#### title.basics
```sql
CREATE TABLE public.titlebasics (
    tconst INTEGER PRIMARY KEY,
    primarytitle VARCHAR(255),
    startyear INTEGER,
    genres TEXT[]
);
```

#### title.ratings
```sql
CREATE TABLE public.titleratings (
    tconst INTEGER PRIMARY KEY,
    averagerating DOUBLE PRECISION,
    numvotes INTEGER
);
```

#### title.principals
```sql
CREATE TABLE public.titleprincipals (
    tconst INTEGER,
    ordering INTEGER,
    nconst INTEGER,
    category VARCHAR(255),
    PRIMARY KEY (tconst, ordering)
);
```

## Key Relationships

- `theoscaraward.filmid` → `titlebasics.tconst`
- `theoscaraward.nomineeids` → `namebasics.nconst`
- `tmdb.imdb_id` → `titlebasics.tconst`
- `titleprincipals.tconst` → `titlebasics.tconst`
- `titleprincipals.nconst` → `namebasics.nconst`
- `titleratings.tconst` → `titlebasics.tconst`

## API Endpoints

The API provides the following endpoints:

### Films
- `GET /api/films/highest-roi`: Get films with highest return on investment
- `GET /api/films/by-actor/:actorName`: Get films by a specific actor
- `GET /api/films/top-by-genre/:genre`: Get top movies by genre

### Actors
- `GET /api/actors/top`: Get top actors by rating or nominations
- `GET /api/actors/by-decade`: Get actors with most nominated films by decade
- `GET /api/actors/:nconst`: Get detailed information about a specific actor

### Directors
- `GET /api/directors/top`: Get top directors by rating or nominations
- `GET /api/directors/by-decade`: Get directors with most nominated films by decade
- `GET /api/directors/:nconst`: Get detailed information about a specific director

### Genres
- `GET /api/genres/top`: Get top genres by revenue or awards
- `GET /api/genres/highest-grossing`: Get highest grossing film per genre
- `GET /api/genres/:genre`: Get detailed information about a specific genre

### Awards
- `GET /api/awards/by-actor/:actorName`: Get awards for a specific actor

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   DB_HOST=your_database_host
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_PORT=your_database_port
   API_PORT=your_api_port
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Project Structure

```
server/
├── routes/           # API route handlers
├── database/         # Database connection and queries
├── __tests__/       # Test files
└── server.js        # Main server file
```

## Contributing

[Instructions for contributing to be added]

## License

[License information to be added]
