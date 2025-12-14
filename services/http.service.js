import Axios from 'axios';
import { loggerService } from './logger.service.js';

const axios = Axios.create({ withCredentials: true });

export const httpService = {
  get(endpoint, data, headers) {
    return ajax(endpoint, 'GET', data, headers);
  },
  post(endpoint, data, headers) {
    return ajax(endpoint, 'POST', data, headers);
  },
  put(endpoint, data, headers) {
    return ajax(endpoint, 'PUT', data, headers);
  },
  delete(endpoint, data, headers) {
    return ajax(endpoint, 'DELETE', data, headers);
  },
  patch(endpoint, data, headers) {
    return ajax(endpoint, 'PATCH', data, headers);
  },
  getBinary(endpoint, headers = {}) {
    return ajaxBinary(endpoint, headers);
  },
};

async function ajax(endpoint, method = 'GET', data = null, headers = {}) {
  const url = endpoint;
  const params = method === 'GET' ? data : null;
  const requestData = method === 'GET' ? null : data;

  const options = { url, method, data: requestData, params, headers };
  try {
    const res = await axios(options);
    return res.data;
  } catch (err) {
    loggerService.error(
      `Error '${err}' during ${method} request to ${endpoint}: with data: `,
      data
    );
    throw err;
  }
}

async function ajaxBinary(endpoint, headers = {}) {
  const options = {
    url: endpoint,
    method: 'GET',
    headers,
    responseType: 'arraybuffer', // Important: get binary data as ArrayBuffer
  };

  try {
    const res = await axios(options);
    return Buffer.from(res.data); // Convert ArrayBuffer to Buffer
  } catch (err) {
    loggerService.error(
      `Error '${err}' during binary GET request to ${endpoint}`
    );
    throw err;
  }
}
