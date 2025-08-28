const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

// Load environment variables from a .env file
require('dotenv').config();

// --- IMPORTANT: Set up your .env file with these constants ---
// MOVERY_BASE_URL="https://birdsnestmovies.com"
// API_CLIENT_STRING="my-nodejs-app"
// USER_EMAIL="movary@selfdestroyedindustries.com"
// USER_PASSWORD="testtest"
// USER_ID="brian"

const MOVERY_BASE_URL = process.env.MOVERY_BASE_URL; 
const API_CLIENT_STRING = process.env.API_CLIENT_STRING; 
const USER_EMAIL = process.env.USER_EMAIL;
const USER_PASSWORD = process.env.USER_PASSWORD; 
const USER_ID = process.env.USER_ID;

/**
 * Generates an authentication token from the Movary API.
 * @returns {Promise<string|null>} The API token or null if authentication fails.
 */
async function getAuthToken() {
    try {
        const response = await axios.post(`${MOVERY_BASE_URL}/api/authentication/token`, {
            email: USER_EMAIL,
            password: USER_PASSWORD,
            rememberMe: true
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Movary-Client': API_CLIENT_STRING
            }
        });
        return response.data.authToken;
    } catch (error) {
        console.error("Authentication failed. Check your credentials.");
        console.error(error.response ? error.response.data : error.message);
        return null;
    }
}

/**
 * Fetches the most recently added movie from a user's watchlist using a valid token.
 * @param {string} token The API token for authentication.
 * @returns {Promise<object|null>} The movie entry data or null if the request fails.
 */
async function getLastAddedMovie(token) {
    try {
        const response = await axios.get(`${MOVERY_BASE_URL}/api/users/${USER_ID}/watchlist/movies`, {
            headers: {
                'accept': 'application/json',
                'X-Movary-Token': token
            },
            params: {
                page: 1,
                limit: 1,
                sortBy: 'addedAt',
                sortOrder: 'desc'
            }
        });
        
        // The entire entry from the watchlist array
        const movieEntry = response.data.watchlist[0];
        
        // Return the whole entry, as it contains both the movie and addedAt date
        return movieEntry || null;
    } catch (error) {
        console.error("Failed to fetch watchlist data.");
        console.error(error.response ? error.response.data : error.message);
        return null;
    }
}

// Set up the main web server route
app.get('/', async (req, res) => {
    let htmlContent = '';
    let movieEntry = null; // Renamed variable to reflect the data structure
    try {
        // Step 1: Get the authentication token
        const apiToken = await getAuthToken();

        if (apiToken) {
            movieEntry = await getLastAddedMovie(apiToken);
        } else {
            console.log(`[DEBUG] Failed to obtain a token. Skipping movie data fetch.`);
        }

        if (movieEntry && movieEntry.movie) { // Check for both movieEntry and the nested movie object
            const movieData = movieEntry.movie;
            const addedAt = movieEntry.addedAt;
            // Build the HTML response if movie data is found
            htmlContent = `
                <div class="movie-card">
                    <img src="${movieData.posterPath}" alt="${movieData.title} Poster" class="movie-poster">
                    <h1 class="movie-title">${movieData.title}</h1>
                    <p class="movie-info"><strong>Release Year:</strong> ${movieData.releaseDate ? movieData.releaseDate.substring(0, 4) : 'N/A'}</p>
                    <p class="movie-info"><hr>${movieData.overview}</p>
                </div>
            `;
        } else {
            // HTML for when no movie data is available
            htmlContent = `
                <div class="message">
                    <p>Could not retrieve movie data or no movies found.</p>
                </div>
            `;
        }
    } catch (error) {
        // HTML for server-side errors
        htmlContent = `
            <div class="error-message">
                <h1>Server Error</h1>
                <p>An unexpected error occurred while processing your request.</p>
            </div>
        `;
        console.error('Server error:', error);
        console.log(`[DEBUG] Sending error HTML.`);
    }

    // Send the final HTML response
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>The Next Nest Feature</title>
	    <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #000000;
                    color: #D3D3D3;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .movie-card {
                    background-color: #1A1A1A;
                    padding: 2.5rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                }
                .message, .error-message {
                    background-color: #1A1A1A;
                    padding: 2rem;
                    font-size: 1.2rem;
                    color: #D3D3D3;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                }
                .error-message {
                    color: #a51a1a;
                    border: 1px solid #a51a1a;
                }
                .movie-title {
                    font-size: 2.5rem;
                    color: #D3D3D3;
                    margin-bottom: 0.5rem;
                }
                .movie-info {
                    font-size: 1.2rem;
                    color: #D3D3D3;
                    margin: 0.5rem 0;
                }
                .movie-overview {
                    color: #A9A9A9;
                }
                .movie-poster {
                    max-width: 100%;
                    height: auto;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Web server listening on http://localhost:${PORT}`);
    console.log(`Open a browser and navigate to http://localhost:${PORT} to view the page.`);
    console.log(`Note: Running on port 80 may require elevated permissions (e.g., 'sudo node index.js' on Linux/macOS).`);
});

