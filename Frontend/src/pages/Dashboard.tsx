import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance'; // Thay thế axios thường bằng axiosInstance cho chuẩn
import { Package, CheckCircle, XCircle, Truck, TrendingUp, Loader2 } from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  deliveredOrders: number;
  canceledOrders: number;
  deliveringOrders: number;
  assignedOrders: number;
  successRate: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Dùng axiosInstance thì không cần lấy token thủ công nữa (nếu bạn đã cấu hình Interceptor)
      // Nếu chưa có Interceptor, hãy giữ lại cách truyền header cũ nhé!
      const response = await axiosInstance.get<DashboardStats>('/orders/stats');
      setStats(response.data);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu thống kê:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="font-medium">Đang đồng bộ dữ liệu hệ thống...</p>
      </div>
    );
  }

  // Tính toán thông số cho biểu đồ SVG Donut Chart
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((stats?.successRate || 0) / 100) * circumference;

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Tổng quan hệ thống</h1>
        <p className="text-slate-500 mt-2">Theo dõi tình trạng giao nhận hàng hóa theo thời gian thực.</p>
      </div>

      {/* KHỐI THẺ THỐNG KÊ (CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Tổng đơn hàng" value={stats?.totalOrders || 0} icon={<Package size={28} />} bgColor="bg-blue-50" textColor="text-blue-600" />
        <StatCard title="Giao thành công" value={stats?.deliveredOrders || 0} icon={<CheckCircle size={28} />} bgColor="bg-emerald-50" textColor="text-emerald-600" />
        <StatCard title="Giao thất bại" value={stats?.canceledOrders || 0} icon={<XCircle size={28} />} bgColor="bg-red-50" textColor="text-red-600" />
        <StatCard title="Đang đi giao" value={stats?.deliveringOrders || 0} icon={<Truck size={28} />} bgColor="bg-amber-50" textColor="text-amber-500" />
      </div>

      {/* KHỐI HIỆU SUẤT VÀ TIẾN ĐỘ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ tròn (Donut Chart) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-indigo-500" size={24} />
            <h2 className="text-xl font-bold text-slate-800">Hiệu suất giao hàng</h2>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative flex items-center justify-center">
              {/* SVG Donut Chart */}
              <svg className="transform -rotate-90 w-48 h-48">
                <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-100" />
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="text-emerald-500 transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl font-black text-slate-800">{stats?.successRate}%</span>
                <p className="text-sm text-slate-500 font-medium mt-1">Hoàn thành</p>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh trạng thái chi tiết */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <h2 className="text-xl font-bold text-slate-800 mb-8">Trạng thái chi tiết</h2>
            <div className="space-y-8">
              <ProgressBar label="Đơn mới phân công (Assigned)" count={stats?.assignedOrders} total={stats?.totalOrders} color="bg-blue-500" />
              <ProgressBar label="Đang trên đường (Delivering)" count={stats?.deliveringOrders} total={stats?.totalOrders} color="bg-amber-500" />
              <ProgressBar label="Bị hủy / Thất bại (Canceled)" count={stats?.canceledOrders} total={stats?.totalOrders} color="bg-red-500" />
            </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT PHỤ TRỢ GIÚP CODE GỌN GÀNG HƠN
// ==========================================

const StatCard = ({ title, value, icon, bgColor, textColor }: any) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className={`text-3xl font-black ${textColor}`}>{value}</h3>
    </div>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bgColor} ${textColor}`}>
      {icon}
    </div>
  </div>
);

const ProgressBar = ({ label, count = 0, total = 1, color }: any) => {
  const percentage = total === 0 ? 0 : (count / total) * 100;
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-sm font-bold text-slate-800">{count} đơn</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div 
          className={`${color} h-3 rounded-full transition-all duration-1000 ease-out`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default Dashboard;