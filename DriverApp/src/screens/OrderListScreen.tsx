import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, Dimensions, ActivityIndicator 
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

const { width, height } = Dimensions.get('window');

const OrderListScreen = ({ navigation, onLogout }: any) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]); // Toạ độ đường đi
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền vị trí để dẫn đường');
        return;
      }

      // Theo dõi vị trí tài xế real-time
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (loc) => {
          setDriverLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
        }
      );
      fetchOrders();
    })();
  }, []);

  const fetchOrders = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const response = await axiosInstance.get(`/orders/my-tasks?driverId=${userId}`);
      setOrders(response.data);
    } catch (error) {
      console.log("Lỗi fetch đơn:", error);
    } finally {
      setLoading(false);
    }
  };

  // HÀM LẤY ĐƯỜNG ĐI MIỄN PHÍ TỪ OSRM
  const getRoute = async (order: any) => {
    if (!driverLocation) return;
    
    setSelectedOrder(order);
    const start = `${driverLocation.longitude},${driverLocation.latitude}`;
    const end = `${order.longitude},${order.latitude}`;
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;
      const resp = await fetch(url);
      const json = await resp.json();

      if (json.routes && json.routes.length > 0) {
        // Chuyển đổi GeoJSON thành mảng toạ độ cho Polyline
        const points = json.routes[0].geometry.coordinates.map((coord: any) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoords(points);

        // Tự động zoom bản đồ bao quát cả đường đi
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.log("Lỗi OSRM:", error);
      Alert.alert("Lỗi", "Không thể tìm đường đi lúc này.");
    }
  };

  return (
    <View style={styles.container}>
      {/* PHẦN 1: BẢN ĐỒ MIỄN PHÍ */}
      <View style={styles.mapContainer}>
        {driverLocation ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={driverLocation}
            showsUserLocation={true}
          >
            {/* Sử dụng dữ liệu bản đồ mở OpenStreetMap */}
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
            />

            {/* Vẽ Marker cho các đơn hàng */}
            {orders.map((order) => (
              <Marker
                key={order.id}
                coordinate={{ latitude: order.latitude, longitude: order.longitude }}
                onPress={() => getRoute(order)}
                title={order.orderCode}
              >
                <View style={[styles.marker, selectedOrder?.id === order.id && styles.activeMarker]}>
                  <Text>📦</Text>
                </View>
              </Marker>
            ))}

            {/* VẼ ĐƯỜNG ĐI MÀU XANH */}
            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeWidth={5}
                strokeColor="#007AFF"
              />
            )}
          </MapView>
        ) : (
          <ActivityIndicator size="large" style={{ flex: 1 }} />
        )}
      </View>

      {/* PHẦN 2: DANH SÁCH ĐƠN HÀNG */}
      <View style={styles.listContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lộ trình của bạn</Text>
          <TouchableOpacity onPress={onLogout}><Text style={{color: 'red'}}>Thoát</Text></TouchableOpacity>
        </View>

        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.card, selectedOrder?.id === item.id && styles.selectedCard]} 
              onPress={() => getRoute(item)}
            >
              <View style={{flex: 1}}>
                <Text style={styles.orderCode}>{item.orderCode}</Text>
                <Text style={styles.addr} numberOfLines={1}>📍 {item.deliveryAddress}</Text>
              </View>
              <TouchableOpacity 
                style={styles.confirmBtn}
                onPress={() => navigation.navigate('DeliveryConfirm', { orderId: item.id })}
              >
                <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>Xác nhận</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { height: height * 0.45 },
  map: { ...StyleSheet.absoluteFillObject },
  marker: { backgroundColor: '#fff', padding: 5, borderRadius: 20, borderWidth: 1, borderColor: '#007AFF' },
  activeMarker: { backgroundColor: '#007AFF', borderColor: '#fff' },
  listContainer: { flex: 1, backgroundColor: '#f8f9fa', borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: -20, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  selectedCard: { borderColor: '#007AFF', borderWidth: 1 },
  orderCode: { fontWeight: 'bold', fontSize: 15, color: '#007AFF' },
  addr: { color: '#666', fontSize: 13, marginTop: 4 },
  confirmBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8, marginLeft: 10 }
});

export default OrderListScreen;