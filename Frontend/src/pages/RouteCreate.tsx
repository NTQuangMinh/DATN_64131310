import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance'; // Cập nhật đúng đường dẫn
import { 
  CheckCircle2, AlertCircle, 
  Loader2, User, Check, Route as RouteIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import L from 'leaflet';
import 'leaflet-routing-machine';

// --- Cấu hình Icon cho Marker ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- COMPONENT VẼ ĐƯỜNG ĐI (ROUTING) ---
const RoutingControl = ({ waypoints }: { waypoints: L.LatLng[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    const routingControl = (L as any).Routing.control({
      waypoints: waypoints,
      lineOptions: {
        styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }] // Màu xanh đậm, nét dày
      },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true, 
      show: false, 
      createMarker: () => null, 
    }).addTo(map);

    return () => {
      if (map && routingControl) map.removeControl(routingControl);
    };
  }, [map, waypoints]);

  return null;
};

const RouteCreate = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // LỚP KHIÊN VALIDATION
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersRes, driversRes] = await Promise.all([
          axiosInstance.get('/orders'),
          axiosInstance.get('/users/drivers')
        ]);
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
    setErrorMsg(''); // Xóa lỗi khi người dùng thao tác lại
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

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
    setErrorMsg('');
    
    // VALIDATE
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
      
      // Chuyển hướng mượt mà sau 1.5s
      setTimeout(() => {
        window.location.href = '/dashboard'; // Chuyển về Dashboard hoặc trang Danh sách đơn
      }, 1500);

    } catch (err) {
      setErrorMsg("Có lỗi xảy ra khi giao việc. Vui lòng thử lại!");
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-slate-400 gap-3">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="font-bold tracking-widest uppercase text-sm">Đang nạp dữ liệu điều phối...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
          <RouteIcon size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Điều phối & Lập tuyến</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Thiết lập lộ trình di chuyển tối ưu cho tài xế</p>
        </div>
      </div>

      {/* THÔNG BÁO LỖI / THÀNH CÔNG */}
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
          
          {/* Box 1: Cấu hình tuyến */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-5 shrink-0">
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <User size={14}/> 1. Chọn tài xế nhận chuyến
              </label>
              <select 
                className={`w-full p-3.5 bg-slate-50 border rounded-2xl outline-none font-bold text-sm transition-all cursor-pointer ${!selectedDriver && errorMsg ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-700'}`}
                value={selectedDriver}
                onChange={(e) => { setSelectedDriver(e.target.value); setErrorMsg(''); }}
              >
                <option value="">-- Click để chọn tài xế --</option>
                {drivers.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.fullName}</option>
                ))}
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

          {/* Box 2: Danh sách đơn khả dụng */}
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
                    className={`p-3 mb-2 rounded-2xl cursor-pointer transition-all flex items-center gap-3 border ${selectedOrderIds.includes(order.id) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${selectedOrderIds.includes(order.id) ? 'bg-blue-600 text-white' : 'border-2 border-slate-300'}`}>
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

        {/* CỘT PHẢI: BẢN ĐỒ HIỂN THỊ TUYẾN ĐƯỜNG */}
        <div className="col-span-1 lg:col-span-8 bg-slate-100 rounded-[2.5rem] shadow-inner border-4 border-white overflow-hidden relative">
          {/* 🌟 CỐ ĐỊNH TỌA ĐỘ NHA TRANG Ở ĐÂY 🌟 */}
          <MapContainer center={[12.2451, 109.1951]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {orders.map((order: any) => (
              <Marker key={order.id} position={[order.latitude, order.longitude]}>
                <Popup className="rounded-xl">
                  <div className="text-xs p-1">
                    <p className="font-black text-blue-600 text-sm mb-1">{order.orderCode}</p>
                    <p className="font-bold text-slate-700">{order.customerName}</p>
                    <p className="text-slate-500 mt-1">{order.deliveryAddress}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            <RoutingControl waypoints={getWaypoints()} />
          </MapContainer>
          
          <div className="absolute top-6 right-6 z-[1000] bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl border border-white/50 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
             <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Lộ trình AI dự kiến</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RouteCreate;