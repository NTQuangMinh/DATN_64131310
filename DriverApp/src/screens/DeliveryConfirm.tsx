import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, 
  Alert, ScrollView, ActivityIndicator, Dimensions 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

const { width } = Dimensions.get('window');

// --- 1. DI CHUYỂN STYLES LÊN TRÊN ĐỂ TRÁNH LỖI HOISTING ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7', padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 20, fontWeight: 'bold', marginTop: 50, marginBottom: 20, textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  cameraBox: { height: 400, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', justifyContent: 'flex-end', alignItems: 'center' },
  camera: { ...StyleSheet.absoluteFillObject },
  captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  previewImage: { width: '100%', height: 400, borderRadius: 12 },
  reTakeBtn: { marginTop: 12, alignSelf: 'center' },
  infoBox: { padding: 15, backgroundColor: '#e8f2ff', borderRadius: 10, marginBottom: 20 },
  infoText: { color: '#007AFF', fontSize: 14, lineHeight: 20 },
  submitBtn: { backgroundColor: '#34C759', padding: 18, borderRadius: 15, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { marginTop: 20, alignSelf: 'center', paddingBottom: 40 },
  btn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  warningText: { textAlign: 'center', marginBottom: 20 }
});

const DeliveryConfirm = ({ route, navigation }: any) => {
  // Lấy orderId từ params an toàn
  const orderId = route.params?.orderId || '';
  
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ 
          base64: true, 
          quality: 0.5 
        });
        setCapturedImage(photo.uri);
      } catch (e) {
        Alert.alert("Lỗi", "Không thể chụp ảnh. Vui lòng thử lại.");
      }
    }
  };

  const handleStartDigitalSignature = async () => {
    if (!capturedImage) {
        Alert.alert("Thông báo", "Vui lòng chụp ảnh minh chứng trước khi ký xác nhận.");
        return;
    }

    setLoading(true);

    // Chống lỗi nếu orderId là object
    const idToSend = typeof orderId === 'object' ? orderId.id : orderId;

    try {
        // Lưu ảnh minh chứng
        await AsyncStorage.setItem(`evidence_${idToSend}`, capturedImage);

        // GỌI API LẤY LINK KÝ (Đã bỏ /api vì trong axiosInstance của bạn đã có sẵn)
        const response = await axiosInstance.post(`/orders/${idToSend}/signing-url`);
        
        console.log("✅ DocuSign URL:", response.data.signingUrl);

        if (response.data && response.data.signingUrl) {
            navigation.navigate('DocuSignWebView', { 
                signingUrl: response.data.signingUrl,
                orderId: idToSend 
            });
        }
    } catch (error: any) {
        console.error("❌ Error:", error.response?.data || error.message);
        Alert.alert("Lỗi", "Không thể lấy link ký. Vui lòng kiểm tra kết nối Server.");
    } finally {
        setLoading(false);
    }
  };

  if (!permission) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.warningText}>Cần quyền Camera để minh chứng giao hàng.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Cấp quyền ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Fix lỗi substring an toàn */}
      <Text style={styles.header}>
        Xác nhận đơn #{orderId ? orderId.toString().substring(0, 8) : '...'}
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>1. Ảnh minh chứng giao hàng 📸</Text>
        {capturedImage ? (
          <View>
            <Image source={{ uri: capturedImage }} style={styles.previewImage} />
            <TouchableOpacity onPress={() => setCapturedImage(null)} style={styles.reTakeBtn}>
              <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Chụp lại ảnh khác</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraBox}>
            <CameraView style={styles.camera} ref={cameraRef} />
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>ℹ️ Hệ thống sẽ mở trình duyệt ký số DocuSign để bạn ký xác nhận giao hàng.</Text>
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, (!capturedImage || loading) && { backgroundColor: '#ccc' }]} 
        onPress={handleStartDigitalSignature}
        disabled={loading || !capturedImage}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>TIẾN HÀNH KÝ SỐ PKI</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={{ color: '#8e8e93' }}>Quay lại</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default DeliveryConfirm;