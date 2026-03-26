import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Truck, MapPin, Camera, CheckCircle, Navigation, Loader2, Package, Clock } from 'lucide-react';

const DriverTasks = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchTasks = async () => {
    console.log("--- Bắt đầu kiểm tra dữ liệu ---");
    try {
      // 1. Kiểm tra tất cả các key có thể có trong localStorage
      const userStr = localStorage.getItem('user');
      console.log("Giá trị 'user' trong Storage:", userStr);

      if (!userStr) {
        console.error("LỖI: Không tìm thấy key 'user' trong localStorage. Hãy kiểm tra lại lúc đăng nhập bạn lưu tên là gì!");
        setLoading(false);
        return;
      }

      const user = JSON.parse(userStr);
      // Đảm bảo lấy đúng trường 'id'. Trong Swagger bạn thấy nó là 'id', hãy check lại code login
      const driverId = user.id; 

      if (!driverId) {
        console.error("LỖI: Object user tồn tại nhưng không có trường 'id':", user);
        setLoading(false);
        return;
      }

      console.log("=> Đang gọi API cho Driver ID:", driverId);

      // 2. Gọi API kèm driverId
      const res = await axiosInstance.get(`/orders/my-tasks?driverId=${driverId}`);
      
      console.log("Dữ liệu Backend trả về:", res.data);

      // 3. Cập nhật state (Tạm thời bỏ filter để chắc chắn dữ liệu hiện ra cái đã)
      setTasks(res.data); 
      
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleComplete = (orderId: string) => {
    if (!navigator.geolocation) {
      alert("Thiết bị không hỗ trợ GPS!");
      return;
    }
    setSubmitting(orderId);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        await axiosInstance.post(`/orders/${orderId}/complete`, {
          actualLatitude: latitude,
          actualLongitude: longitude,
          status: 'DELIVERED',
          evidenceImage: "https://via.placeholder.com/150"
        });
        alert("Giao hàng thành công!");
        fetchTasks();
      } catch (err) {
        alert("Lỗi khi gửi dữ liệu!");
      } finally {
        setSubmitting(null);
      }
    });
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-md mx-auto p-4 pb-20 space-y-4 bg-slate-50 min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Truck className="text-blue-600" size={24} />
          <h1 className="text-xl font-bold text-slate-800">Nhiệm vụ của tôi</h1>
        </div>
        <span className="bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1 rounded-full">
          {tasks.length} Đơn hàng
        </span>
      </header>

      {tasks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <Package className="mx-auto text-slate-300 mb-2" size={48} />
          <p className="text-slate-400 font-medium">Không tìm thấy đơn hàng nào!</p>
          <button onClick={fetchTasks} className="mt-4 text-blue-600 text-sm font-bold underline">Thử tải lại</button>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-blue-600 text-lg">#{task.orderCode}</p>
                  <p className="font-bold text-slate-800">{task.customerName}</p>
                </div>
                <div className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-md">
                   {task.status}
                </div>
              </div>
              
              <div className="flex gap-2 text-slate-500 text-xs">
                <MapPin size={14} className="shrink-0 text-red-500" />
                <p>{task.deliveryAddress || "Chưa có địa chỉ"}</p>
              </div>

              <button 
                disabled={submitting === task.id}
                onClick={() => handleComplete(task.id)}
                className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              >
                {submitting === task.id ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16} />}
                Hoàn tất giao hàng
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverTasks;