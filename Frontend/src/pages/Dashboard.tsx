import { Package, Truck, CheckCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { label: 'Tổng đơn hàng', value: '128', icon: <Package />, color: 'bg-blue-500' },
    { label: 'Đang vận chuyển', value: '12', icon: <Truck />, color: 'bg-orange-500' },
    { label: 'Hoàn thành', value: '114', icon: <CheckCircle />, color: 'bg-green-500' },
    { label: 'Chờ xử lý', value: '2', icon: <Clock />, color: 'bg-slate-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Bảng điều khiển</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className={`${stat.color} p-3 rounded-lg text-white`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Nơi đây có thể vẽ biểu đồ hoặc danh sách đơn hàng mới nhất */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-64 flex items-center justify-center text-slate-400">
        (Biểu đồ thống kê sẽ hiển thị ở đây)
      </div>
    </div>
  );
};

export default Dashboard;