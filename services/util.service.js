import { httpService } from './http.service.js';
import { loggerService } from './logger.service.js';

export const utilService = {
  buildSortObject,
  removeEmptyObjectFields,
  replaceImageUrlsWithBase64,
};

export function removeEmptyObjectFields(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([key, value]) => value !== null && value !== undefined
    )
  );
}

function buildSortObject(sortBy, sortDir) {
  if (!sortBy) return { sort: {} };
  return { sort: { [sortBy]: sortDir } };
}

/* Download image from URL and convert to Base64 
   This function accepts an array of objects and a field name containing image URLs.
   It downloads each image, converts it to a Base64 data URL, and replaces the original URL in the objects
   with the actual Base64 data URL, suitable for embedding directly in web pages. 
   If downloading fails, it retains the original URL.
   This is useful for embedding images directly without relying on external URLs,
   such as Spotify image URLs which are CDN URLs and expire within a day.
*/
async function replaceImageUrlsWithBase64(objects, imgField = 'thumbnail') {
  const objectsImgPromises = objects.map(async obj => {
    const imgBase64 = await _downloadImageAsBase64(obj[imgField]);
    return {
      ...obj,
      [imgField]: imgBase64, // Store as Base64 data URL
    };
  });
  const objectsWithImages = await Promise.all(objectsImgPromises);
  return objectsWithImages;
}

// Helper function to download and convert image to Base64
async function _downloadImageAsBase64(imageUrl) {
  if (!imageUrl) return null;

  try {
    // Download image as binary data using httpService
    const response = await httpService.getBinary(imageUrl);

    // Determine content type from URL or default to JPEG
    let contentType = 'image/jpeg';
    if (imageUrl.includes('.png')) contentType = 'image/png';
    else if (imageUrl.includes('.webp')) contentType = 'image/webp';
    else if (imageUrl.includes('.gif')) contentType = 'image/gif';

    // Convert buffer to Base64
    const base64 = response.toString('base64');

    // Return as data URL format for easy browser usage
    const dataUrl = `data:${contentType};base64,${base64}`;

    return dataUrl;
  } catch (error) {
    loggerService.error(`Failed to download image from ${imageUrl}:`, error);
    return imageUrl; // Fallback to original URL on failure
  }
}
