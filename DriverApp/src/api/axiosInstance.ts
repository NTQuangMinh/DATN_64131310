import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const axiosInstance = axios.create({
  baseURL: 'http://172.20.10.3:8080/api', 
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

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