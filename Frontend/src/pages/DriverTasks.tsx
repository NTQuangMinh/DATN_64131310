import { useEffect, useState, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { 
  Truck, MapPin, CheckCircle, Navigation, 
  Loader2, Package, X, LocateFixed, Camera, ChevronRight 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// --- FIX ICON LEAFLET ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- COMPONENT DẪN ĐƯỜNG REAL-TIME ---
const RoutingMachine = ({ userPos, targetPos }: { userPos: [number, number], targetPos: [number, number] }) => {
  const map = useMap();
  const routingControlRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !userPos || !targetPos) return;

    // Khởi tạo bộ dẫn đường thực tế trên bản đồ
    routingControlRef.current = (L as any).Routing.control({
      waypoints: [
        L.latLng(userPos[0], userPos[1]),
        L.latLng(targetPos[0], targetPos[1])
      ],
      lineOptions: {
        styles: [{ color: '#2563eb', weight: 6, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 10
      },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false, // Ẩn bảng hướng dẫn text để tối ưu màn hình điện thoại
      createMarker: () => null // Không tạo marker phụ của routing
    }).addTo(map);

    return () => {
      if (routingControlRef.current && map) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, userPos, targetPos]);

  return null;
};

const DriverTasks = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  
  // State Bản đồ & Dẫn đường
  const [showMap, setShowMap] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);

  const fetchTasks = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      
      const res = await axiosInstance.get(`/orders/my-tasks?driverId=${user.id}`);
      // Sắp xếp theo thứ tự giao hàng
      const sorted = res.data.sort((a: any, b: any) => (a.deliverySequence || 0) - (b.deliverySequence || 0));
      setTasks(sorted);
    } catch (err) {
      console.error("Lỗi tải nhiệm vụ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // THEO DÕI VỊ TRÍ REAL-TIME (GPS WATCH)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setDriverPos([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.error("Lỗi GPS:", err),
      { enableHighAccuracy: true,}
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleComplete = (orderId: string) => {
    if (!driverPos) {
      alert("Đang xác định vị trí của bạn, vui lòng đợi...");
      return;
    }
    setSubmitting(orderId);
    
    // Gửi yêu cầu hoàn tất kèm tọa độ thực tế lúc bấm nút
    setTimeout(async () => {
        try {
            await axiosInstance.post(`/orders/${orderId}/complete`, {
              actualLatitude: driverPos[0],
              actualLongitude: driverPos[1],
              status: 'DELIVERED',
              evidenceImage: "https://via.placeholder.com/300"
            });
            alert("Giao hàng thành công!");
            setShowMap(false);
            fetchTasks();
          } catch (err) {
            alert("Lỗi cập nhật trạng thái đơn hàng.");
          } finally {
            setSubmitting(null);
          }
    }, 500);
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen bg-slate-50">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
      <p className="text-slate-500 font-black text-sm uppercase tracking-widest">Đang tải lộ trình...</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-4 pb-24 bg-slate-50 min-h-screen font-sans">
      <header className="flex items-center justify-between mb-8 pt-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
            <Truck size={24} />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Nhiệm vụ của tôi</h1>
        </div>
        <div className="bg-white px-3 py-1.5 rounded-full border border-slate-200 text-[10px] font-black text-blue-600">
          {tasks.filter(t => t.status === 'ASSIGNED').length} ĐƠN CHỜ
        </div>
      </header>

      {/* DANH SÁCH THẺ ĐƠN HÀNG */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <Package className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-slate-400 font-bold">Không có đơn hàng nào!</p>
          </div>
        ) : (
          tasks.map((task, index) => (
            <div key={task.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 transition-all ${task.status === 'DELIVERED' ? 'opacity-40 grayscale' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full">#{task.orderCode}</span>
                <span className="text-blue-600 font-black text-[10px] uppercase">Điểm dừng {index + 1}</span>
              </div>
              
              <div className="flex gap-4 mb-6">
                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
                  <MapPin size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-800 text-base truncate">{task.customerName}</p>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{task.deliveryAddress}</p>
                </div>
              </div>

              {task.status === 'ASSIGNED' && (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { setSelectedTask(task); setShowMap(true); }}
                    className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                  >
                    <Navigation size={16} /> Dẫn đường
                  </button>
                  <button 
                    onClick={() => handleComplete(task.id)}
                    className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-100 active:scale-95"
                  >
                    <CheckCircle size={16} /> Hoàn tất
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL DẪN ĐƯỜNG REAL-TIME TOÀN MÀN HÌNH */}
      {showMap && selectedTask && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-4 flex items-center justify-between border-b bg-white z-10 shadow-sm">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                  {tasks.findIndex(t => t.id === selectedTask.id) + 1}
               </div>
               <div>
                  <h2 className="font-black text-slate-800 text-sm">Đang dẫn đường</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedTask.customerName}</p>
               </div>
            </div>
            <button onClick={() => setShowMap(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full"><X/></button>
          </div>
          
          <div className="flex-1 relative">
            <MapContainer 
              center={driverPos || [selectedTask.latitude, selectedTask.longitude]} 
              zoom={16} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              {/* Vị trí Tài xế - Sẽ tự động dịch chuyển khi driverPos thay đổi */}
              {driverPos && (
                <Marker position={driverPos} icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div class="relative flex items-center justify-center">
                           <div class="absolute w-8 h-8 bg-blue-400 rounded-full animate-ping opacity-40"></div>
                           <div class="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-xl relative z-10"></div>
                         </div>`,
                  iconSize: [30, 30],
                  iconAnchor: [15, 15]
                })}>
                  <Popup>Bạn đang ở đây</Popup>
                </Marker>
              )}

              {/* Điểm đích của khách hàng */}
              <Marker position={[selectedTask.latitude, selectedTask.longitude]}>
                <Popup>Điểm giao: {selectedTask.orderCode}</Popup>
              </Marker>

              {/* VẼ ĐƯỜNG ĐI DỰA TRÊN GPS THỰC TẾ */}
              {driverPos && (
                <RoutingMachine userPos={driverPos} targetPos={[selectedTask.latitude, selectedTask.longitude]} />
              )}
            </MapContainer>
            
            {/* Thanh thông tin dưới cùng của bản đồ */}
            <div className="absolute bottom-6 left-4 right-4 bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 z-[1000] flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Địa chỉ giao hàng</p>
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{selectedTask.deliveryAddress}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="bg-slate-100 p-4 rounded-2xl text-slate-500"><Camera size={20}/></button>
                    <button 
                       disabled={submitting === selectedTask.id}
                       onClick={() => handleComplete(selectedTask.id)}
                       className="bg-green-600 text-white p-4 rounded-2xl shadow-lg shadow-green-100 active:scale-90"
                    >
                       {submitting === selectedTask.id ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle size={20}/>}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTasks;