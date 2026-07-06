import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { 
  CheckCircle2, AlertCircle, 
  Loader2, User, Check, Route as RouteIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DriverIcon = L.divIcon({
    className: 'custom-driver-icon',
    html: `
        <div style="background-color: #2563eb; border: 2px solid white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 16px;">
            🚚
        </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const OrderIcon = L.divIcon({
    className: 'custom-order-icon',
    html: `
        <div style="background-color: #f59e0b; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-size: 12px;">
            📦
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const CustomPolyline = ({ waypoints }: { waypoints: L.LatLng[] }) => {
    const map = useMap();
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

    useEffect(() => {
        if (waypoints.length < 2) {
            setRouteCoords([]);
            return;
        }

        const fetchRoute = async () => {
            const coordinateString = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
            try {
                const url = `https://router.project-osrm.org/trip/v1/driving/${coordinateString}?overview=full&geometries=geojson&source=first&destination=any`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.trips && data.trips.length > 0) {
                    const coords = data.trips[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
                    setRouteCoords(coords);
                    map.fitBounds(L.polyline(coords).getBounds(), { padding: [50, 50] });
                }
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu OSRM:", error);
            }
        };

        fetchRoute();
    }, [waypoints, map]);

    if (routeCoords.length === 0) return null;

    return <Polyline positions={routeCoords} color="#3b82f6" weight={6} opacity={0.8} />;
};

const RouteCreate = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');


  const fetchDrivers = async () => {
    try {
      const driversRes = await axiosInstance.get('/users?size=100');
      setDrivers(driversRes.data.content || driversRes.data);
    } catch (error) {
      console.error("Lỗi lấy vị trí tài xế", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const ordersRes = await axiosInstance.get('/orders');
      setOrders(ordersRes.data.filter((o: any) => o.status === 'PENDING'));
    } catch (error) {
      console.error("Lỗi tải đơn hàng", error);
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([fetchOrders(), fetchDrivers()]);
      } catch (err) {
        console.error("Lỗi tải dữ liệu", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    const interval = setInterval(fetchDrivers, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleOrder = (id: string) => {
    setErrorMsg(''); 
    
    setSelectedOrderIds(prev => {
      const isAdding = !prev.includes(id);
      const newSelected = isAdding ? [...prev, id] : prev.filter(item => item !== id);

      if (isAdding && newSelected.length === 1 && !selectedDriver) {
        const order = orders.find(o => o.id === id);
        if (order && order.latitude && order.longitude) {
          let minDistance = Infinity;
          let closestDriverId = '';

          drivers.forEach(d => {
            if (d.latitude && d.longitude) {
              const dist = calculateDistance(order.latitude, order.longitude, d.latitude, d.longitude);
              if (dist < minDistance) {
                minDistance = dist;
                closestDriverId = d.id;
              }
            }
          });

          if (closestDriverId) {
            setSelectedDriver(closestDriverId);
            setSuccessMsg(`Đã tự động chọn tài xế gần nhất (Cách ${minDistance.toFixed(1)} km)`);
            setTimeout(() => setSuccessMsg(''), 3000);
          }
        }
      }

      if (newSelected.length === 0) {
        setSelectedDriver('');
      }

      return newSelected;
    });
  };

  const getWaypoints = () => {
    const points: L.LatLng[] = [];
    
    if (selectedDriver) {
        const driver = drivers.find(d => d.id === selectedDriver);
        if (driver && driver.latitude && driver.longitude) {
            points.push(L.latLng(driver.latitude, driver.longitude));
        }
    }

    selectedOrderIds.forEach(id => {
        const order = orders.find(o => o.id === id);
        if (order && order.latitude && order.longitude) {
            points.push(L.latLng(order.latitude, order.longitude));
        }
    });

    return points;
  };

  const handleCreate = async () => {
    setErrorMsg('');
    if (!selectedDriver) {
      setErrorMsg("Vui lòng phân công cho một tài xế!");
      return;
    }
    if (selectedOrderIds.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất 1 đơn hàng để lập tuyến!");
      return;
    }

    setIsSubmitting(true);
    try {
      await axiosInstance.post('/routes', {
        driverId: selectedDriver,
        orderIds: selectedOrderIds
      });
      
      setSuccessMsg("Lập tuyến và giao việc thành công!");
      
      // 🌟 Thay đổi logic: Không chuyển trang, reset form và load lại đơn hàng
      setSelectedDriver('');
      setSelectedOrderIds([]);
      await fetchOrders(); // Lấy lại danh sách đơn hàng (các đơn vừa giao sẽ biến mất khỏi mục PENDING)
      
      setTimeout(() => {
        setSuccessMsg(''); // Ẩn thông báo thành công sau 2 giây
      }, 2000);

    } catch (err) {
      setErrorMsg("Có lỗi xảy ra khi giao việc. Vui lòng thử lại!");
    } finally {
        setIsSubmitting(false);
    }
  };

  const sortedDrivers = [...drivers].sort((a, b) => {
    if (selectedOrderIds.length === 0) return 0;
    const refOrder = orders.find(o => o.id === selectedOrderIds[0]);
    if (!refOrder || !refOrder.latitude || !refOrder.longitude) return 0;

    const distA = (a.latitude && a.longitude) ? calculateDistance(refOrder.latitude, refOrder.longitude, a.latitude, a.longitude) : Infinity;
    const distB = (b.latitude && b.longitude) ? calculateDistance(refOrder.latitude, refOrder.longitude, b.latitude, b.longitude) : Infinity;
    
    return distA - distB;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-slate-400 gap-3">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="font-bold tracking-widest uppercase text-sm">Đang nạp dữ liệu điều phối và định vị...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
          <RouteIcon size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Điều phối & Lập tuyến thông minh</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Hỗ trợ tự động theo dõi và gợi ý tài xế gần bưu kiện nhất</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
            <AlertCircle size={20} /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm border border-emerald-100 font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 size={20} /> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
        
        {/* CỘT TRÁI: ĐIỀU KHIỂN & CHỌN ĐƠN */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-6 overflow-hidden">
          
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-5 shrink-0">
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5"><User size={14}/> 1. Chọn tài xế nhận chuyến</span>
              </label>
              <select 
                className={`w-full p-3.5 bg-slate-50 border rounded-2xl outline-none font-bold text-sm transition-all cursor-pointer ${!selectedDriver && errorMsg ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-700'}`}
                value={selectedDriver}
                onChange={(e) => { setSelectedDriver(e.target.value); setErrorMsg(''); }}
              >
                <option value="">-- Click chọn đơn để hệ thống gợi ý tài xế --</option>
                {sortedDrivers.map((d: any) => {
                  let distanceText = "";
                  if (selectedOrderIds.length > 0) {
                    const refOrder = orders.find(o => o.id === selectedOrderIds[0]);
                    if (refOrder && d.latitude && d.longitude) {
                      const dist = calculateDistance(refOrder.latitude, refOrder.longitude, d.latitude, d.longitude);
                      distanceText = ` - Cách ${dist.toFixed(1)} km`;
                    }
                  }

                  return (
                    <option key={d.id} value={d.id}>
                      {d.fullName} (@{d.username}){distanceText}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 block">
                2. Thứ tự giao hàng ({selectedOrderIds.length})
              </label>
              <div className="space-y-2 max-h-[25vh] overflow-y-auto custom-scrollbar pr-2">
                {selectedOrderIds.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs font-medium">
                    Chưa có đơn hàng nào được chọn vào tuyến.
                  </div>
                ) : (
                  selectedOrderIds.map((id, index) => {
                    const order = orders.find(o => o.id === id);
                    return (
                      <div key={id} className="flex items-center gap-3 bg-blue-50 p-3 rounded-2xl border border-blue-100">
                        <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                           <p className="text-sm font-black text-blue-900 truncate">{order?.orderCode}</p>
                           <p className="text-[10px] text-blue-600 truncate">{order?.deliveryAddress}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button 
              onClick={handleCreate}
              disabled={isSubmitting || !!successMsg}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:bg-slate-400"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20}/>}
              {isSubmitting ? 'Đang giao việc...' : successMsg ? 'Thành công!' : 'Xác nhận & Giao việc'}
            </button>
          </div>

          <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[200px]">
            <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <span className="font-black text-slate-700 text-sm">Kho đơn hàng chờ giao</span>
                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded-md font-bold">{orders.length} ĐƠN</span>
            </div>
            <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
              {orders.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium italic">
                    Không có đơn hàng nào chờ xử lý.
                </div>
              ) : (
                orders.map((order: any) => (
                  <div 
                    key={order.id}
                    onClick={() => toggleOrder(order.id)}
                    className={`p-3 mb-2 rounded-2xl cursor-pointer transition-all flex items-center gap-3 border ${selectedOrderIds.includes(order.id) ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${selectedOrderIds.includes(order.id) ? 'bg-amber-500 text-white border-none' : 'border-2 border-slate-300'}`}>
                      {selectedOrderIds.includes(order.id) && <Check size={14} strokeWidth={4} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-sm tracking-tight">{order.orderCode}</p>
                      <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">{order.deliveryAddress}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: BẢN ĐỒ HIỂN THỊ CẢ TÀI XẾ LẪN ĐƠN HÀNG */}
        <div className="col-span-1 lg:col-span-8 bg-slate-100 rounded-[2.5rem] shadow-inner border-4 border-white overflow-hidden relative">
          <MapContainer center={[12.2451, 109.1951]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* 🌟 VẼ MARKER ĐƠN HÀNG (Icon Cam) */}
            {orders.map((order: any) => (
              <Marker key={order.id} position={[order.latitude, order.longitude]} icon={OrderIcon}>
                <Popup className="rounded-xl">
                  <div className="text-xs p-1">
                    <p className="font-black text-amber-600 text-sm mb-1">{order.orderCode}</p>
                    <p className="font-bold text-slate-700">{order.customerName}</p>
                    <p className="text-slate-500 mt-1">{order.deliveryAddress}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 🌟 VẼ MARKER TÀI XẾ (Icon Xanh) */}
            {drivers.map((d: any) => (
                d.latitude && d.longitude && (
                    <Marker key={`driver-${d.id}`} position={[d.latitude, d.longitude]} icon={DriverIcon}>
                        <Popup>
                            <div className="text-xs font-bold text-center">
                                <p className="text-blue-600 mb-1">Tài xế: {d.fullName}</p>
                                <p className="text-slate-500 font-normal">Sẵn sàng nhận chuyến</p>
                            </div>
                        </Popup>
                    </Marker>
                )
            ))}

            <CustomPolyline waypoints={getWaypoints()} />
          </MapContainer>
          
          <div className="absolute top-6 right-6 z-[1000] bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl border border-white/50 flex flex-col gap-2">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Chú giải bản đồ</span>
             <span className="flex items-center gap-2 text-xs font-bold text-slate-700">📍 <span className="text-blue-600">Tài xế đang online</span></span>
             <span className="flex items-center gap-2 text-xs font-bold text-slate-700">📦 <span className="text-amber-500">Đơn hàng chờ giao</span></span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RouteCreate;