import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, 
  Alert, ScrollView, ActivityIndicator, Dimensions 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import SignatureScreen from 'react-native-signature-canvas';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

const { width } = Dimensions.get('window');

const DeliveryConfirm = ({ route, navigation }: any) => {
  const { orderId } = route.params;
  
  // States quản lý dữ liệu
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Refs điều khiển Camera và Khung ký
  const cameraRef = useRef<any>(null);
  const sigRef = useRef<any>(null);

  // Tự động xin quyền Camera khi vào màn hình
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // 1. Logic Chụp ảnh
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ 
          base64: true, 
          quality: 0.5 
        });
        setCapturedImage(photo.uri); // Lưu đường dẫn ảnh để hiển thị preview
      } catch (e) {
        Alert.alert("Lỗi", "Không thể chụp ảnh. Vui lòng thử lại.");
      }
    }
  };

  // 2. Logic khi khách hàng ký xong (Hàm này được gọi bởi SignatureScreen)
  const handleSignature = async (signatureStr: string) => {
    if (!capturedImage) {
      Alert.alert("Thông báo", "Vui lòng chụp ảnh minh chứng trước khi ký xác nhận.");
      return;
    }
    
    // Tiến hành gửi dữ liệu lên Backend
    submitToBackend(signatureStr);
  };

  // 3. Gửi dữ liệu về Backend Spring Boot
  const submitToBackend = async (sigBase64: string) => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      
      // Payload khớp với đặc tả log bạn đã gửi
      const payload = {
        orderId: orderId,
        driverId: userId,
        signatureValue: sigBase64,       // Chuỗi Base64 chữ ký
        evidenceImage: capturedImage,    // URI ảnh minh chứng
        status: "COMPLETED",             // Cập nhật trạng thái hoàn thành
        checkInTime: new Date().toISOString()
      };

      await axiosInstance.post(`/orders/${orderId}/complete`, payload);

      Alert.alert("Thành công", "Đơn hàng đã được cập nhật trạng thái Giao hàng thành công!", [
        { text: "Về danh sách", onPress: () => navigation.navigate('OrderList') }
      ]);
    } catch (error: any) {
      console.log("Lỗi gửi dữ liệu:", error.response?.data);
      Alert.alert("Lỗi", "Không thể gửi dữ liệu xác nhận. Vui lòng kiểm tra kết nối mạng.");
    } finally {
      setLoading(false);
    }
  };

  // Giao diện khi chưa có quyền Camera
  if (!permission) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.warningText}>Ứng dụng cần quyền truy cập Camera để chụp ảnh minh chứng.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Cấp quyền ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={styles.header}>Xác nhận đơn #{orderId.substring(0, 8)}</Text>

      {/* PHẦN 1: CAMERA MINH CHỨNG */}
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

      {/* PHẦN 2: CHỮ KÝ KHÁCH HÀNG */}
      <View style={styles.section}>
        <Text style={styles.label}>2. Chữ ký khách hàng ✍️</Text>
        <View style={styles.sigBox}>
          <SignatureScreen
            ref={sigRef}
            onOK={handleSignature}
            descriptionText="Khách hàng ký vào khung trắng trên"
            webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
          />
        </View>
      </View>

      {/* PHẦN 3: NÚT XÁC NHẬN CUỐI CÙNG */}
      <TouchableOpacity 
        style={[styles.submitBtn, loading && { backgroundColor: '#ccc' }]} 
        onPress={() => sigRef.current.readSignature()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>HOÀN TẤT VÀ GỬI DỮ LIỆU</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.cancelBtn} 
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={{ color: '#8e8e93' }}>Quay lại</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7', padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', marginTop: 50, marginBottom: 20, textAlign: 'center', color: '#1c1c1e' },
  section: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#3a3a3c' },
  cameraBox: { height: 350, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', justifyContent: 'flex-end', alignItems: 'center' },
  camera: { ...StyleSheet.absoluteFillObject },
  captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  previewImage: { width: '100%', height: 300, borderRadius: 12, resizeMode: 'cover' },
  reTakeBtn: { marginTop: 12, alignSelf: 'center', padding: 8 },
  sigBox: { height: 250, borderWidth: 1, borderColor: '#e5e5ea', borderRadius: 12, overflow: 'hidden' },
  submitBtn: { backgroundColor: '#007AFF', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { marginTop: 15, alignSelf: 'center', padding: 10 },
  btn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, marginTop: 20 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  warningText: { textAlign: 'center', color: '#3a3a3c', fontSize: 16 }
});

export default DeliveryConfirm;