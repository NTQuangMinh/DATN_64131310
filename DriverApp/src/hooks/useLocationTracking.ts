import { useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance'; // Trỏ đúng đường dẫn của bạn

export const useLocationTracking = () => {
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      try {
        // 1. Xin quyền truy cập vị trí (Foreground)
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Tài xế đã từ chối cấp quyền vị trí!');
          return;
        }

        // 2. Lấy ID tài xế đang đăng nhập (Lưu lúc Login)
        // Lưu ý: Đổi 'userId' thành đúng key bạn đang dùng trong AsyncStorage
        const driverId = await AsyncStorage.getItem('userId');
        if (!driverId) return;

        console.log("🚀 Bắt đầu theo dõi vị trí cho tài xế:", driverId);

        // 3. Theo dõi sự thay đổi vị trí
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Bắn API khi tài xế di chuyển được 10 mét
            timeInterval: 10000,  // HOẶC cứ 10 giây bắn 1 lần (tùy điều kiện nào đến trước)
          },
          async (location) => {
            const { latitude, longitude } = location.coords;
            
            try {
              // 4. Gửi DTO lên Backend
              await axiosInstance.post('/users/location', {
                driverId: driverId,
                latitude: latitude,
                longitude: longitude
              });
              console.log(`📍 Đã cập nhật tọa độ: [${latitude}, ${longitude}]`);
            } catch (apiError) {
              console.error("❌ Lỗi API khi gửi tọa độ:", apiError);
            }
          }
        );
      } catch (error) {
        console.error("❌ Lỗi khởi tạo GPS:", error);
      }
    };

    startTracking();

    // 5. Cleanup: Tắt theo dõi khi tài xế đăng xuất hoặc tắt component
    return () => {
      if (locationSubscription) {
        console.log("🛑 Dừng theo dõi vị trí.");
        locationSubscription.remove();
      }
    };
  }, []); // [] đảm bảo chỉ chạy 1 lần khi mount
};