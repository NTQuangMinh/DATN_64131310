import React from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance'; 

export default function DocuSignWebView() {
  const route = useRoute();
  const navigation = useNavigation();
  
  // Lấy signingUrl và orderId từ màn hình trước truyền sang
  const { signingUrl, orderId } = (route.params as any) || {};

  // Hàm gọi API hoàn thành đơn hàng khớp 100% cấu trúc Request Body trong Swagger
  const changeStatusToDelivered = async () => {
    try {
      console.log(`⏳ Đang chuẩn bị dữ liệu gửi lên API complete cho đơn: ${orderId}`);
      
      // 1. Lấy lại ảnh minh chứng đã chụp ở bước trước từ AsyncStorage
      const storedImage = await AsyncStorage.getItem(`evidence_${orderId}`);

      // 2. Tạo Request Body đúng cấu trúc JSON mà Swagger yêu cầu
      const requestBody = {
        orderId: orderId,
        status: "DELIVERED",                 // Trạng thái thành công theo yêu cầu của bạn
        failureReason: "",                   // Thành công nên lý do thất bại để trống
        signatureValue: "DocuSign Verified", // Đánh dấu là đã ký qua hệ thống DocuSign
        actualLatitude: 0,                   // Tọa độ giả lập 0 (hoặc lấy tọa độ thật nếu có)
        actualLongitude: 0,
        evidenceImage: storedImage || ""     // Chuỗi URI hoặc Base64 của ảnh minh chứng
      };

      console.log("📦 Request Body gửi đi:", JSON.stringify(requestBody, null, 2));

      // 3. Gọi API POST truyền cả Path Variable lẫn Request Body
      await axiosInstance.post(`/orders/${orderId}/complete`, requestBody); 
      
      console.log("✅ Backend đã cập nhật trạng thái đơn hàng sang DELIVERED!");
      
      // Xóa dữ liệu ảnh tạm sau khi đã up lên server thành công (Tùy chọn cho sạch bộ nhớ)
      await AsyncStorage.removeItem(`evidence_${orderId}`);

    } catch (error: any) {
      console.error("❌ Lỗi khi gọi API complete đơn hàng:", error.response?.data || error.message);
      Alert.alert("Thông báo", "Ký số thành công nhưng không thể cập nhật trạng thái đơn hàng lên hệ thống.");
    }
  };

  // Hàm xử lý khi DocuSign điều hướng URL (Trường hợp mạng tốt)
  const handleNavigationStateChange = async (navState: any) => {
    if (
      navState.url.includes('success') || 
      navState.url.includes('finish') || 
      navState.url.includes('localhost') || 
      navState.url.includes('signing_complete')
    ) {
      await changeStatusToDelivered();
      navigation.navigate('OrderList' as never);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: signingUrl }}
        startInLoadingState={true}
        renderLoading={() => (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
        )}
        onNavigationStateChange={handleNavigationStateChange}
        
        // Bắt lỗi mạng -1003 (khi DocuSign chuyển hướng về localhost/host ảo)
        onError={async (syntheticEvent) => {
          console.log("🚀 Phát hiện tài xế ký xong (Kích hoạt qua Event lỗi kết nối ảo)!");
          await changeStatusToDelivered();
          navigation.navigate('OrderList' as never);
        }}
        
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { position: 'absolute', top: '50%', left: '45%' }
});