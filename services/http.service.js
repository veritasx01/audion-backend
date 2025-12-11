import Axios from 'axios';

const BASE_URL =
  import.meta.env.MODE === 'production' ? '/api/' : '//localhost:3030/api/';

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
};

async function ajax(endpoint, method = 'GET', data = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const params = method === 'GET' ? data : null;

  const options = { url, method, data, params, headers };
  try {
    const res = await axios(options);
    return res.data;
  } catch (err) {
    console.log(
      `Had Issues ${method}ing to the backend, endpoint: ${endpoint}, with data: `,
      data
    );
    console.dir(err);
    if (err.response && err.response.status === 401) {
      sessionStorage.clear();
      window.location.assign('/');
    }
    throw err;
  }
}
