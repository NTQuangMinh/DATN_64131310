import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Modal, TextInput, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

// Lấy kích thước màn hình thiết bị
const { width, height } = Dimensions.get('window');

export default function DeliveryConfirm() {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId } = (route.params as any) || {};

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      Alert.alert("Thông báo", "Vui lòng chụp ảnh minh chứng gói hàng trước khi ký nhận.");
      return;
    }
    setLoading(true);
    try {
      const response = await axiosInstance.post(`/orders/${orderId}/signing-url`);
      
      // Đồng bộ sử dụng (navigation as any) để đưa sang màn hình ký số DocuSign
      (navigation as any).navigate('DocuSignWebView', {
        signingUrl: response.data.signingUrl,
        orderId: orderId
      });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể kết nối dịch vụ ký số DocuSign.");
    } finally { // FIX: Sửa thành finally chuẩn cú pháp hệ thống
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
    } finally { // FIX: Sửa thành finally chuẩn cú pháp hệ thống
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
          <Text style={styles.btnText}>{loading ? "Đang tải..." : "Tiến hành ký nhận số"}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#FF3B30', marginTop: 10 }]} 
          onPress={() => setIsFailModalOpen(true)}
        >
          <Text style={styles.btnText}>Báo giao thất bại</Text>
        </TouchableOpacity>
      </View>

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
              placeholder="Nhập chi tiết lý do cụ thể tại đây..."
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
  shortcutBadge: { backgroundColor: '#E1F0FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 }
});