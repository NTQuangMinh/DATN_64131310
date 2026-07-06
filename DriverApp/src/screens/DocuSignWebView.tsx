import React from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location'; 
import axiosInstance from '../api/axiosInstance'; 

export default function DocuSignWebView() {
  const route = useRoute();
  const navigation = useNavigation();
  
  // Lấy dữ liệu truyền từ màn hình trước
  const params = route.params as { signingUrl?: string; orderId?: string };
  const signingUrl = params?.signingUrl;
  const orderId = params?.orderId;

  // Hàm lấy tọa độ thật của tài xế
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Quyền truy cập", "Cần quyền định vị để xác nhận địa điểm giao hàng!");
        return { lat: 0, lng: 0 };
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return { 
        lat: location.coords.latitude, 
        lng: location.coords.longitude 
      };
    } catch (error) {
      console.error("Lỗi lấy GPS:", error);
      return { lat: 0, lng: 0 };
    }
  };

  const changeStatusToDelivered = async () => {
    if (!orderId) return;

    try {
      console.log(`⏳ Đang cập nhật trạng thái đơn: ${orderId}`);
      
      const coords = await getCurrentLocation();
      const storedImage = await AsyncStorage.getItem(`evidence_${orderId}`);

      const requestBody = {
        orderId: orderId,
        status: "DELIVERED",
        failureReason: "",
        signatureValue: "DocuSign Verified",
        actualLatitude: coords.lat,
        actualLongitude: coords.lng,
        evidenceImage: storedImage || ""
      };

      await axiosInstance.post(`/orders/${orderId}/complete`, requestBody); 
      
      console.log("✅ Backend đã cập nhật thành công!");
      await AsyncStorage.removeItem(`evidence_${orderId}`);
      
    } catch (error: any) {
      console.error("❌ Lỗi API:", error.response?.data || error.message);
      Alert.alert("Thông báo", "Ký số thành công nhưng gặp lỗi đồng bộ dữ liệu lên hệ thống.");
    }
  };

  const handleNavigationStateChange = async (navState: any) => {
    // Kiểm tra các URL báo hiệu hoàn tất ký số
    const successUrls = ['signing_complete', 'success', 'finish', 'localhost'];
    if (successUrls.some(url => navState.url.includes(url))) {
      await changeStatusToDelivered();
      navigation.navigate('OrderList' as never);
    }
  };

  if (!signingUrl) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: signingUrl }}
        cacheEnabled={false}
        incognito={true}
        startInLoadingState={true}
        renderLoading={() => (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
        )}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onError={async () => {
            await changeStatusToDelivered();
            navigation.navigate('OrderList' as never);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { position: 'absolute', top: '50%', left: '45%' }
});