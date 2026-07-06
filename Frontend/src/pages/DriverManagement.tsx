import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { 
  Users, Plus, Edit, Trash2, Loader2, Save, X, Search, AlertCircle, CheckCircle2, Eye, Package 
} from 'lucide-react';

const DriverManagement: React.FC = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]); // 🌟 Lưu toàn bộ đơn hàng
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // States cho Modal Thêm/Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  
  // 🌟 States cho Modal Xem Đơn Hàng của Tài Xế
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedDriverForOrders, setSelectedDriverForOrders] = useState<any>(null);
  const [driverOrders, setDriverOrders] = useState<any[]>([]);

  // Validation & Messages
  const [errors, setErrors] = useState<{ username?: string; fullName?: string; phone?: string; email?: string }>({});
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    phone: '',
    email: ''
  });

  const fetchData = async () => {
    try {
      // 🌟 Fetch song song cả tài xế và đơn hàng
      const [driversRes, ordersRes] = await Promise.all([
        axiosInstance.get('/users'),
        axiosInstance.get('/orders')
      ]);
      setDrivers(driversRes.data);
      setAllOrders(ordersRes.data);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredDrivers = drivers.filter(d => 
    d.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.phone?.includes(searchTerm)
  );

  const handleOpenAddModal = () => {
    setFormData({ username: '', fullName: '', phone: '', email: '' });
    setIsEditing(false);
    setCurrentId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (driver: any) => {
    setFormData({ 
      username: driver.username || '', 
      fullName: driver.fullName || driver.full_name || '', 
      phone: driver.phone || '', 
      email: driver.email || '' 
    });
    setIsEditing(true);
    setCurrentId(driver.id);
    setErrors({});
    setIsModalOpen(true);
  };

  // 🌟 Hàm xử lý khi bấm nút View (Xem đơn hàng)
  const handleViewOrders = (driver: any) => {
    setSelectedDriverForOrders(driver);
    // Lọc các đơn hàng có assigned_driver_id hoặc driver.id trùng với id của tài xế này
    // (Tùy thuộc vào cấu trúc JSON backend trả về, mình check cả 2 trường hợp)
    const filteredOrders = allOrders.filter(o => 
      o.driver?.id === driver.id || o.assigned_driver_id === driver.id
    );
    
    // Sắp xếp đơn hàng mới nhất lên đầu
    const sortedOrders = filteredOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
    });

    setDriverOrders(sortedOrders);
    setIsOrderModalOpen(true);
  };

  const validateForm = () => {
    let newErrors: any = {};
    let isValid = true;

    if (!formData.username.trim()) { 
        newErrors.username = 'Tên đăng nhập không được để trống'; 
        isValid = false; 
    } else if (/\s/.test(formData.username)) {
        newErrors.username = 'Tên đăng nhập không được chứa khoảng trắng'; 
        isValid = false;
    }

    if (!formData.fullName.trim()) { newErrors.fullName = 'Tên tài xế không được để trống'; isValid = false; }
    
    const phoneRegex = /^(0|\+84)\d{9,10}$/;
    if (!formData.phone.trim()) { newErrors.phone = 'Số điện thoại không được để trống'; isValid = false; }
    else if (!phoneRegex.test(formData.phone.trim())) { newErrors.phone = 'Số điện thoại không hợp lệ'; isValid = false; }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && currentId) {
        await axiosInstance.put(`/users/${currentId}`, formData);
        setSuccessMsg("Cập nhật thông tin thành công!");
      } else {
        await axiosInstance.post('/users', formData);
        setSuccessMsg("Thêm mới tài xế thành công!");
      }
      
      fetchData();
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
      }, 1000);
    } catch (error) {
      alert("Có lỗi xảy ra khi lưu dữ liệu. Có thể Tên đăng nhập đã bị trùng!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài xế [${name}] không? Hành động này không thể hoàn tác.`)) {
      try {
        await axiosInstance.delete(`/users/${id}`);
        fetchData();
      } catch (error) {
        alert("Không thể xóa tài xế này vì đang có đơn hàng liên kết!");
      }
    }
  };

  // Helper hàm lấy màu trạng thái đơn hàng
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'SUCCESS': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CANCELED': 
      case 'FAILED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400 gap-3">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="font-bold tracking-widest uppercase text-sm">Đang tải hồ sơ tài xế...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Hồ sơ Tài xế</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý và cấp quyền truy cập cho đội ngũ đối tác giao hàng</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-xl shadow-slate-200 active:scale-95"
        >
          <Plus size={20} />
          Thêm tài xế mới
        </button>
      </div>

      {/* Thanh Tìm kiếm */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 w-full max-w-md">
         <div className="pl-3 text-slate-400"><Search size={20} /></div>
         <input 
            type="text" 
            placeholder="Tìm kiếm theo tên, tài khoản hoặc SĐT..." 
            className="w-full bg-transparent p-2 outline-none text-sm font-medium text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {/* Bảng Danh sách */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[11px] uppercase font-black tracking-wider">
                <th className="p-5">Họ và tên</th>
                <th className="p-5">Tài khoản & Liên hệ</th>
                <th className="p-5">Trạng thái</th>
                <th className="p-5 text-right">Thao tác</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {filteredDrivers.length === 0 ? (
                <tr>
                    <td colSpan={4} className="p-20 text-center text-slate-400 font-medium">Không tìm thấy tài xế nào.</td>
                </tr>
                ) : filteredDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                          {driver.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800">{driver.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {driver.id.substring(0,8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <p className="font-bold text-blue-600 text-sm">@{driver.username}</p>
                        <p className="font-medium text-slate-700 text-xs">{driver.phone}</p>
                        {driver.email && <p className="text-xs text-slate-400">{driver.email}</p>}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 🌟 Nút View đơn hàng mới thêm vào */}
                        <button onClick={() => handleViewOrders(driver)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Xem danh sách đơn">
                            <Eye size={18} />
                        </button>
                        <button onClick={() => handleOpenEditModal(driver)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Chỉnh sửa">
                            <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(driver.id, driver.fullName)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Xóa">
                            <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* MODAL THÊM/SỬA TÀI XẾ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-8 pb-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users size={24} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{isEditing ? 'Sửa thông tin' : 'Thêm tài xế'}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">{isEditing ? 'Cập nhật hồ sơ đối tác' : 'Cấp tài khoản mới cho đối tác'}</p>
                 </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={20}/></button>
            </div>

            <div className="p-8 space-y-5">
              {successMsg && (
                <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl text-sm border border-emerald-100 font-bold flex items-center gap-2">
                    <CheckCircle2 size={18} /> {successMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Tên đăng nhập (Username)</label>
                <input 
                  placeholder="Ví dụ: taixe_01"
                  className={`w-full p-3.5 bg-slate-50 border rounded-2xl outline-none transition-all text-sm font-medium ${errors.username ? 'border-red-400 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'} ${isEditing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`} 
                  value={formData.username} 
                  onChange={e => { setFormData({...formData, username: e.target.value}); setErrors({...errors, username: ''}); }}
                  disabled={isEditing}
                />
                {errors.username && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.username}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Họ và tên</label>
                <input 
                  placeholder="Nguyễn Văn Tài Xế"
                  className={`w-full p-3.5 bg-slate-50 border rounded-2xl outline-none transition-all text-sm font-medium ${errors.fullName ? 'border-red-400 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`} 
                  value={formData.fullName} 
                  onChange={e => { setFormData({...formData, fullName: e.target.value}); setErrors({...errors, fullName: ''}); }}
                />
                {errors.fullName && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Số điện thoại liên hệ</label>
                <input 
                  placeholder="0912345678"
                  className={`w-full p-3.5 bg-slate-50 border rounded-2xl outline-none transition-all text-sm font-medium ${errors.phone ? 'border-red-400 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`} 
                  value={formData.phone} 
                  onChange={e => { setFormData({...formData, phone: e.target.value}); setErrors({...errors, phone: ''}); }}
                />
                {errors.phone && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Email (Tùy chọn)</label>
                <input 
                  placeholder="taixe@gmail.com"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all text-sm font-medium" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              {!isEditing && (
                <div className="bg-blue-50 p-4 rounded-2xl text-blue-700 text-xs font-bold border border-blue-100 flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p>Mật khẩu mặc định cho tài xế mới là <span className="bg-white px-1.5 py-0.5 rounded text-black font-mono">123456</span>. Tài xế có thể đổi lại sau khi đăng nhập.</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl transition">Hủy bỏ</button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !!successMsg}
                className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:bg-blue-400"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>} 
                {isSubmitting ? 'Đang lưu...' : successMsg ? 'Thành công!' : 'Lưu thông tin'}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* 🌟 MODAL XEM CHI TIẾT DANH SÁCH ĐƠN HÀNG CỦA TÀI XẾ */}
      {isOrderModalOpen && selectedDriverForOrders && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header của Modal Đơn hàng */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Package size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Danh sách vận đơn</h2>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">
                        Tài xế: <span className="font-bold text-blue-600">{selectedDriverForOrders.fullName}</span> 
                        <span className="text-slate-300 mx-2">|</span> 
                        Tổng cộng: <span className="font-bold">{driverOrders.length}</span> đơn
                    </p>
                 </div>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                  <X size={20}/>
              </button>
            </div>

            {/* Body của Modal Đơn hàng */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                {driverOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                        <Package size={48} className="text-slate-200" />
                        <p className="font-medium">Tài xế này chưa được gán đơn hàng nào.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {driverOrders.map((order) => (
                            <div key={order.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="font-black text-slate-800 text-lg">{order.orderCode}</span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="space-y-1.5 text-sm text-slate-600">
                                    <p><span className="font-semibold text-slate-400">Khách hàng:</span> {order.customerName}</p>
                                    <p><span className="font-semibold text-slate-400">SĐT:</span> {order.customerPhone}</p>
                                    <p className="line-clamp-2"><span className="font-semibold text-slate-400">Địa chỉ:</span> {order.deliveryAddress}</p>
                                    <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-50">
                                        Ngày tạo: {new Date(order.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverManagement;