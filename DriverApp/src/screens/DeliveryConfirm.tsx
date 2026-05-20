import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Modal, TextInput, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axiosInstance from '../api/axiosInstance';

const { width, height } = Dimensions.get('window');

export default function DeliveryConfirm() {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId } = (route.params as any) || {};

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // RÀNG BUỘC ĐẶC TẢ: State kiểm soát tài xế đã nhấn Check-in hay chưa
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const [isFailModalOpen, setIsFailModalOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  
  const cameraRef = useRef<any>(null);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={{ textAlign: 'center', marginBottom: 10 }}>Ứng dụng cần quyền truy cập Camera để chụp ảnh minh chứng</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Cấp quyền Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // =======================================================================
  // NGHIỆP VỤ TUẦN 6: Hàm gọi API Check-in ghi vị trí GPS thực tế
  // =======================================================================
  const handleCheckInAction = async () => {
    setCheckingIn(true);
    try {
      // 1. Lấy vị trí GPS chính xác ngay tại thời điểm tài xế bấm nút
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const userId = await AsyncStorage.getItem('userId') || "UNKNOWN_DRIVER";
      
      // 2. Gọi API nạp Audit Log lên Server Spring Boot
      await axiosInstance.post(`/orders/${orderId}/check-in?driverId=${userId}&lat=${loc.coords.latitude}&lng=${loc.coords.longitude}`);
      
      Alert.alert("Thành công", "Hệ thống đã ghi nhận thời gian và vị trí Check-in của bạn. Mở khóa Camera minh chứng!");
      setHasCheckedIn(true); // Kích hoạt mở khóa màn hình chụp ảnh
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lấy vị trí GPS hoặc lỗi kết nối Server.");
    } finally {
      setCheckingIn(false);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
        const base64Data = `data:image/jpeg;base64,${photo.base64}`;
        setCapturedImage(base64Data);
        await AsyncStorage.setItem(`evidence_${orderId}`, base64Data);
      } catch (e) {
        Alert.alert("Lỗi", "Không thể chụp hình ảnh lúc này.");
      }
    }
  };

  const handleProceedToSigning = async () => {
    if (!capturedImage) {
      Alert.alert("Thông báo", "Vui lòng chụp ảnh minh chứng gói hàng trước khi ký nhận Check-out.");
      return;
    }
    setLoading(true);
    try {
      const response = await axiosInstance.post(`/orders/${orderId}/signing-url`);
      (navigation as any).navigate('DocuSignWebView', {
        signingUrl: response.data.signingUrl,
        orderId: orderId
      });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể kết nối dịch vụ ký số DocuSign.");
    } finally {
      setLoading(false);
    }
  };

  const handleReportFailure = async () => {
    if (!failReason.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập rõ lý do giao hàng thất bại.");
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.post(`/orders/${orderId}/complete`, {
        orderId: orderId,
        status: "CANCELED",
        failureReason: failReason,
        signatureValue: "FAILED_REPORTED",
        actualLatitude: 0,
        actualLongitude: 0,
        evidenceImage: capturedImage || ""
      });
      
      Alert.alert("Thành công", "Đã cập nhật báo cáo giao hàng thất bại lên hệ thống.");
      setIsFailModalOpen(false);
      (navigation as any).navigate('OrderList');
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gửi báo cáo thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* NẾU CHƯA CHECK-IN: Hiển thị màn hình khóa yêu cầu tài xế Check-in trước */}
      {!hasCheckedIn ? (
        <View style={styles.checkInRequiredOverlay}>
          <Text style={{ fontSize: 45, marginBottom: 15 }}>📍</Text>
          <Text style={styles.checkInTitle}>Bạn Đã Đến Điểm Giao Hàng?</Text>
          <Text style={styles.checkInSub}>Quy trình bắt buộc: Tài xế cần bấm nút dưới đây để hệ thống ghi nhận thời gian và tọa độ vệ tinh thực tế trước khi giao.</Text>
          
          <TouchableOpacity 
            style={styles.checkInSubmitBtn} 
            onPress={handleCheckInAction}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkInSubmitBtnText}>XÁC NHẬN CHECK-IN TẠI ĐÂY</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* NẾU ĐÃ CHECK-IN XONG: Cho phép chụp ảnh và kích hoạt luồng đóng đơn */
        <View style={{ flex: 1 }}>
          {capturedImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: capturedImage }} style={styles.preview} />
              <TouchableOpacity style={[styles.btn, {backgroundColor: '#666', marginTop: 15}]} onPress={() => setCapturedImage(null)}>
                <Text style={styles.btnText}>Chụp lại ảnh khác</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView style={styles.camera} ref={cameraRef}>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                  <View style={styles.innerCaptureBtn} />
                </TouchableOpacity>
              </View>
            </CameraView>
          )}

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#34C759' }]} 
              onPress={handleProceedToSigning}
              disabled={loading}
            >
              <Text style={styles.btnText}>{loading ? "Đang tải..." : "Tiến hành ký nhận (Check-out)"}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#FF3B30', marginTop: 10 }]} 
              onPress={() => setIsFailModalOpen(true)}
            >
              <Text style={styles.btnText}>Báo giao thất bại</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODAL BÁO CÁO THẤT BẠI */}
      <Modal visible={isFailModalOpen} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lý do giao thất bại</Text>
            <View style={styles.shortcutContainer}>
              {["Khách không nhấc máy", "Khách hẹn ngày khác", "Sai địa chỉ / SĐT"].map((reason) => (
                <TouchableOpacity key={reason} style={styles.shortcutBadge} onPress={() => setFailReason(reason)}>
                  <Text style={{ fontSize: 12, color: '#007AFF' }}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập chi tiết lý do cụ thể..."
              multiline={true}
              numberOfLines={3}
              value={failReason}
              onChangeText={setFailReason}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#999' }]} onPress={() => setIsFailModalOpen(false)}>
                <Text style={styles.btnText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#FF3B30' }]} onPress={handleReportFailure}>
                <Text style={styles.btnText}>Xác nhận hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  camera: { flex: 1, justifyContent: 'flex-end' },
  buttonContainer: { flexDirection: 'row', backgroundColor: 'transparent', justifyContent: 'center', marginBottom: 30 },
  captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' },
  innerCaptureBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  preview: { width: width * 0.85, height: height * 0.5, borderRadius: 16, resizeMode: 'cover' },
  footer: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  actionBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btn: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 20, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  textInput: { width: '100%', borderColor: '#ccc', borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13, height: 70, textAlignVertical: 'top' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  shortcutContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, justifyContent: 'center' },
  shortcutBadge: { backgroundColor: '#E1F0FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 },

  // Giao diện màn hình Khóa Check-in bắt buộc
  checkInRequiredOverlay: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', padding: 30 },
  checkInTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  checkInSub: { fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 18, marginBottom: 30 },
  checkInSubmitBtn: { backgroundColor: '#007AFF', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  checkInSubmitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 }
});