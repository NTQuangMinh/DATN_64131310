import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { 
  Package, Search, Filter, Eye, MapPin, X, 
  User, Phone, Navigation, Save, Globe, Loader2 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import debounce from 'lodash.debounce';

// --- Cấu hình Leaflet Icon ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16);
  }, [lat, lng, map]);
  return null;
};

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false); // Trạng thái đợi tải PDF
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    latitude: 16.0471,
    longitude: 108.2068
  });

  const fetchOrders = async () => {
    try {
      const res = await axiosInstance.get('/orders');
      setOrders(res.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn`
        );
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Lỗi gợi ý:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  const handleSelectSuggestion = (item: any) => {
    setFormData({
      ...formData,
      deliveryAddress: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        setFormData(prev => ({
          ...prev,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        }));
      },
    });
    return <Marker position={[formData.latitude, formData.longitude]} />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/orders', formData);
      alert("Tạo đơn hàng thành công!");
      setIsModalOpen(false);
      setFormData({ customerName: '', customerPhone: '', deliveryAddress: '', latitude: 16.0471, longitude: 108.2068 });
      fetchOrders();
    } catch (err) {
      alert("Lỗi khi lưu đơn hàng!");
    }
  };

  const handleOpenDetail = (order: any) => {
    setActiveOrder(order);
    setIsDetailModalOpen(true);
  };

  // SỬA FIX LỖI XEM PDF: Gọi API đính kèm Token bảo mật, nhận định dạng file nhị phân (Blob)
  const handleViewPdf = async (orderId: string) => {
    setPdfLoading(true);
    try {
      const response = await axiosInstance.get(`/orders/${orderId}/receipt`, {
        responseType: 'blob' // Bắt buộc cấu hình nhận file dạng nhị phân
      });
      
      // Đóng gói dữ liệu nhị phân thành một đường dẫn ảo tạm thời trên trình duyệt
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(blob);
      
      // Mở file PDF trên một Tab mới an toàn
      window.open(fileURL, '_blank');
    } catch (error) {
      console.error("Lỗi tải PDF:", error);
      alert("Không thể mở tài liệu PDF. Đơn hàng có thể chưa hoàn thành hoặc chưa được ký số!");
    } finally {
      setPdfLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-green-100 text-green-700 border-green-200';
      case 'SUCCESS': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Đơn hàng</h1>
          <p className="text-slate-500 text-sm">Số hóa quy trình tiếp nhận và điều phối</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg"
        >
          <Package size={20} />
          Tạo đơn hàng mới
        </button>
      </div>

      {/* Bảng danh sách */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
              <th className="p-4">Mã đơn</th>
              <th className="p-4">Khách hàng</th>
              <th className="p-4">Địa chỉ & GPS</th>
              <th className="p-4 text-center">Trạng thái</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic">Đang tải dữ liệu...</td></tr>
            ) : orders.map((order: any) => (
              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-blue-600">{order.orderCode}</td>
                <td className="p-4">
                  <div className="font-bold text-slate-700">{order.customerName}</div>
                  <div className="text-xs text-slate-400">{order.customerPhone}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-slate-600 truncate max-w-[200px]">{order.deliveryAddress}</div>
                  <div className="text-[10px] text-blue-500 font-mono mt-1">
                    GPS: {order.latitude?.toFixed(4)}, {order.longitude?.toFixed(4)}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => handleOpenDetail(order)} 
                    className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition"
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL TẠO MỚI ĐƠN HÀNG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden h-[85vh]">
            <div className="w-full md:w-2/5 p-8 space-y-5 overflow-y-auto border-r">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Tiếp nhận đơn mới</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Tên khách hàng</label>
                    <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" 
                      value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})}/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Điện thoại</label>
                    <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" 
                      value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})}/>
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-slate-400 uppercase flex justify-between">
                    Địa chỉ giao hàng
                    {isSearching && <Loader2 size={14} className="animate-spin text-blue-500"/>}
                  </label>
                  <textarea 
                    required rows={2} placeholder="Gõ địa chỉ để tìm kiếm..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    value={formData.deliveryAddress}
                    onChange={e => {
                      setFormData({...formData, deliveryAddress: e.target.value});
                      fetchSuggestions(e.target.value);
                    }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-[2100] w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                      {suggestions.map((item, index) => (
                        <div key={index} onClick={() => handleSelectSuggestion(item)} className="p-3 text-xs hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex items-start gap-2">
                          <MapPin size={14} className="text-blue-500 mt-0.5"/>
                          <span className="text-slate-700">{item.display_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl text-white">
                  <div className="flex justify-between font-mono text-[10px] text-slate-400 mb-2">
                    <span>LAT: {formData.latitude.toFixed(6)}</span>
                    <span>LNG: {formData.longitude.toFixed(6)}</span>
                  </div>
                  <p className="text-[10px] text-blue-400 italic">Chọn địa chỉ gợi ý hoặc click bản đồ để lấy GPS chính xác.</p>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition">Hủy</button>
                  <button type="submit" onClick={handleSubmit} className="flex-[2] bg-blue-600 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg">
                    <Save size={18}/> Lưu đơn hàng
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden md:block w-3/5 bg-slate-100 relative">
              <MapContainer center={[formData.latitude, formData.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker />
                <RecenterMap lat={formData.latitude} lng={formData.longitude} />
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT ĐƠN HÀNG VÀ CHỨNG TỪ PDF */}
      {isDetailModalOpen && activeOrder && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 relative overflow-y-auto max-h-[85vh] space-y-6">
            
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div>
              <h2 className="text-xl font-bold text-slate-800">Chi tiết đơn hàng {activeOrder.orderCode}</h2>
              <p className="text-slate-400 text-[10px] font-mono mt-0.5">Mã định danh hệ thống (UUID): {activeOrder.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Khách hàng</span>
                <span className="font-bold text-slate-700">{activeOrder.customerName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Số điện thoại</span>
                <span className="text-slate-600 font-medium">{activeOrder.customerPhone}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-400 font-bold uppercase block">Địa chỉ giao hàng</span>
                <span className="text-slate-600 text-xs">{activeOrder.deliveryAddress}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Trạng thái đơn</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(activeOrder.status)}`}>
                  {activeOrder.status}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Vị trí GPS tọa độ</span>
                <span className="text-blue-500 font-mono text-xs block mt-1">
                  {activeOrder.latitude?.toFixed(6)}, {activeOrder.longitude?.toFixed(6)}
                </span>
              </div>
            </div>

            {/* Khối hiển thị ảnh minh chứng */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase block">Ảnh minh chứng (Tài xế chụp tại điểm giao)</span>
              
              {/* SỬA FIX LỖI XEM ẢNH: Kiểm tra chuỗi hợp lệ, tự động nạp tiền tố data:image nếu thiếu */}
              {activeOrder.evidenceImage && activeOrder.evidenceImage.startsWith('data:image') ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex justify-center items-center p-2 shadow-inner">
                  <img
                    src={activeOrder.evidenceImage}
                    alt="Ảnh bằng chứng giao hàng thành công"
                    className="max-h-60 rounded-xl object-contain"
                  />
                </div>
              ) : activeOrder.evidenceImage && activeOrder.evidenceImage.length > 100 ? (
                // Nếu DB trả về chuỗi mã hóa Base64 thô không có tiền tố header
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex justify-center items-center p-2 shadow-inner">
                  <img
                    src={`data:image/jpeg;base64,${activeOrder.evidenceImage}`}
                    alt="Ảnh bằng chứng giao hàng thành công"
                    className="max-h-60 rounded-xl object-contain"
                  />
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs italic">
                  Chưa có hình ảnh bằng chứng (Đơn hàng chưa hoàn thành hoặc sai định dạng ảnh).
                </div>
              )}
            </div>

            {/* Nút xem trực tiếp file PDF có xác thực Token thông qua hàm xử lý */}
            {activeOrder.status === 'DELIVERED' && (
              <div className="pt-2">
                <button
                  onClick={() => handleViewPdf(activeOrder.id)}
                  disabled={pdfLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg text-center text-sm"
                >
                  {pdfLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Eye size={18} />
                  )}
                  Xem Biên Bản Ký Số Điện Tử (PDF)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;