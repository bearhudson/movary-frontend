const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 80;

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
        return response.data.token;
    } catch (error) {
        console.error("Authentication failed. Check your credentials.");
        console.error(error.response ? error.response.data : error.message);
        return null;
    }
}

/**
 * Fetches the most recently added movie from a user's watchlist using a valid token.
 * @param {string} token The API token for authentication.
 * @returns {Promise<object|null>} The movie data or null if the request fails.
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
        return response.data.data[0] || null;
    } catch (error) {
        console.error("Failed to fetch watchlist data.");
        console.error(error.response ? error.response.data : error.message);
        return null;
    }
}

// Set up the main web server route
app.get('/', async (req, res) => {
    let htmlContent = '';
    let movieData = null;

    console.log(`[DEBUG] Received a new request from ${req.ip}`);
    try {
        // Step 1: Get the authentication token
        console.log(`[DEBUG] Attempting to get auth token for ${USER_EMAIL}...`);
        const apiToken = await getAuthToken();

        if (apiToken) {
            console.log(`[DEBUG] Auth token obtained successfully.`);
            // Step 2: Fetch the movie data using the token
            console.log(`[DEBUG] Fetching last movie for user ${USER_ID}...`);
            movieData = await getLastAddedMovie(apiToken);
            console.log(`[DEBUG] Movie data fetched.`);
        } else {
            console.log(`[DEBUG] Failed to obtain a token. Skipping movie data fetch.`);
        }

        if (movieData) {
            console.log(`[DEBUG] Movie found: ${movieData.title}`);
            // Build the HTML response if movie data is found
            htmlContent = `
                <div class="movie-card">
                    <h1 class="movie-title">${movieData.title}</h1>
                    <p class="movie-info"><strong>Release Year:</strong> ${movieData.release_year}</p>
                    <p class="movie-info"><strong>Added to Watchlist:</strong> ${new Date(movieData.added_at).toLocaleDateString()}</p>
                </div>
            `;
            console.log(`[DEBUG] Sending movie card HTML.`);
        } else {
            console.log(`[DEBUG] No movie data found.`);
            // HTML for when no movie data is available
            htmlContent = `
                <div class="message">
                    <p>Could not retrieve movie data or no movies found.</p>
                </div>
            `;
            console.log(`[DEBUG] Sending "no movie found" HTML.`);
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
            <title>Last Added Movie</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f0f2f5;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .movie-card, .message, .error-message {
                    background-color: #ffffff;
                    padding: 2.5rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                }
                .movie-title {
                    font-size: 2.5rem;
                    color: #333;
                    margin-bottom: 0.5rem;
                }
                .movie-info {
                    font-size: 1.2rem;
                    color: #666;
                    margin: 0.5rem 0;
                }
                .message, .error-message {
                    padding: 2rem;
                    font-size: 1.2rem;
                    color: #555;
                }
                .error-message {
                    background-color: #ffebeb;
                    color: #a51a1a;
                    border: 1px solid #a51a1a;
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
