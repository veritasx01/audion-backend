import e from 'express';
import { httpService } from './http.service.js';
import { loggerService } from './logger.service.js';

export const spotifyService = {
  searchTracks,
};

const BASE_URL = 'https://api.spotify.com/v1/';

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = null;
let refreshTimerId = null;

// get access token for Spotify API
async function _fetchAccessToken() {
  try {
    // build request
    const basicAuthCredentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString('base64');
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuthCredentials}`,
    };
    const body = 'grant_type=client_credentials';
    const URL = 'https://accounts.spotify.com/api/token';

    // make request
    loggerService.debug('Fetching new Spotify access token...');
    const response = await httpService.post(URL, body, headers);

    // schedule refresh before expiry (1 hour default expiry)
    tokenExpiry = Date.now() + response.expires_in * 1000; // expires_in is in seconds
    loggerService.debug(
      `Received new Spotify access token. Token expires in ${response.expires_in} seconds`
    );
    _scheduleTokenRefresh(response.expires_in);

    // save and return token
    accessToken = response.access_token;
    return accessToken;
  } catch (error) {
    loggerService.error('Failed to fetch Spotify token:', error);
    // Retry in 1 minute on failure
    _scheduleTokenRefresh(60);
    throw error;
  }
}

function _scheduleTokenRefresh(secondsTillExpiry) {
  // Clear existing timer
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
  }

  // Schedule refresh 5 minutes (300 seconds) before expiry
  const milliSecondsTillRefresh = Math.max(secondsTillExpiry - 300, 60) * 1000; // At least 1 minute
  refreshTimerId = setTimeout(() => {
    loggerService.debug('Proactively refreshing Spotify token...');
    _fetchAccessToken(); // get a new token
  }, milliSecondsTillRefresh);
  loggerService.debug(
    `Spotify token refresh scheduled in ${
      milliSecondsTillRefresh / 1000
    } seconds`
  );
}

async function _getToken() {
  // Initial token fetch or emergency refresh if token is expired
  if (!accessToken || Date.now() >= tokenExpiry) {
    return await _fetchAccessToken();
  }
  return accessToken;
}

async function spotifyFetch(endpoint, params) {
  let token = await _getToken();
  const authHeader = { Authorization: `Bearer ${token}` };
  const url = `${BASE_URL}${endpoint}`;

  loggerService.debug('Spotify request:', { url, params, hasToken: !!token });

  try {
    let response = await httpService.get(url, params, authHeader);
    loggerService.debug('Spotify response received:', typeof response);
    return response;
  } catch (error) {
    loggerService.error('Spotify API error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: url,
    });

    // If it's a 401 error, try refreshing token once
    if (error.response?.status === 401) {
      loggerService.debug('Spotify token expired, refreshing...');
      token = await _fetchAccessToken();
      const newAuthHeader = { Authorization: `Bearer ${token}` };

      try {
        let response = await httpService.get(url, params, newAuthHeader);
        return response;
      } catch (retryError) {
        loggerService.error('Spotify API retry failed:', retryError);
        throw new Error(
          `Spotify API retry failed: ${retryError.message || retryError}`
        );
      }
    }

    throw new Error(
      `Spotify API error: ${error.response?.status || 'Unknown'} - ${
        error.message
      }`
    );
  }
}

// search tracks by free text
export async function searchTracks(query) {
  const queryParams = {
    q: query.trim(),
    type: 'track',
    limit: 20,
    offset: 0,
  };

  const tracksData = await spotifyFetch('search', queryParams);

  // map spotify data to song data structure
  const songs = tracksData.tracks.items.map(item => ({
    _id: item.id,
    title: item.name,
    artist: item.artists[0]?.name || 'Unknown Artist',
    albumName: item.album.name,
    duration: item.duration_ms / 1000, // convert ms to seconds
    genres: [], // Spotify API does not provide genres at track level
    releasedAt: new Date(item.album.release_date),
    thumbnail:
      item.album.images && item.album.images.length > 0
        ? item.album.images[item.album.images.length - 1].url // smallest image
        : null,
    previewUrl: item.preview_url,
    spotifyUrl: item.external_urls.spotify,
  }));

  return songs;
}
