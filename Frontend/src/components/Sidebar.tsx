import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  ShieldCheck, 
  LogOut,
  Truck
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: <LayoutDashboard size={20}/>, label: 'Dashboard', path: '/dashboard' },
    { icon: <Package size={20}/>, label: 'Đơn hàng', path: '/orders' },
    { icon: <MapPin size={20}/>, label: 'Lập tuyến', path: '/routes' },
    { icon: <Truck size={20}/>, label: 'Nhiệm vụ giao hàng', path: '/drivertasks' },
    { icon: <ShieldCheck size={20}/>, label: 'Xác minh ký số', path: '/verify' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div className="w-64 h-screen bg-slate-900 text-slate-300 p-4 fixed left-0 top-0 flex flex-col shadow-xl">
      {/* Logo hệ thống */}
      <div className="flex items-center gap-3 px-2 mb-10 mt-4">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Truck className="text-white" size={24} />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">Delivery Admin</span>
      </div>

      {/* Menu chính */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
                }`}
            >
              <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Nút Đăng xuất ở dưới cùng */}
      <div className="border-t border-slate-800 pt-4 mt-auto">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;