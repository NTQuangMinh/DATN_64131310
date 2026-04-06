import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Linking, Platform, Alert, ActivityIndicator, RefreshControl 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

const OrderListScreen = ({ navigation, onLogout }: any) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const response = await axiosInstance.get(`/orders/my-tasks?driverId=${userId}`);
      console.log("Đã nhận dữ liệu thật!");
      setOrders(response.data);
    } catch (error: any) {
      console.log("Lỗi tải đơn hàng:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openMap = (item: any) => {
    // Lấy đúng theo LOG: latitude và longitude nằm ở ngoài
    const lat = item.latitude;
    const lng = item.longitude;
    const addr = item.deliveryAddress;

    if (lat && lng) {
      const label = encodeURIComponent(addr || "Điểm giao hàng");
      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      });
      Linking.openURL(url!);
    } else {
      Alert.alert("Lỗi", "Đơn hàng không có tọa độ GPS");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Nhiệm vụ 🚛</Text>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={{color: 'red', fontWeight: 'bold'}}>Thoát</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchOrders();}} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Dùng orderCode nếu muốn hiển thị mã đẹp hơn */}
            <Text style={styles.orderId}>Mã đơn: {item.orderCode || item.id.substring(0, 8)}</Text>
            
            {/* KHỚP LOG: item.customerName */}
            <Text style={styles.info}>
              👤 Khách: <Text style={styles.bold}>{item.customerName || "Không rõ tên"}</Text>
            </Text>

            {/* KHỚP LOG: item.deliveryAddress */}
            <Text style={styles.info}>
              📍 Đ/C: <Text style={styles.bold}>{item.deliveryAddress || "Không có địa chỉ"}</Text>
            </Text>
            
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnMap} onPress={() => openMap(item)}>
                <Text style={styles.btnText}>🗺 Dẫn đường</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.btnConfirm} 
                onPress={() => navigation.navigate('DeliveryConfirm', { orderId: item.id })}
              >
                <Text style={styles.btnText}>✍️ Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Không có đơn hàng nào.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7', paddingHorizontal: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 60, marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold' },
  logoutBtn: { padding: 8, backgroundColor: '#ffe5e5', borderRadius: 8 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 15, elevation: 3 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 8 },
  info: { fontSize: 15, marginBottom: 5, color: '#444' },
  bold: { fontWeight: 'bold', color: '#000' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  btnMap: { backgroundColor: '#34C759', flex: 0.48, padding: 12, borderRadius: 10, alignItems: 'center' },
  btnConfirm: { backgroundColor: '#007AFF', flex: 0.48, padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, color: '#8e8e93' }
});

export default OrderListScreen;