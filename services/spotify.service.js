import { httpService } from './http.service.js';
import { utilService } from './util.service.js';
import { loggerService } from './logger.service.js';
import { request } from 'express';

export const spotifyService = {
  searchTracks,
  searchPlaylists,
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
  const url = `${BASE_URL}${endpoint}`;
  const authHeader = { Authorization: `Bearer ${token}` };

  try {
    let response = await httpService.get(url, params, authHeader);
    return response;
  } catch (error) {
    loggerService.error('Spotify API error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: url,
      requestParams: params,
      hasToken: !!token,
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

    // If it's a 429 error (rate limit), wait and retry once
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) {
        const waitTime = parseInt(retryAfter) * 1000; // Convert seconds to milliseconds
        loggerService.warn(
          `Spotify rate limit hit, waiting ${retryAfter} seconds before retry...`
        );

        await new Promise(resolve => setTimeout(resolve, waitTime));

        try {
          let response = await httpService.get(url, params, authHeader);
          loggerService.debug('Spotify rate limit retry successful');
          return response;
        } catch (retryError) {
          loggerService.error('Spotify rate limit retry failed:', retryError);
          throw new Error(
            `Spotify rate limit retry failed: ${
              retryError.message || retryError
            }`
          );
        }
      } else {
        loggerService.warn(
          'Spotify rate limit hit but no Retry-After header found'
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
export async function searchTracks(query, limit = 5) {
  try {
    // fetch tracks from Spotify API
    const queryParams = { q: query, type: 'track', limit: 50 };
    const tracksData = await spotifyFetch('search', queryParams);

    // map spotify track schema to our app song schema
    let songs = tracksData.tracks.items.map(_transformSongSchema);

    // exclude irrelevant tracks based on title/album heuristics
    const relevantSongs = _excludeIrrelevantTracks(songs, query);
    loggerService.debug(`Excluded the following tracks for query "${query}":`);
    loggerService.debug(songs.filter(song => !relevantSongs.includes(song)));

    // return top relevant tracks up to limit
    return relevantSongs?.slice(0, limit);
  } catch (err) {
    loggerService.error(`Spotify tracks search by "${query}" failed`, err);
    throw err;
  }
}

export async function searchPlaylists(query, limit = 10) {
  const params = { q: query, type: 'playlist', limit };

  try {
    // Get Spotify playlists matching the query
    const playlistsData = await spotifyFetch('search', params);
    if (!playlistsData?.playlists?.items?.length) return [];

    // Transform Spotify playlist schema to our app schema
    let playlists = playlistsData.playlists.items
      .map(_transformPlaylistSchema)
      .filter(p => p !== null);

    // Collect in parallel tracks for all playlists & exclude empty ones
    playlists = await _getPlaylistsTracks(playlists);
    playlists = playlists.filter(p => p.songs.length > 0);

    // collect in parallel user profile images for all playlists creators
    const userImgMap = await _getUsersProfileImgs(
      playlists.map(p => p.createdBy._id)
    );

    // map user profile images to playlists
    playlists.forEach(p => {
      p.createdBy.profileImg = userImgMap[p.createdBy._id];
    });

    return playlists;
  } catch (err) {
    loggerService.error(`Spotify playlists search by  "${query}" failed`, err);
    throw err;
  }
}

/* This function receives an array of Spotify playlists and fetches their tracks
   It servers as a wrapper around _getPlaylistTracks to process multiple playlists in parallel. */
async function _getPlaylistsTracks(playlists) {
  // Fetch tracks for all playlists in parallel using Promise.all
  const playlistsTracksPromises = playlists.map(async playlist => {
    let tracks = [];
    let playlistId = playlist.spotifyPlaylistId;
    try {
      tracks = await _getPlaylistTracks(playlistId);
    } catch (err) {
      loggerService.error(`Failed fetching tracks for ${playlistId}:`, err);
    } finally {
      return {
        ...playlist,
        songs: tracks || [], // Ensure tracks is at least an empty array
      };
    }
  });

  // Wait for all playlist track requests to complete
  const playlistsWithTracks = await Promise.all(playlistsTracksPromises);
  return playlistsWithTracks;
}

// This function receives a Spotify playlist ID and fetches its tracks
async function _getPlaylistTracks(playlistId, limit = 50) {
  const endpoint = `playlists/${playlistId}/tracks`;
  const outputFields =
    'items(added_at,track(type,id,name,duration_ms,images,artists(id,name),album(id,name,release_date,images)))';
  const queryParams = { limit, fields: outputFields };
  try {
    // Fetch playlist tracks from Spotify API
    const tracksData = await spotifyFetch(endpoint, queryParams);
    if (!tracksData?.items?.length) return [];

    let tracks = tracksData.items
      .filter(item => item?.track?.type === 'track' && item?.track.id !== null) // assert item is valid track (and not an episode or an empty track object)
      .map(item => {
        // map to our song schema
        const song = _transformSongSchema(item.track);
        song.addedAt = item.added_at ? new Date(item.added_at) : null;
        return song;
      });

    return tracks;
  } catch (err) {
    loggerService.error(`Failed fetching tracks for ${playlistId}`, err);
    throw err;
  }
}

function _excludeIrrelevantTracks(tracks, queryString) {
  const queryRegex = new RegExp(
    queryString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i'
  );
  const titleExclusionRegex =
    /\b(remix|edit|version|karaoke|instrumental|cover)\b|\s-\s*live\b/i;
  const albumExclusionRegex =
    /\b(best of|mix|remix|collection|playlist|live|soundtrack|highlights from|anniversary)\b/i;

  return tracks.filter(track => {
    // assert query matches either title, artist, or album
    // const trackMatchesQuery = queryRegex.test(track.title) || queryRegex.test(track.artist) || queryRegex.test(track.albumName);

    // assert album & title name are relevant
    const isAlbumRelevant = !albumExclusionRegex.test(track.albumName);
    const isTitleRelevant = !titleExclusionRegex.test(track.title);

    return isAlbumRelevant && isTitleRelevant; // && trackMatchesQuery
  });
}

function _transformSongSchema(track) {
  if (!track) return null;
  const imgs = track.album?.images || [];
  return {
    _id: track.id,
    title: track.name,
    artist: track.artists[0]?.name || '',
    albumName: track.album.name,
    duration: Math.ceil(track.duration_ms / 1000), // default initialization for display on playlist details table, would be overriden later with youtube video duration
    releasedAt: new Date(track.album.release_date),
    thumbnail: imgs[0]?.url,
  };
}

function _transformPlaylistSchema(playlist) {
  if (!playlist) return null;
  const imgs = playlist.images || [];
  return {
    spotifyPlaylistId: playlist.id,
    title: playlist.name || 'Untitled Playlist',
    description: playlist.description || '',
    thumbnail: imgs[0]?.url,
    createdBy: {
      _id: playlist.owner?.id || 'unknown',
      fullName: playlist.owner?.display_name || 'Unknown User',
      isSpotifyUser: true,
    },
  };
}

async function _getUserProfileImg(userId) {
  try {
    const userProfileData = await spotifyFetch(`users/${userId}`);
    return userProfileData.images?.[0]?.url || null;
  } catch (err) {
    loggerService.error(`Failed fetching image for user ${userId}`, err);
    return null; // return null on error
  }
}

async function _getUsersProfileImgs(userIds) {
  const uniqueUserIds = [...new Set(userIds)];
  const userImgMap = {};
  try {
    // fetch in parallel images for all users
    const userImgPromises = uniqueUserIds.map(async userId => {
      const imgUrl = await _getUserProfileImg(userId);
      return { userId, imgUrl };
    });
    // await all results to return
    const usersImgs = await Promise.all(userImgPromises);

    // build a map of userId to imgUrl
    usersImgs.forEach(({ userId, imgUrl }) => {
      userImgMap[userId] = imgUrl;
    });
  } catch (err) {
    loggerService.error(`Bulk request for user images failed`, err);
  } finally {
    return userImgMap;
  }
}
