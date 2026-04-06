import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Package, Truck, CheckCircle, Clock, Loader2 } from 'lucide-react';

interface DashboardStats {
  total: number;
  delivering: number;
  completed: number;
  pending: number;
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Gọi API lấy thống kê từ Backend
        const response = await axiosInstance.get('/orders/stats');
        setData(response.data);
      } catch (error) {
        console.error("Lỗi khi lấy thống kê dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Mảng cấu hình hiển thị dựa trên dữ liệu state 'data'
  const statsConfig = [
    { label: 'Tổng đơn hàng', value: data?.total || 0, icon: <Package />, color: 'bg-blue-500' },
    { label: 'Đang vận chuyển', value: data?.delivering || 0, icon: <Truck />, color: 'bg-orange-500' },
    { label: 'Hoàn thành', value: data?.completed || 0, icon: <CheckCircle />, color: 'bg-green-500' },
    { label: 'Chờ xử lý', value: data?.pending || 0, icon: <Clock />, color: 'bg-slate-500' },
  ];

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Bảng điều khiển</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`${stat.color} p-3 rounded-lg text-white`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">
                {stat.value.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Phần biểu đồ - Bạn có thể tích hợp Recharts vào đây sau */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-64 flex flex-col items-center justify-center text-slate-400">
        <p className="mb-2">Thống kê vận chuyển theo tuần</p>
        <div className="w-full bg-slate-50 h-32 rounded-lg border-dashed border-2 border-slate-200 flex items-center justify-center">
             (Biểu đồ Recharts sẽ hiển thị ở đây)
        </div>
      </div>
    </div>
  );
};

export default Dashboard;