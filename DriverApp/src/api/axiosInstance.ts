import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const axiosInstance = axios.create({
  // QUAN TRỌNG: Thay đổi IP này thành IP máy tính của bạn (lệnh ipconfig)
  baseURL: 'http://192.168.0.138:8080/api', 
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Tự động gắn JWT Token vào mọi yêu cầu gửi đi
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;