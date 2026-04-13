import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { translateErrorCode } from '../i18n/errors';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const locale = localStorage.getItem('skillshub-locale') || 'zh-CN';
    config.headers['Accept-Language'] = locale;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const locale = localStorage.getItem('skillshub-locale') || 'zh-CN';

    if (error.response) {
      const code = error.response.data?.error_code;
      const translated = translateErrorCode(code, locale);
      if (translated) {
        error.response.data.error = translated;
      }

      switch (error.response.status) {
        case 401:
          localStorage.removeItem('token');
          console.warn(error.response.data?.error || (locale.startsWith('en') ? 'Authentication required' : '需要登录后继续'));
          break;
        case 403:
          console.error(error.response.data?.error || 'Access forbidden');
          break;
        case 404:
          console.error(error.response.data?.error || 'Resource not found');
          break;
        case 500:
          console.error(error.response.data?.error || 'Server error');
          break;
      }
    } else if (error.request) {
      console.error(locale.startsWith('en') ? 'Network error' : '网络请求失败');
    } else {
      console.error('Request error:', error.message);
    }
    return Promise.reject(error);
  },
);

export default apiClient;