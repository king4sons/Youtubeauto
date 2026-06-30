import axios from 'axios';

const api = axios.create();

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('ya_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and reload to trigger login screen
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/')) {
      localStorage.removeItem('ya_token');
      localStorage.removeItem('ya_email');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export default api;
