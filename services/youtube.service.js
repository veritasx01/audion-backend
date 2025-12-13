import { httpService } from './http.service.js';
import { loggerService } from './logger.service.js';

export const youtubeService = {
  getTracksVideoURL,
};

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

// Search YouTube for videos based on tracks metadata (song title and artist)
export async function getTracksVideoURL(songs) {
  if (songs?.length === 0) return [];

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
      key: youtubeApiKey,
    };

    try {
      const youTubeResults = await httpService.get(
        `${BASE_URL}/search`,
        queryParams
      );

      if (youTubeResults.items && youTubeResults.items.length > 0) {
        const item = youTubeResults.items[0];
        const youTubeData = {
          videoId: item.id.videoId,
          title: item.snippet.title.toLowerCase(),
          description: item.snippet.description.toLowerCase(),
          channelTitle: item.snippet.channelTitle.toLowerCase(),
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        };

        loggerService.debug(`YouTube result for ${queryTerm}:`, youTubeData);

        return {
          ...song,
          url: youTubeData.url,
          youtubeVideoId: youTubeData.videoId,
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

  // get durations for found videos
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

  loggerService.info(
    `YouTube search completed: ${
      enrichedSongs.filter(s => s.youtubeVideoId).length
    }/${songs.length} videos found`
  );

  return enrichedSongs;
}

async function _getVideosDuration(videoIds) {
  const queryParams = {
    part: 'contentDetails',
    id: videoIds.join(','),
    key: youtubeApiKey,
  };

  try {
    const response = await httpService.get(`${BASE_URL}/videos`, queryParams);

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
