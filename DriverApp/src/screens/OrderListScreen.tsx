import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, Dimensions, ActivityIndicator, RefreshControl,
  Linking, Platform, Modal
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
  
  // HOÀN THIỆN 3: Bộ đôi State quản lý Modal xem chi tiết đơn hàng cho tài xế
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
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
      await axiosInstance.put(`/orders/${orderId}/status?status=DELIVERING`);
      Alert.alert("Thông báo", "Đã bật lộ trình! Đơn hàng đã chuyển sang trạng thái ĐANG GIAO.");
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
          Alert.alert("Thông báo", "Bạn chỉ nên gom tối đa 3 đơn hàng cùng lúc để đảm bảo thời gian.");
          return prevSelected;
        }
        return [...prevSelected, order];
      }
    });
  };

  // Thêm một state mới ở trên cùng component (dưới các state cũ) để lưu thứ tự:
  const [optimalSequence, setOptimalSequence] = useState<any[]>([]);

  // Thay thế hàm cũ bằng hàm này:
  const calculateOptimizedRoute = async () => {
    if (!driverLocation || selectedOrders.length === 0) {
      setRouteCoords([]);
      setOptimalSequence([]);
      return;
    }
    
    // Tọa độ đầu tiên luôn là tài xế (source=first)
    let coordinateString = `${driverLocation.longitude},${driverLocation.latitude}`;
    selectedOrders.forEach(order => {
      coordinateString += `;${order.longitude},${order.latitude}`;
    });
    
    try {
      const url = `https://router.project-osrm.org/trip/v1/driving/${coordinateString}?overview=full&geometries=geojson&source=first&destination=any&roundtrip=false`;
      const resp = await fetch(url);
      const json = await resp.json();
      
      if (json.trips && json.trips.length > 0) {
        // 1. Vẽ đường đi (Polyline)
        const points = json.trips[0].geometry.coordinates.map((coord: any) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoords(points);
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 70, right: 70, bottom: 70, left: 70 }, animated: true,
        });

        // 2. BÓC TÁCH THỨ TỰ GIAO HÀNG (Dựa theo waypoint_index của OSRM)
        // json.waypoints chứa thứ tự di chuyển tối ưu do AI sắp xếp
        if (json.waypoints && json.waypoints.length > 1) {
          const orderWaypoints = json.waypoints.slice(1); // Bỏ điểm index 0 (Tài xế)
          
          const sortedOrders = [...selectedOrders].sort((a, b) => {
            const indexA = orderWaypoints[selectedOrders.indexOf(a)].waypoint_index;
            const indexB = orderWaypoints[selectedOrders.indexOf(b)].waypoint_index;
            return indexA - indexB;
          });
          
          setOptimalSequence(sortedOrders); // Lưu lại danh sách đã sắp xếp 1->2->3
        }
      }
    } catch (error) {
      console.log("Lỗi tính toán lộ trình OSRM:", error);
    }
  };

  const handleMakeCall = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert("Thông báo", "Đơn hàng này thiếu số điện thoại khách hàng.");
      return;
    }
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Lỗi", "Thiết bị không hỗ trợ tính năng gọi điện.");
        }
      })
      .catch((err) => console.log("Lỗi gọi điện:", err));
  };

  // SỬA LỖI 2: Cấu hình daddr buộc Apple Map hiển thị chính xác cờ đích đến lộ trình
  const handleOpenExternalMap = (latitude: number, longitude: number, address: string) => {
    if (!latitude || !longitude) {
      Alert.alert("Thông báo", "Đơn hàng chưa có tọa độ GPS chính xác.");
      return;
    }
    const label = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps://?daddr=${latitude},${longitude}&q=${label}`, 
      android: `geo:0,0?q=${latitude},${longitude}(${label})`
    });

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Lỗi", "Không tìm thấy ứng dụng bản đồ.");
        }
      });
    }
  };

  // Hàm mở Modal xem chi tiết
  const handleOpenDetail = (order: any) => {
    setActiveOrder(order);
    setIsDetailModalOpen(true);
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
              
              // TÌM THỨ TỰ CỦA ĐƠN NÀY TRONG TUYẾN ĐƯỜNG TỐI ƯU
              const routeIndex = optimalSequence.findIndex(o => o.id === item.id);
              const stepNumber = routeIndex !== -1 ? routeIndex + 1 : null;

              return (
                <View style={[styles.card, isSelected && styles.selectedCard]}>
                  
                  {/* === HIỂN THỊ CHỈ DẪN TUYẾN ĐƯỜNG NẾU ĐƯỢC CHỌN === */}
                  {isSelected && stepNumber !== null && (
                    <View style={{ backgroundColor: '#E1F0FF', padding: 6, borderTopLeftRadius: 12, borderTopRightRadius: 12, marginHorizontal: -15, marginTop: -15, marginBottom: 10, borderBottomWidth: 1, borderColor: '#007AFF', alignItems: 'center' }}>
                      <Text style={{ fontWeight: 'bold', color: '#007AFF', fontSize: 12 }}>
                        📍 ĐIỂM GIAO SỐ {stepNumber} TRÊN TUYẾN
                      </Text>
                    </View>
                  )}

                  {/* KHU VỰC THÔNG TIN (Click để chọn gom đơn) */}
                  <TouchableOpacity 
                    style={styles.clickableInfoArea} 
                    onPress={() => handleToggleSelectOrder(item)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.orderCode}>{item.orderCode}</Text>
                    <Text style={styles.addr} numberOfLines={1}>📍 {item.deliveryAddress}</Text>
                    
                    <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center' }}>
                      <Text style={[styles.statusBadge, isAssigned ? styles.badgeAssigned : styles.badgeDelivering]}>
                        {isAssigned ? 'ĐƠN MỚI' : 'ĐANG GIAO'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                

                  {/* Khu vực 2: Hàng nút bấm chức năng tách biệt hoàn toàn nằm phía dưới */}
                  <View style={styles.quickActionsRow}>
                    <TouchableOpacity 
                      onPress={() => handleOpenExternalMap(item.latitude, item.longitude, item.deliveryAddress)} 
                      style={styles.inlineActionBtn}
                    >
                      <Text style={styles.navText}>🧭 Lộ trình</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => handleMakeCall(item.customerPhone)} 
                      style={styles.inlineActionBtn}
                    >
                      <Text style={styles.callActionText}>📞 Gọi điện</Text>
                    </TouchableOpacity>

                    {/* Nút xem chi tiết đơn hàng mới tích hợp */}
                    <TouchableOpacity 
                      onPress={() => handleOpenDetail(item)} 
                      style={styles.inlineActionBtn}
                    >
                      <Text style={styles.detailBtnText}>👁️ Chi tiết</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Khu vực 3: Nút hành động chính (Bên phải Card) */}
                  <View style={styles.mainActionContainer}>
                    {item.status === 'ASSIGNED' ? (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007AFF' }]} onPress={() => handleStartDelivery(item.id)}>
                        <Text style={styles.btnText}>Đi giao</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#34C759' }]} onPress={() => (navigation as any).navigate('DeliveryConfirm', { orderId: item.id })}>
                        <Text style={styles.btnText}>Xác nhận</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* ======================================================================= */}
      {/* HOÀN THIỆN 3: GIAO DIỆN MODAL CHI TIẾT ĐƠN HÀNG DÀNH CHO TÀI XẾ */}
      {/* ======================================================================= */}
      <Modal visible={isDetailModalOpen} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi Tiết Đơn Hàng</Text>
              <TouchableOpacity onPress={() => setIsDetailModalOpen(false)} style={styles.closeBtn}>
                <Text style={{color: '#666', fontWeight: 'bold', fontSize: 16}}>✕</Text>
              </TouchableOpacity>
            </View>

            {activeOrder && (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>MÃ ĐƠN HÀNG:</Text>
                  <Text style={[styles.detailValue, {color: '#007AFF', fontWeight: 'bold'}]}>{activeOrder.orderCode}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>TÊN KHÁCH HÀNG:</Text>
                  <Text style={styles.detailValue}>{activeOrder.customerName || "Chưa cập nhật"}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SỐ ĐIỆN THOẠI:</Text>
                  <Text style={styles.detailValue}>{activeOrder.customerPhone || "Chưa cập nhật"}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ĐỊA CHỈ GIAO HÀNG:</Text>
                  <Text style={[styles.detailValue, {fontSize: 13}]}>{activeOrder.deliveryAddress}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>TRẠNG THÁI HIỆN TẠI:</Text>
                  <Text style={[styles.detailValue, {fontWeight: 'bold', color: activeOrder.status === 'ASSIGNED' ? '#007AFF' : '#FF9500'}]}>
                    {activeOrder.status === 'ASSIGNED' ? 'ĐƠN MỚI GÁN' : 'ĐANG ĐI GIAO'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>TỌA ĐỘ VỊ TRÍ (GPS):</Text>
                  <Text style={[styles.detailValue, {fontFamily: 'monospace', fontSize: 11, color: '#666'}]}>
                    {activeOrder.latitude?.toFixed(6)}, {activeOrder.longitude?.toFixed(6)}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.modalSubmitBtn} 
                  onPress={() => {
                    setIsDetailModalOpen(false);
                    handleMakeCall(activeOrder.customerPhone);
                  }}
                >
                  <Text style={styles.modalSubmitBtnText}>📞 Gọi Điện Cho Khách Hàng</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, position: 'relative', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  selectedCard: { borderColor: '#007AFF', borderWidth: 1.5 },
  clickableInfoArea: { width: '75%', paddingVertical: 2 }, // Khống chế vùng chạm text chiếm 75% chiều rộng bên trái Card
  orderCode: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  addr: { color: '#666', fontSize: 12, marginTop: 4 },
  
  // Tách biệt hàng nút bấm thành vùng riêng, có padding để ngón tay dễ ấn trúng
  quickActionsRow: { flexDirection: 'row', gap: 14, marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f2', paddingTop: 8, width: '75%' },
  inlineActionBtn: { paddingVertical: 4, paddingRight: 4 },
  
  navText: { color: '#007AFF', fontSize: 11, fontWeight: 'bold' },
  callActionText: { color: '#34C759', fontSize: 11, fontWeight: 'bold' },
  detailBtnText: { color: '#5856D6', fontSize: 11, fontWeight: 'bold' },
  
  mainActionContainer: { position: 'absolute', right: 15, top: '30%' }, // Ghim cố định cụm nút hành động chính ở góc phải Card
  actionBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, padding: 20 },
  emptyText: { color: '#666', fontWeight: '500', fontSize: 13, textAlign: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 9, fontWeight: 'bold', overflow: 'hidden', borderWidth: 1 },
  badgeAssigned: { backgroundColor: '#E1F0FF', color: '#007AFF', borderColor: '#B3D7FF' },
  badgeDelivering: { backgroundColor: '#FFE6D5', color: '#FF9500', borderColor: '#FFCC00' },

  // Styles cấu trúc Modal Chi Tiết Đơn Hàng
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 24, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  closeBtn: { padding: 4 },
  modalBody: { marginTop: 15, gap: 14 },
  detailRow: { flexDirection: 'column', gap: 2 },
  detailLabel: { fontSize: 10, fontWeight: 'bold', color: '#aaa', },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  modalSubmitBtn: { backgroundColor: '#34C759', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  modalSubmitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default OrderListScreen;