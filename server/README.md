# Backend Server

This directory contains the backend server for the movie database project. The server is built with Node.js, Express, and PostgreSQL.

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- PostgreSQL database access
- Environment variables set up in `.env` file

## Environment Setup

1. Create a `.env` file in the root directory with the following variables:
```
DB_HOST=your_database_host
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_PORT=your_database_port
API_PORT=your_api_port
```

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Server

To start the server:
```bash
npm start
```

The server will start on the port specified in your `.env` file.

## Testing

### Running Tests

To run all tests:
```bash
npm test
```

To run tests with coverage report:
```bash
npm run test:coverage
```

### Test Structure

- Tests are located in `__tests__/` directory
- `routes.test.js` - Tests for all API routes
- `server.test.js` - Tests for server configuration

### Test Coverage

The project has a minimum coverage requirement of 80% for:
- Branches
- Functions
- Lines
- Statements

## API Routes

The server provides the following API endpoints:

### Genres
- `GET /genres/top` - Get top genres by revenue
- `GET /genres/highest-grossing` - Get highest grossing films by genre
- `GET /genres/:genreName` - Get details for a specific genre

### Films
- `GET /films/highest-roi` - Get films with highest return on investment
- `GET /films/by-actor/:actorName` - Get films by actor
- `GET /films/top-by-genre/:genreName` - Get top movies by genre

### Directors
- `GET /directors/top` - Get top directors by rating or nominations
- `GET /directors/by-decade` - Get directors by decade
- `GET /directors/:directorName` - Get details for a specific director

### Actors
- `GET /actors/top` - Get top actors by rating or nominations
- `GET /actors/by-decade` - Get actors by decade
- `GET /actors/:actorName` - Get details for a specific actor

### Awards
- `GET /awards/by-actor/:actorName` - Get awards for a specific actor

## Error Handling

The server includes error handling middleware that will:
- Return 404 for not found routes
- Return 500 for server errors
- Return appropriate error messages in JSON format

## Database Connection

The server uses a connection pool to manage database connections. The pool configuration is in `database/pool.js`. 