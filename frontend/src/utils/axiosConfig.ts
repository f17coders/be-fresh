import axios from 'axios';
import { getAccessToken, removeTokens,getRefreshToken,saveTokens } from './tokenUtils';

const axiosInstance = axios.create();

// Request interceptor 설정
axiosInstance.interceptors.request.use(
  async (config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor 설정
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          console.log('새 토큰 내놔')
          // 리프레시 토큰으로 새로운 액세스 토큰 요청
          const response = await axios.post('https://be-fresh.site/api/refresh-token', { refreshToken });
          const newAccessToken = response.data.accessToken;
          // 새로운 액세스 토큰 로컬 스토리지에 저장
          saveTokens(newAccessToken, refreshToken);
          // 새로운 액세스 토큰으로 원래 요청 재시도
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          // 리프레시 토큰 갱신에 실패한 경우 로그아웃 또는 다른 처리
          // 로그아웃 처리
          logout();
        }
      }
    }
    return Promise.reject(error);
  }
);

// 로그아웃 함수
const logout = () => {
  // 로컬 스토리지에서 토큰 제거
  removeTokens();
  // 로그인 페이지로 리다이렉트 또는 다른 처리
  // 리다이렉트 처리
  window.location.href = '/login';
};

export default axiosInstance;
