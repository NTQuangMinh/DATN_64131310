import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Truck, CheckCircle2, AlertCircle, MapPin, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import L from 'leaflet';
// Import Routing Machine
import 'leaflet-routing-machine';

// --- Cấu hình Icon cho Marker ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const RoutingControl = ({ waypoints }: { waypoints: L.LatLng[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    // Khởi tạo routing control
    const routingControl = (L as any).Routing.control({
      waypoints: waypoints,
      lineOptions: {
        styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }] // Màu xanh đậm, nét dày
      },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true, // Tự động zoom bản đồ vừa khít đường đi
      show: false, // Ẩn bảng hướng dẫn text
      createMarker: () => null, // Không tạo thêm marker phụ
    }).addTo(map);

    return () => {
      if (map) map.removeControl(routingControl);
    };
  }, [map, waypoints]); // Render lại mỗi khi danh sách đơn hàng thay đổi

  return null;
};

const RouteCreate = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersRes, driversRes] = await Promise.all([
          axiosInstance.get('/orders'),
          axiosInstance.get('/users/drivers')
        ]);
        // Lọc các đơn hàng PENDING để lập tuyến
        setOrders(ordersRes.data.filter((o: any) => o.status === 'PENDING'));
        setDrivers(driversRes.data);
      } catch (err) {
        console.error("Lỗi tải dữ liệu", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Chuyển đổi danh sách ID đã chọn thành danh sách tọa độ để vẽ đường
  const getWaypoints = () => {
    return selectedOrderIds
      .map(id => {
        const order = orders.find(o => o.id === id);
        if (order && order.latitude && order.longitude) {
          return L.latLng(order.latitude, order.longitude);
        }
        return null;
      })
      .filter(p => p !== null) as L.LatLng[];
  };

  const handleCreate = async () => {
    if (!selectedDriver || selectedOrderIds.length === 0) {
      alert("Vui lòng chọn tài xế và ít nhất 1 đơn hàng!");
      return;
    }
    try {
      await axiosInstance.post('/routes', {
        driverId: selectedDriver,
        orderIds: selectedOrderIds
      });
      alert("Lập tuyến và vẽ lộ trình thành công!");
      window.location.href = '/orders';
    } catch (err) {
      alert("Lỗi khi lập tuyến");
    }
  };

  if (loading) return <div className="p-10 text-center">Đang tải dữ liệu điều phối...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-slate-800">Điều phối & Lập tuyến</h1>
        <p className="text-slate-500 text-sm">Thiết lập lộ trình di chuyển tối ưu cho tài xế</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* CỘT TRÁI: DANH SÁCH ĐƠN & CHỌN TÀI XẾ */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Chọn tài xế</label>
              <select 
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
              >
                <option value="">-- Chọn tài xế nhận tuyến --</option>
                {drivers.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Thứ tự giao hàng ({selectedOrderIds.length})</label>
              <div className="mt-2 space-y-2 max-h-[30vh] overflow-y-auto">
                {selectedOrderIds.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có đơn nào được chọn.</p>
                ) : (
                  selectedOrderIds.map((id, index) => {
                    const order = orders.find(o => o.id === id);
                    return (
                      <div key={id} className="flex items-center gap-3 bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-blue-800 truncate">{order?.orderCode}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button 
              onClick={handleCreate}
              disabled={selectedOrderIds.length === 0 || !selectedDriver}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition disabled:opacity-50 shadow-lg"
            >
              Xác nhận & Giao việc
            </button>
          </div>

          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b font-bold text-slate-700 text-sm">Đơn hàng khả dụng</div>
            <div className="overflow-y-auto flex-1 divide-y">
              {orders.map((order: any) => (
                <div 
                  key={order.id}
                  onClick={() => toggleOrder(order.id)}
                  className={`p-4 cursor-pointer transition flex items-center gap-3 ${selectedOrderIds.includes(order.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedOrderIds.includes(order.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                    {selectedOrderIds.includes(order.id) && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm tracking-tight">{order.orderCode}</p>
                    <p className="text-xs text-slate-500 truncate">{order.deliveryAddress}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: BẢN ĐỒ HIỂN THỊ TUYẾN ĐƯỜNG (ROUTING) */}
        <div className="col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
          <MapContainer center={[16.0471, 108.2068]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* Vẽ Marker cho tất cả các đơn hàng khả dụng */}
            {orders.map((order: any) => (
              <Marker key={order.id} position={[order.latitude, order.longitude]}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{order.orderCode}</p>
                    <p>{order.customerName}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Vẽ đường nối các đơn hàng đã chọn */}
            <RoutingControl waypoints={getWaypoints()} />
          </MapContainer>
          
          <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur p-3 rounded-xl shadow-md border border-slate-200">
             <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Navigation size={14} className="text-blue-600 animate-pulse"/>
                Lộ trình giao hàng dự kiến
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteCreate;