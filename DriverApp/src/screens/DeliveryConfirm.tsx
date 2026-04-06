import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import axiosInstance from '../api/axiosInstance';

const DeliveryConfirm = ({ route, navigation }: any) => {
  const { orderId } = route.params;
  const sigRef = useRef<any>(null);

  const handleOK = async (signature: string) => {
    try {
      // Gọi API khớp với SecurityConfig: /api/orders/{id}/complete
      await axiosInstance.post(`/orders/${orderId}/complete`, {
        signature: signature, // Chuỗi Base64
        status: 'DELIVERED'
      });
      Alert.alert("Thành công", "Đơn hàng đã được giao!");
      navigation.navigate('OrderList');
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái đơn hàng.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Xác nhận đơn #{orderId}</Text>
      <View style={styles.sigBox}>
        <SignatureScreen
          ref={sigRef}
          onOK={handleOK}
          descriptionText="Khách hàng ký tên vào đây"
          webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
        />
      </View>
      <TouchableOpacity style={styles.btn} onPress={() => sigRef.current.readSignature()}>
        <Text style={styles.btnText}>HOÀN TẤT GIAO HÀNG</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginTop: 40, marginBottom: 20, textAlign: 'center' },
  sigBox: { height: 400, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, overflow: 'hidden' },
  btn: { backgroundColor: '#34C759', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});

export default DeliveryConfirm;