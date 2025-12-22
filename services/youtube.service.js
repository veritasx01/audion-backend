import { httpService } from './http.service.js';
import { loggerService } from './logger.service.js';

export const youtubeService = {
  enrichSongsWithYouTubeData,
};

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// API key rotation system
let youtubeApiKeys = [];
let currentKeyIndex = 0;
let numOfKeys = 0; // this is set on _initializeApiKeys

_initializeApiKeys();

// Initialize API keys from environment variable
function _initializeApiKeys() {
  try {
    youtubeApiKeys = JSON.parse(process.env.YOUTUBE_API_KEYS || '[]');
    numOfKeys = youtubeApiKeys.length;
    if (youtubeApiKeys.length === 0) {
      loggerService.error(
        'No YouTube API keys found in environment variables under the key YOUTUBE_API_KEYS. set it to YOUTUBE_API_KEYS=["API_KEY_1","API_KEY_2",...]'
      );
    }
  } catch (error) {
    loggerService.error('Failed to parse YouTube API keys:', error);
    youtubeApiKeys = [process.env.YOUTUBE_API_KEY].filter(Boolean);
  }
}

// Get current API key
function _getCurrentApiKey() {
  return youtubeApiKeys[currentKeyIndex];
}

// Rotate to next available API key when quota is exceeded
function _rotateApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % youtubeApiKeys.length;
  loggerService.info(
    `Rotated to YouTube API key ${currentKeyIndex + 1}/${youtubeApiKeys.length}`
  );
  return _getCurrentApiKey();
}

// Make YouTube API request with automatic key rotation handling
async function _makeYouTubeRequest(endpoint, params, maxRetries = numOfKeys) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const requestParams = {
        ...params,
        key: _getCurrentApiKey(),
      };

      const response = await httpService.get(endpoint, requestParams);
      return response;
    } catch (error) {
      // Check if it's a quota exceeded error (403)
      if (error.response?.status === 403 && attempt < maxRetries - 1) {
        loggerService.warn(
          `YouTube API quota exceeded for key ${
            currentKeyIndex + 1
          }, rotating to next key`
        );
        _rotateApiKey();
        continue;
      }
      loggerService.error('YouTube API request failed', error);
      throw error;
    }
  }
}

// Search YouTube for videos based on tracks metadata (song title and artist)
export async function enrichSongsWithYouTubeData(songs) {
  if (songs?.length === 0) return [];

  const endpoint = `${BASE_URL}/search`;

  // Use Promise.all to wait for all async operations to complete
  const youtubePromises = songs.map(async song => {
    // construct query params for the youtube search API
    const queryTerm = `${song.title} ${song.artist} lyrics`;
    const queryParams = {
      part: 'snippet',
      q: queryTerm,
      type: 'video',
      maxResults: 1, // Get top result for each song
      order: 'relevance',
    };

    try {
      const youTubeResults = await _makeYouTubeRequest(endpoint, queryParams);

      if (youTubeResults?.items?.length > 0) {
        const youTubeData = youTubeResults.items[0];

        return {
          ...song,
          url: `https://www.youtube.com/watch?v=${youTubeData.id.videoId}`,
          youtubeVideoId: youTubeData.id.videoId,
          youtubeTitle: youTubeData.snippet.title,
          youtubeDescription: youTubeData.snippet.description,
          youtubeChannelTitle: youTubeData.snippet.channelTitle,
        };
      } else {
        loggerService.warn(`No YouTube results found for ${queryTerm}`);
        return {
          ...song,
          url: null,
          youtubeVideoId: null,
        };
      }
    } catch (err) {
      loggerService.error(
        `Failed to fetch YouTube video for ${queryTerm}`,
        err
      );
      return {
        ...song,
        url: null,
        youtubeVideoId: null,
      };
    }
  });

  // Wait for all YouTube searches to complete
  const enrichedSongs = await Promise.all(youtubePromises);

  // enrich songs with the video duration info from videos endpoint
  const videoIds = enrichedSongs
    .filter(song => song.youtubeVideoId)
    .map(song => song.youtubeVideoId);

  // Fetch durations
  const durationsMap = await _getVideosDuration(videoIds);

  // Attach durations to songs
  enrichedSongs.forEach(song => {
    if (song.youtubeVideoId && durationsMap.has(song.youtubeVideoId)) {
      song.duration = durationsMap.get(song.youtubeVideoId);
    } else {
      song.duration = null;
    }
  });

  return enrichedSongs;
}

// gets videos durations from YouTube videos endpoint for an array of video IDs
async function _getVideosDuration(videoIds) {
  const endpoint = `${BASE_URL}/videos`;
  const queryParams = {
    part: 'contentDetails',
    id: videoIds.join(','),
  };

  try {
    const response = await _makeYouTubeRequest(endpoint, queryParams);

    const durations = new Map();
    response.items.forEach(item => {
      durations.set(item.id, _parseDuration(item.contentDetails.duration)); // Convert to seconds
    });

    return durations;
  } catch (err) {
    loggerService.error('Failed to fetch YouTube video durations', err);
    throw err;
  }
}

// Helper function to convert YouTube duration format to seconds
function _parseDuration(duration) {
  if (!duration) return null;

  // YouTube duration format: PT#H#M#S (e.g., PT2M57S, PT1H23M45S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return null;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}
