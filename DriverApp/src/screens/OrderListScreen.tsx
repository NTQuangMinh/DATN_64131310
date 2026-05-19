import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, Dimensions, ActivityIndicator, RefreshControl
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

const { width, height } = Dimensions.get('window');

const OrderListScreen = ({ navigation, onLogout }: any) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); 
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]); 
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
  
  const mapRef = useRef<MapView>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    let locationSubscription: any;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền vị trí để dẫn đường');
        return;
      }
      locationSubscription = await Location.watchPositionAsync(
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
    })();
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchOrders();
    }
  }, [isFocused]);

  useEffect(() => {
    calculateOptimizedRoute();
  }, [selectedOrders]);

  const fetchOrders = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const response = await axiosInstance.get(`/orders/my-tasks?driverId=${userId}`);
      setOrders(response.data);
      
      setSelectedOrders((prevSelected) => 
        prevSelected.filter(selectedItem => 
          response.data.some((freshOrder: any) => freshOrder.id === selectedItem.id)
        )
      );
    } catch (error) {
      console.log("Lỗi fetch đơn:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleStartDelivery = async (orderId: string) => {
    try {
      setLoading(true);
      
      // Thay đổi từ .post('/complete') thành .put('/status') truyền kèm Request Param
      await axiosInstance.put(`/orders/${orderId}/status?status=DELIVERING`);
      
      Alert.alert("Thông báo", "Đã bật lộ trình! Đơn hàng đã chuyển sang trạng thái ĐANG GIAO.");
      
      // Tải lại danh sách, đơn hàng sẽ được giữ lại và nút bấm đổi sang màu xanh lá cây "Xác nhận"
      fetchOrders(); 
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái đi giao.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectOrder = (order: any) => {
    setSelectedOrders((prevSelected) => {
      const isExist = prevSelected.some(item => item.id === order.id);
      if (isExist) {
        return prevSelected.filter(item => item.id !== order.id);
      } else {
        if (prevSelected.length >= 3) {
          Alert.alert("Thông báo", "Bạn chỉ nên gom tối đa 3 đơn hàng cùng lúc.");
          return prevSelected;
        }
        return [...prevSelected, order];
      }
    });
  };

  const calculateOptimizedRoute = async () => {
    if (!driverLocation || selectedOrders.length === 0) {
      setRouteCoords([]);
      return;
    }
    let coordinateString = `${driverLocation.longitude},${driverLocation.latitude}`;
    selectedOrders.forEach(order => {
      coordinateString += `;${order.longitude},${order.latitude}`;
    });
    try {
      const url = `https://router.project-osrm.org/trip/v1/driving/${coordinateString}?overview=full&geometries=geojson&source=first&destination=any&roundtrip=false`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.trips && json.trips.length > 0) {
        const points = json.trips[0].geometry.coordinates.map((coord: any) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoords(points);
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
          animated: true,
        });
      }
    } catch (error) {
      console.log("Lỗi tính toán lộ trình OSRM:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {driverLocation ? (
          <MapView ref={mapRef} style={styles.map} initialRegion={driverLocation} showsUserLocation={true}>
            <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
            {orders.map((order) => {
              const isSelected = selectedOrders.some(item => item.id === order.id);
              return (
                <Marker key={order.id} coordinate={{ latitude: order.latitude, longitude: order.longitude }} onPress={() => handleToggleSelectOrder(order)} title={order.orderCode}>
                  <View style={[styles.marker, isSelected && styles.activeMarker]}>
                    <Text>{isSelected ? '🎯' : '📦'}</Text>
                  </View>
                </Marker>
              );
            })}
            {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#007AFF" />}
          </MapView>
        ) : (
          <ActivityIndicator size="large" style={{ flex: 1 }} />
        )}
      </View>

      <View style={styles.listContainer}>
        {/* FIX: Thay đổi thẻ div thành View chuẩn React Native */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lịch trình giao hàng ({orders.length} đơn)</Text>
          <TouchableOpacity onPress={onLogout}><Text style={{color: 'red', fontWeight: 'bold'}}>Thoát</Text></TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#007AFF"]} />}
            
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>🎉</Text>
                <Text style={styles.emptyText}>Tuyệt vời! Bạn đã hoàn thành tất cả lịch trình.</Text>
                <Text style={{ color: '#aaa', fontSize: 11, marginTop: 4 }}>Kéo xuống để cập nhật đơn mới từ Admin</Text>
              </View>
            )}
            
            renderItem={({ item }) => {
              const isSelected = selectedOrders.some(o => o.id === item.id);
              const isAssigned = item.status === 'ASSIGNED';
              return (
                <TouchableOpacity style={[styles.card, isSelected && styles.selectedCard]} onPress={() => handleToggleSelectOrder(item)}>
                  <View style={{flex: 1}}>
                    <Text style={styles.orderCode}>{item.orderCode}</Text>
                    <Text style={styles.addr} numberOfLines={1}>📍 {item.deliveryAddress}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center' }}>
                      {/* FIX: Khử bỏ thẻ span Web, chuyển sang Text kèm bọc Style Native */}
                      <Text style={[styles.statusBadge, isAssigned ? styles.badgeAssigned : styles.badgeDelivering]}>
                        {isAssigned ? 'ĐƠN MỚI' : 'ĐANG GIAO'}
                      </Text>
                    </View>
                  </View>

                  {item.status === 'ASSIGNED' ? (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007AFF' }]} onPress={() => handleStartDelivery(item.id)}>
                      <Text style={styles.btnText}>Đi giao</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#34C759' }]} onPress={() => (navigation as any).navigate('DeliveryConfirm', { orderId: item.id })}>
                      <Text style={styles.btnText}>Xác nhận</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { height: height * 0.45 },
  map: { ...StyleSheet.absoluteFillObject },
  marker: { backgroundColor: '#fff', padding: 6, borderRadius: 20, borderWidth: 1, borderColor: '#007AFF' },
  activeMarker: { backgroundColor: '#34C759', borderColor: '#fff' },
  listContainer: { flex: 1, backgroundColor: '#f8f9fa', borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: -20, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  selectedCard: { borderColor: '#007AFF', borderWidth: 1.5 },
  orderCode: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  addr: { color: '#666', fontSize: 12, marginTop: 4 },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginLeft: 10 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, padding: 20 },
  emptyText: { color: '#666', fontWeight: '500', fontSize: 13, textAlign: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 9, fontWeight: 'bold', overflow: 'hidden', borderWidth: 1 },
  badgeAssigned: { backgroundColor: '#E1F0FF', color: '#007AFF', borderColor: '#B3D7FF' },
  badgeDelivering: { backgroundColor: '#FFE6D5', color: '#FF9500', borderColor: '#FFCC00' }
});

export default OrderListScreen;