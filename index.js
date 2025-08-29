const express = require('express');
const axios = require('axios');
const app = express();
const fs = require('fs/promises');
const path = require('path');

// Load environment variables from a .env file
require('dotenv').config();

class MovaryApp {
    constructor() {
        this.PORT = process.env.PORT;
        this.MOVERY_BASE_URL = process.env.MOVERY_BASE_URL;
        this.API_CLIENT_STRING = process.env.API_CLIENT_STRING;
        this.USER_EMAIL = process.env.USER_EMAIL;
        this.USER_PASSWORD = process.env.USER_PASSWORD;
        this.USER_ID = process.env.USER_ID;
        this.NEXT_DT = process.env.NEXT_DT;
    }

    /**
     * Generates an authentication token from the Movary API.
     * @returns {Promise<string|null>} The API token or null if authentication fails.
     */
    async getAuthToken() {
        try {
            const response = await axios.post(`${this.MOVERY_BASE_URL}/api/authentication/token`, {
                email: this.USER_EMAIL,
                password: this.USER_PASSWORD,
                rememberMe: true
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Movary-Client': this.API_CLIENT_STRING
                }
            });
            return response.data.authToken
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
    async getLastAddedMovie(token) {
        try {
            const response = await axios.get(`${this.MOVERY_BASE_URL}/api/users/${this.USER_ID}/watchlist/movies`, {
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

            const movieEntry = response.data.watchlist[0];
            return movieEntry || null;
        } catch (error) {
            console.error("Failed to fetch watchlist data.");
            console.error(error.response ? error.response.data : error.message);
            return null;
        }
    }

   /**
     * Reads a date from the NEXT_DT environment variable and formats it.
     * @returns {string} The formatted date string or a default message.
     */
    async getDatetimeString() {
        if (!this.NEXT_DT) {
            return "NEXT_DT environment variable not set.";
        }
        
        try {
            const date = new Date(this.NEXT_DT);
            if (isNaN(date)) {
                throw new Error("Invalid date format.");
            }
            
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            let hours = date.getHours();
            const minutes = date.getMinutes();
            let timeString;

            if (minutes === 0) {
                timeString = `${hours}00`;
            } else {
                timeString = `${hours}:${minutes.toString().padStart(2, '0')}`;
            }

            return `${month} / ${day} - ${timeString}`;
        } catch (error) {
            console.error("Error formatting date from NEXT_DT:", error.message);
            return "Invalid date format in environment variable.";
        }
    }

    /**
     * Renders the HTML response based on API data.
     * @param {object} req The Express request object.
     * @param {object} res The Express response object.
     */
    async render(req, res) {
        let htmlContent = '';
        let movieEntry = null;
        const customMessage = await this.getDatetimeString();
        try {
            const apiToken = await this.getAuthToken();

            if (apiToken) {
                movieEntry = await this.getLastAddedMovie(apiToken);
            } else {
                console.log(`Failed to obtain a token. Skipping movie data fetch.`);
            }

            if (movieEntry && movieEntry.movie) {
                const movieData = movieEntry.movie;
                const addedAt = movieEntry.addedAt;
                htmlContent = `
                    <div class="movie-card">
                        <img src="${movieData.posterPath}" alt="${movieData.title} Poster" class="movie-poster">
                        <h1 class="movie-title">🎥 ${movieData.title}</h1>
                        <p class="movie-info">${movieData.releaseDate ? movieData.releaseDate.substring(0, 4) : 'N/A'}</p><hr>
                        <p class="movie-info movie-overview">${movieData.overview}</p><hr>
                        <p class="custom-message">Showing: ${customMessage}</p>
                    </div>
                `;
            } else {
                htmlContent = `
                    <div class="message">
                        <p>Could not retrieve movie data or no movies found.</p>
                    </div>
                `;
            }
        } catch (error) {
            htmlContent = `
                <div class="error-message">
                    <h1>Server Error</h1>
                    <p>An unexpected error occurred while processing your request.</p>
                </div>
            `;
            console.error('Server error:', error);
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>📣 The Next Nest Feature 🍿</title>
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
                    .custom-message {
                        font-size: 1.5rem;
                        font-weight: bold;
                        color: #D3D3D3;
                        margin-bottom: 1rem;
                    }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `);
    }

    start() {
        app.get('/', (req, res) => this.render(req, res));
        app.listen(this.PORT, () => {
            console.log(`Web server listening on http://localhost:${this.PORT}`);
            console.log(`Open a browser and navigate to http://localhost:${this.PORT} to view the page.`);
            console.log(`Note: Running on port 80 may require elevated permissions (e.g., 'sudo node index.js' on Linux/macOS).`);
        });
    }
}

const movaryApp = new MovaryApp();
movaryApp.start();

