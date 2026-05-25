import { useEffect, useState, useRef } from 'react';
import axiosInstance from '../api/axiosInstance'; // Nhớ check lại đường dẫn import của bạn
import { 
  Truck, MapPin, CheckCircle, Navigation, 
  Loader2, Package, X, Camera, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// --- FIX ICON LEAFLET ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- THUẬT TOÁN HAVERSINE TÍNH KHOẢNG CÁCH (MÉT) ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Bán kính trái đất (mét)
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Trả về số mét
};

// --- COMPONENT DẪN ĐƯỜNG REAL-TIME ---
const RoutingMachine = ({ userPos, targetPos }: { userPos: [number, number], targetPos: [number, number] }) => {
  const map = useMap();
  const routingControlRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !userPos || !targetPos) return;

    routingControlRef.current = (L as any).Routing.control({
      waypoints: [ L.latLng(userPos[0], userPos[1]), L.latLng(targetPos[0], targetPos[1]) ],
      lineOptions: { styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }], extendToWaypoints: true, missingRouteTolerance: 10 },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false, 
      createMarker: () => null
    }).addTo(map);

    return () => {
      if (routingControlRef.current && map) map.removeControl(routingControlRef.current);
    };
  }, [map, userPos, targetPos]);

  return null;
};

const DriverTasks = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  
  // State Bản đồ & Nghiệp vụ
  const [showMap, setShowMap] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  
  // LỚP KHIÊN VALIDATION: Trạng thái lỗi và ảnh minh chứng
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // Giả lập chụp ảnh

  const fetchTasks = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      
      const res = await axiosInstance.get(`/orders/my-tasks?driverId=${user.id}`);
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
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setDriverPos([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error("Lỗi GPS:", err),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Hàm giả lập mở Camera chụp ảnh
  const handleCaptureImage = () => {
    // Trong thực tế sẽ dùng input type="file" capture="environment"
    setCapturedImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="); // Ảnh Base64 giả lập
    setErrorMsg(null);
  };

  const handleComplete = async (task: any) => {
    setErrorMsg(null);

    // 1. VALIDATE BẬT GPS
    if (!driverPos) {
      setErrorMsg("Đang tìm tín hiệu GPS. Vui lòng bật định vị!");
      return;
    }

    // 2. VALIDATE KHOẢNG CÁCH (VẪN TÍNH NHƯNG TẠM TẮT CHẶN ĐỂ DEMO)
    const distance = calculateDistance(driverPos[0], driverPos[1], task.latitude, task.longitude);
    
    // --- BẮT ĐẦU ĐOẠN COMMENT ĐỂ DEMO ---
    /* if (distance > 500) {
      setErrorMsg(`Bạn đang cách điểm giao ${Math.round(distance)}m. Phải đến gần (<500m) mới được hoàn tất!`);
      return;
    }
    */
    // --- KẾT THÚC ĐOẠN COMMENT ---
    
    console.log(`[DEMO MODE] Khoảng cách thực tế tới khách hàng: ${Math.round(distance)} mét`);

    // 3. VALIDATE ẢNH MINH CHỨNG (Vẫn giữ để demo luồng chụp ảnh cho đẹp)
    if (!capturedImage) {
      setErrorMsg("Bắt buộc phải chụp ảnh minh chứng trước khi hoàn tất!");
      return;
    }

    setSubmitting(task.id);
    
    try {
      await axiosInstance.post(`/orders/${task.id}/complete`, {
        actualLatitude: driverPos[0],
        actualLongitude: driverPos[1],
        status: 'DELIVERED',
        evidenceImage: capturedImage
      });
      
      setShowMap(false);
      setCapturedImage(null); // Reset ảnh
      fetchTasks();
    } catch (err) {
      setErrorMsg("Lỗi cập nhật hệ thống. Vui lòng thử lại.");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen bg-slate-50">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
      <p className="text-slate-500 font-black text-sm uppercase tracking-widest animate-pulse">Đang tải lộ trình...</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-4 pb-24 bg-slate-50 min-h-screen font-sans">
      <header className="flex items-center justify-between mb-8 pt-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
            <Truck size={24} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Nhiệm vụ</h1>
        </div>
        <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-xs font-black text-blue-600 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          {tasks.filter(t => t.status === 'ASSIGNED').length} ĐƠN CHỜ
        </div>
      </header>

      {/* DANH SÁCH THẺ ĐƠN HÀNG */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="text-slate-300" size={40} />
            </div>
            <p className="text-slate-500 font-bold">Hôm nay bạn không có đơn hàng!</p>
          </div>
        ) : (
          tasks.map((task, index) => (
            <div key={task.id} className={`bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 transition-all ${task.status === 'DELIVERED' ? 'opacity-50 grayscale' : 'hover:shadow-md'}`}>
              <div className="flex justify-between items-center mb-4">
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg">#{task.orderCode}</span>
                <span className="text-blue-600 font-black text-[10px] uppercase bg-blue-50 px-2 py-1 rounded-md">Điểm dừng {index + 1}</span>
              </div>
              
              <div className="flex gap-4 mb-6">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
                  <MapPin size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-lg truncate">{task.customerName}</p>
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mt-0.5">{task.deliveryAddress}</p>
                </div>
              </div>

              {task.status === 'ASSIGNED' && (
                <button 
                  onClick={() => { setSelectedTask(task); setShowMap(true); setErrorMsg(null); setCapturedImage(null); }}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-blue-600 transition-colors shadow-md active:scale-[0.98]"
                >
                  <Navigation size={18} /> Mở bản đồ & Giao hàng
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL BẢN ĐỒ TOÀN MÀN HÌNH */}
      {showMap && selectedTask && (
        <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-4 flex items-center justify-between bg-white z-10 shadow-sm">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                  {tasks.findIndex(t => t.id === selectedTask.id) + 1}
               </div>
               <div>
                  <h2 className="font-black text-slate-800 text-sm">Đang dẫn đường</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{selectedTask.customerName}</p>
               </div>
            </div>
            <button onClick={() => setShowMap(false)} className="p-2.5 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"><X size={20}/></button>
          </div>
          
          <div className="flex-1 relative">
            <MapContainer 
              center={driverPos || [selectedTask.latitude, selectedTask.longitude]} 
              zoom={16} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              {driverPos && (
                <Marker position={driverPos} icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div class="relative flex items-center justify-center">
                           <div class="absolute w-10 h-10 bg-blue-500 rounded-full animate-ping opacity-30"></div>
                           <div class="w-5 h-5 bg-blue-600 rounded-full border-[3px] border-white shadow-xl relative z-10"></div>
                         </div>`,
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
                })}>
                  <Popup>Vị trí của bạn</Popup>
                </Marker>
              )}

              <Marker position={[selectedTask.latitude, selectedTask.longitude]}>
                <Popup>Giao cho: {selectedTask.customerName}</Popup>
              </Marker>

              {driverPos && (
                <RoutingMachine userPos={driverPos} targetPos={[selectedTask.latitude, selectedTask.longitude]} />
              )}
            </MapContainer>
            
            {/* TẤM ĐIỀU KHIỂN BÊN DƯỚI */}
            <div className="absolute bottom-6 left-4 right-4 bg-white p-5 rounded-3xl shadow-2xl border border-slate-100 z-[1000] flex flex-col gap-4">
                
                {/* Khu vực thông báo lỗi Validate */}
                {errorMsg && (
                    <div className="bg-red-50 p-3 rounded-xl flex gap-2 items-start text-red-600 text-xs font-medium border border-red-100">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <p>{errorMsg}</p>
                    </div>
                )}

                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Địa chỉ giao</p>
                        <p className="text-sm font-bold text-slate-800 line-clamp-2">{selectedTask.deliveryAddress}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Nút chụp ảnh minh chứng */}
                        <button 
                            onClick={handleCaptureImage}
                            className={`p-4 rounded-2xl transition-all ${capturedImage ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {capturedImage ? <ImageIcon size={24}/> : <Camera size={24}/>}
                        </button>

                        {/* Nút hoàn tất */}
                        <button 
                           disabled={submitting === selectedTask.id}
                           onClick={() => handleComplete(selectedTask)}
                           className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 disabled:bg-blue-400 transition-all flex items-center gap-2"
                        >
                           {submitting === selectedTask.id ? <Loader2 className="animate-spin" size={24}/> : <CheckCircle size={24}/>}
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTasks;