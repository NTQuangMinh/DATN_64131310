import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance'; // Cập nhật đúng đường dẫn của bạn
import { 
  Package, Eye, MapPin, X, Save, Loader2, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import debounce from 'lodash.debounce';

// --- Cấu hình Leaflet Icon ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
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
  
  // States cho Modal Thêm mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // LỚP KHIÊN VALIDATION: State chứa lỗi
  const [errors, setErrors] = useState<{ customerName?: string; customerPhone?: string; deliveryAddress?: string; form?: string }>({});

  // States cho Modal Chi tiết
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  // States cho Form & Map
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    latitude: 12.2451, 
    longitude: 109.1951
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
    if (errors.deliveryAddress) setErrors({ ...errors, deliveryAddress: '' });
  };

  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        setFormData(prev => ({ ...prev, latitude: e.latlng.lat, longitude: e.latlng.lng }));
      },
    });
    return <Marker position={[formData.latitude, formData.longitude]} />;
  };

  // --- HÀM KIỂM TRA LỖI (VALIDATION FRONTEND) ---
  const validateForm = () => {
    let newErrors: any = {};
    let isValid = true;

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Tên khách hàng không được để trống';
      isValid = false;
    }

    const phoneRegex = /^(0|\+84)\d{9,10}$/; // Check đầu 0 hoặc +84, tổng 10-11 số
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Số điện thoại không được để trống';
      isValid = false;
    } else if (!phoneRegex.test(formData.customerPhone.trim())) {
      newErrors.customerPhone = 'Số điện thoại không hợp lệ (Phải từ 10-11 số)';
      isValid = false;
    }

    if (!formData.deliveryAddress.trim()) {
      newErrors.deliveryAddress = 'Địa chỉ giao hàng không được để trống';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // CHẶN NGAY TẠI ĐÂY NẾU FRONTEND BÁO LỖI
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await axiosInstance.post('/orders', formData);
      setSuccessMsg("Tạo đơn hàng thành công!");
      fetchOrders();
      
      // Đợi 1.5s để hiện thông báo thành công rồi mới đóng Modal
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
        setFormData({ customerName: '', customerPhone: '', deliveryAddress: '', latitude: 16.0471, longitude: 108.2068 });
      }, 1500);

    } catch (err: any) {
      // Hứng lỗi từ Backend (Lớp khiên 2)
      if (err.response?.data?.error) {
        setErrors({ form: err.response.data.error });
      } else if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setErrors({ form: "Lỗi kết nối máy chủ khi lưu đơn hàng!" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = (order: any) => {
    setActiveOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleViewPdf = async (orderId: string) => {
    setPdfLoading(true);
    try {
      const response = await axiosInstance.get(`/orders/${orderId}/receipt`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(blob);
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
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'SUCCESS': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CANCELED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Quản lý Đơn hàng</h1>
          <p className="text-slate-500 text-sm mt-1">Số hóa quy trình tiếp nhận và điều phối giao hàng</p>
        </div>
        <button 
          onClick={() => {
            setIsModalOpen(true);
            setErrors({});
            setSuccessMsg('');
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95"
        >
          <Package size={20} />
          Tạo đơn hàng mới
        </button>
      </div>

      {/* Bảng danh sách */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-xs uppercase font-black tracking-wider">
                <th className="p-5">Mã đơn</th>
                <th className="p-5">Khách hàng</th>
                <th className="p-5">Địa chỉ & GPS</th>
                <th className="p-5 text-center">Trạng thái</th>
                <th className="p-5 text-right">Thao tác</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {loading ? (
                <tr>
                    <td colSpan={5} className="p-20 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <p className="font-medium">Đang tải danh sách đơn hàng...</p>
                        </div>
                    </td>
                </tr>
                ) : orders.length === 0 ? (
                <tr>
                    <td colSpan={5} className="p-20 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Package size={48} className="text-slate-200" />
                            <p className="font-medium">Hệ thống chưa có đơn hàng nào.</p>
                        </div>
                    </td>
                </tr>
                ) : orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-5 font-black text-slate-700">{order.orderCode}</td>
                    <td className="p-5">
                    <div className="font-bold text-slate-800">{order.customerName}</div>
                    <div className="text-xs font-medium text-slate-400 mt-0.5">{order.customerPhone}</div>
                    </td>
                    <td className="p-5 max-w-xs">
                    <div className="text-sm font-medium text-slate-600 truncate">{order.deliveryAddress}</div>
                    <div className="text-[10px] text-blue-500 font-mono mt-1 font-bold bg-blue-50 inline-block px-2 py-0.5 rounded-md">
                        {order.latitude?.toFixed(4)}, {order.longitude?.toFixed(4)}
                    </div>
                    </td>
                    <td className="p-5 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black border uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                        {order.status}
                    </span>
                    </td>
                    <td className="p-5 text-right">
                    <button 
                        onClick={() => handleOpenDetail(order)} 
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Xem chi tiết"
                    >
                        <Eye size={18} />
                    </button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* MODAL TẠO MỚI ĐƠN HÀNG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden h-[85vh]">
            
            {/* Cột trái: Form nhập liệu */}
            <div className="w-full md:w-2/5 p-8 flex flex-col h-full border-r border-slate-100">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tiếp nhận đơn mới</h2>
                 <button onClick={() => setIsModalOpen(false)} className="md:hidden p-2 bg-slate-100 rounded-full"><X size={20}/></button>
              </div>

              {/* Thông báo Thành công hoặc Lỗi chung */}
              {successMsg && (
                  <div className="mb-4 bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl text-sm border border-emerald-100 font-bold flex items-center gap-2">
                      <CheckCircle2 size={18} /> {successMsg}
                  </div>
              )}
              {errors.form && (
                  <div className="mb-4 bg-red-50 text-red-600 p-3.5 rounded-2xl text-sm border border-red-100 font-bold flex items-center gap-2">
                      <AlertCircle size={18} /> {errors.form}
                  </div>
              )}

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  {/* Tên khách hàng */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Khách hàng</label>
                    <input 
                      placeholder="Nguyễn Văn A"
                      className={`w-full p-3.5 bg-slate-50 border rounded-2xl outline-none transition-all text-sm font-medium ${errors.customerName ? 'border-red-400 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`} 
                      value={formData.customerName} 
                      onChange={e => { setFormData({...formData, customerName: e.target.value}); if (errors.customerName) setErrors({...errors, customerName: ''}); }}
                    />
                    {errors.customerName && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.customerName}</p>}
                  </div>
                  
                  {/* Số điện thoại */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Điện thoại</label>
                    <input 
                      placeholder="0901234567"
                      className={`w-full p-3.5 bg-slate-50 border rounded-2xl outline-none transition-all text-sm font-medium ${errors.customerPhone ? 'border-red-400 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`} 
                      value={formData.customerPhone} 
                      onChange={e => { setFormData({...formData, customerPhone: e.target.value}); if (errors.customerPhone) setErrors({...errors, customerPhone: ''}); }}
                    />
                    {errors.customerPhone && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.customerPhone}</p>}
                  </div>
                </div>

                {/* Địa chỉ giao hàng */}
                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex justify-between">
                    Địa chỉ giao hàng
                    {isSearching && <Loader2 size={14} className="animate-spin text-blue-500"/>}
                  </label>
                  <textarea 
                    rows={3} placeholder="Gõ địa chỉ để tự động tìm kiếm GPS..."
                    className={`w-full p-3.5 bg-slate-50 border rounded-2xl outline-none transition-all text-sm font-medium resize-none ${errors.deliveryAddress ? 'border-red-400 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`}
                    value={formData.deliveryAddress}
                    onChange={e => {
                      setFormData({...formData, deliveryAddress: e.target.value});
                      if (errors.deliveryAddress) setErrors({...errors, deliveryAddress: ''});
                      fetchSuggestions(e.target.value);
                    }}
                  />
                  {errors.deliveryAddress && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.deliveryAddress}</p>}
                  
                  {/* Khung Gợi ý địa chỉ */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-[2100] w-full bg-white border border-slate-200 rounded-2xl shadow-2xl mt-1 overflow-hidden">
                      {suggestions.map((item, index) => (
                        <div key={index} onClick={() => handleSelectSuggestion(item)} className="p-3.5 text-xs hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex items-start gap-3 transition-colors">
                          <MapPin size={16} className="text-blue-500 mt-0.5 shrink-0"/>
                          <span className="text-slate-700 font-medium leading-relaxed">{item.display_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hiển thị Tọa độ */}
                <div className="p-5 bg-slate-900 rounded-2xl text-white shadow-inner">
                  <div className="flex justify-between font-mono text-[11px] font-bold text-slate-300 mb-2">
                    <span>LAT: <span className="text-white">{formData.latitude.toFixed(6)}</span></span>
                    <span>LNG: <span className="text-white">{formData.longitude.toFixed(6)}</span></span>
                  </div>
                  <p className="text-[10px] text-blue-400 italic">Tọa độ GPS sẽ tự động cập nhật khi bạn chọn địa chỉ gợi ý hoặc click trực tiếp trên bản đồ.</p>
                </div>
              </form>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-2xl transition">Hủy bỏ</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !!successMsg}
                  className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:bg-blue-400"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>} 
                  {isSubmitting ? 'Đang lưu...' : successMsg ? 'Thành công!' : 'Lưu đơn hàng'}
                </button>
              </div>
            </div>

            {/* Cột phải: Bản đồ */}
            <div className="hidden md:block w-3/5 bg-slate-100 relative">
              <MapContainer center={[formData.latitude, formData.longitude]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker />
                <RecenterMap lat={formData.latitude} lng={formData.longitude} />
              </MapContainer>
              <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm border border-white/20">
                 Kéo thả hoặc click bản đồ để ghim vị trí giao hàng
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT ĐƠN HÀNG */}
      {isDetailModalOpen && activeOrder && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-8 relative overflow-y-auto max-h-[85vh] space-y-8 custom-scrollbar">
            
            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-6 right-6 p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition">
              <X size={20} />
            </button>

            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Chi tiết đơn hàng {activeOrder.orderCode}</h2>
              <p className="text-slate-400 text-[10px] font-mono mt-1">UUID: {activeOrder.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm border-y border-slate-100 py-6">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Khách hàng</span>
                <span className="font-black text-slate-800 text-base">{activeOrder.customerName}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Số điện thoại</span>
                <span className="text-slate-700 font-bold text-base">{activeOrder.customerPhone}</span>
              </div>
              <div className="col-span-2 bg-slate-50 p-4 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Địa chỉ giao hàng</span>
                <span className="text-slate-700 font-medium leading-relaxed">{activeOrder.deliveryAddress}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-2">Trạng thái</span>
                <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border ${getStatusStyle(activeOrder.status)}`}>
                  {activeOrder.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-2">Vị trí định vị (GPS)</span>
                <span className="bg-blue-50 text-blue-600 font-mono text-xs font-bold px-3 py-1.5 rounded-lg inline-block border border-blue-100">
                  {activeOrder.latitude?.toFixed(5)}, {activeOrder.longitude?.toFixed(5)}
                </span>
              </div>
            </div>

            {/* Khối hiển thị ảnh minh chứng */}
            <div className="space-y-3">
              <span className="text-sm text-slate-800 font-black block">Ảnh minh chứng giao hàng</span>
              
              {activeOrder.evidenceImage && activeOrder.evidenceImage.startsWith('data:image') ? (
                <div className="border-2 border-slate-100 rounded-3xl overflow-hidden bg-slate-50 flex justify-center items-center p-2">
                  <img src={activeOrder.evidenceImage} alt="Bằng chứng" className="max-h-64 rounded-2xl object-contain shadow-sm" />
                </div>
              ) : activeOrder.evidenceImage && activeOrder.evidenceImage.length > 100 ? (
                <div className="border-2 border-slate-100 rounded-3xl overflow-hidden bg-slate-50 flex justify-center items-center p-2">
                  <img src={`data:image/jpeg;base64,${activeOrder.evidenceImage}`} alt="Bằng chứng" className="max-h-64 rounded-2xl object-contain shadow-sm" />
                </div>
              ) : (
                <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center flex flex-col items-center justify-center gap-3">
                    <Package className="text-slate-300" size={32} />
                    <p className="text-slate-400 text-sm font-medium">Đơn hàng chưa hoàn thành nên chưa có ảnh chụp</p>
                </div>
              )}
            </div>

            {/* Nút xem PDF Ký số */}
            {activeOrder.status === 'DELIVERED' && (
              <div className="pt-2">
                <button
                  onClick={() => handleViewPdf(activeOrder.id)}
                  disabled={pdfLoading}
                  className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition shadow-xl shadow-slate-200 active:scale-95"
                >
                  {pdfLoading ? <Loader2 size={20} className="animate-spin" /> : <Eye size={20} />}
                  Xem Biên Bản Ký Số (PDF)
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