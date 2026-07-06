import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Package, CheckCircle, XCircle, Truck, TrendingUp, Loader2, Clock} from 'lucide-react';

interface RecentActivity {
  orderCode: string;
  driverName: string;
  customerName: string;
  status: string;
  timestamp: string;
}

interface DashboardStats {
  totalOrders: number;
  deliveredOrders: number;
  canceledOrders: number;
  deliveringOrders: number;
  assignedOrders: number;
  successRate: number;
  recentActivities: RecentActivity[]; // Bổ sung mảng dữ liệu mới từ API
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // Tự động tải lại dữ liệu mỗi 10 giây để Dashboard luôn có thông tin mới nhất
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get<DashboardStats>('/orders/stats');
      setStats(response.data);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu thống kê:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="font-medium">Đang đồng bộ dữ liệu hệ thống...</p>
      </div>
    );
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((stats?.successRate || 0) / 100) * circumference;

  // Hàm chuyển đổi thời gian ISO sang chuỗi đọc được (VD: "5 phút trước")
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Vừa xong";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
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

      {/* KHỐI HIỆU SUẤT VÀ HOẠT ĐỘNG GẦN ĐÂY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Biểu đồ tròn và Thanh trạng thái */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md h-full flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="text-indigo-500" size={24} />
                    <h2 className="text-xl font-bold text-slate-800">Hiệu suất giao hàng</h2>
                </div>
                
                <div className="flex flex-col items-center justify-center py-6">
                    <div className="relative flex items-center justify-center">
                    <svg className="transform -rotate-90 w-48 h-48 drop-shadow-md">
                        <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-100" />
                        <circle
                        cx="96"
                        cy="96"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="16"
                        strokeLinecap="round"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="text-emerald-500 transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute text-center mt-2">
                        <span className="text-4xl font-black text-slate-800">{stats?.successRate}%</span>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Hoàn thành</p>
                    </div>
                    </div>
                </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md flex flex-col justify-center">
                    <h2 className="text-xl font-bold text-slate-800 mb-8">Trạng thái chi tiết</h2>
                    <div className="space-y-8">
                    <ProgressBar label="Đơn mới phân công (Assigned)" count={stats?.assignedOrders} total={stats?.totalOrders} color="bg-blue-500" />
                    <ProgressBar label="Đang trên đường (Delivering)" count={stats?.deliveringOrders} total={stats?.totalOrders} color="bg-amber-500" />
                    <ProgressBar label="Bị hủy / Thất bại (Canceled)" count={stats?.canceledOrders} total={stats?.totalOrders} color="bg-red-500" />
                    </div>
                </div>
            </div>
        </div>

        {/* 🌟 KHỐI MỚI: HOẠT ĐỘNG GIAO HÀNG GẦN ĐÂY CỦA TÀI XẾ 🌟 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-1 h-[450px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clock size={20} className="text-blue-600"/> Hoạt động gần đây
               </h2>
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {!stats?.recentActivities || stats.recentActivities.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Package size={32} className="mb-2 opacity-50"/>
                        <span className="text-sm">Chưa có hoạt động giao hàng nào.</span>
                    </div>
                ) : (
                    stats.recentActivities.map((activity, index) => {
                        const isSuccess = activity.status === 'DELIVERED' || activity.status === 'SUCCESS';
                        
                        return (
                        <div key={index} className="flex gap-3 relative">
                            {/* Dòng Line dọc tạo cảm giác Timeline */}
                            {index !== stats.recentActivities.length - 1 && (
                                <div className="absolute left-[15px] top-[30px] bottom-[-20px] w-0.5 bg-slate-100"></div>
                            )}
                            
                            {/* Icon trạng thái */}
                            <div className="relative z-10 shrink-0 mt-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                    {isSuccess ? <CheckCircle size={14} className="text-white"/> : <XCircle size={14} className="text-white"/>}
                                </div>
                            </div>
                            
                            {/* Nội dung thông báo */}
                            <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100 hover:border-blue-200 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-black text-slate-700">{activity.orderCode}</span>
                                    <span className="text-[10px] font-bold text-slate-400">{formatTimeAgo(activity.timestamp)}</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1.5 leading-relaxed">
                                    Tài xế <span className="font-bold text-blue-600">{activity.driverName}</span> vừa báo cáo 
                                    <span className={`font-bold ${isSuccess ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {isSuccess ? ' giao thành công ' : ' giao thất bại '}
                                    </span>
                                    cho khách hàng {activity.customerName}.
                                </p>
                            </div>
                        </div>
                    )})
                )}
            </div>
        </div>

      </div>
    </div>
  );
};


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