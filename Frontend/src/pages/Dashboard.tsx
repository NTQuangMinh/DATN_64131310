import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, CheckCircle, XCircle, Truck, TrendingUp } from 'lucide-react';

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
      const token = localStorage.getItem('token');
      // Đổi port 8080 nếu BE của bạn dùng port khác
      const response = await axios.get<DashboardStats>('http://localhost:8080/api/orders/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu thống kê:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Tổng quan hệ thống</h1>
        <p className="text-slate-500 mt-2">Theo dõi tình trạng giao nhận hàng hóa theo thời gian thực.</p>
      </div>

      {/* KHỐI THẺ THỐNG KÊ (CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Thẻ Tổng Đơn */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng đơn hàng</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats?.totalOrders || 0}</h3>
          </div>
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Package size={28} />
          </div>
        </div>

        {/* Thẻ Thành Công */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Giao thành công</p>
            <h3 className="text-3xl font-bold text-emerald-600">{stats?.deliveredOrders || 0}</h3>
          </div>
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle size={28} />
          </div>
        </div>

        {/* Thẻ Thất Bại */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Giao thất bại</p>
            <h3 className="text-3xl font-bold text-red-600">{stats?.canceledOrders || 0}</h3>
          </div>
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <XCircle size={28} />
          </div>
        </div>

        {/* Thẻ Đang Giao */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Đang đi giao</p>
            <h3 className="text-3xl font-bold text-amber-500">{stats?.deliveringOrders || 0}</h3>
          </div>
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <Truck size={28} />
          </div>
        </div>
      </div>

      {/* KHỐI HIỆU SUẤT VÀ TIẾN ĐỘ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-indigo-500" size={24} />
            <h2 className="text-xl font-bold text-slate-800">Hiệu suất giao hàng</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-6">
            {/* Vòng tròn tiến độ giả lập bằng Tailwind CSS */}
            <div className="relative w-48 h-48 flex items-center justify-center rounded-full border-[16px] border-slate-100">
              <div 
                className="absolute inset-0 rounded-full border-[16px] border-emerald-500"
                style={{ clipPath: `polygon(0 0, 100% 0, 100% ${stats?.successRate}%, 0 ${stats?.successRate}%)` }}
              ></div>
              <div className="text-center z-10">
                <span className="text-4xl font-black text-slate-800">{stats?.successRate}%</span>
                <p className="text-sm text-slate-500 font-medium">Hoàn thành</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Trạng thái chi tiết</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Đơn mới phân công (Assigned)</span>
                  <span className="text-sm font-bold text-slate-800">{stats?.assignedOrders} đơn</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(stats?.assignedOrders || 0) / (stats?.totalOrders || 1) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Đang trên đường (Delivering)</span>
                  <span className="text-sm font-bold text-slate-800">{stats?.deliveringOrders} đơn</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${(stats?.deliveringOrders || 0) / (stats?.totalOrders || 1) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Bị hủy / Thất bại (Canceled)</span>
                  <span className="text-sm font-bold text-slate-800">{stats?.canceledOrders} đơn</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(stats?.canceledOrders || 0) / (stats?.totalOrders || 1) * 100}%` }}></div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;