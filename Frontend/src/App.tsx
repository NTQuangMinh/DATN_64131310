import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RouteCreate from './pages/RouteCreate';
import Login from './pages/Login';
import OrderList from './pages/OrderList';
import Sidebar from './components/Sidebar';
import DriverTasks from './pages/DriverTasks';

// Component bảo vệ Route: Nếu chưa có Token thì đá về trang Login
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Trang đăng nhập không cần bảo vệ */}
        <Route path="/login" element={<Login />} />

        {/* Các trang yêu cầu phải đăng nhập mới được xem */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <div className="flex bg-slate-50 min-h-screen">
                {/* Thanh điều hướng bên trái */}
                <Sidebar />
                
                {/* Nội dung chính bên phải (cách lề 64px để không bị Sidebar đè) */}
                <div className="flex-1 ml-64 p-8">
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard/>} />
                    <Route path="/orders" element={<OrderList />} />
                    <Route path="/routes" element={<RouteCreate/>} />
                    <Route path="/drivertasks" element={<DriverTasks />} />

                    {/* Nếu vào đường dẫn lạ, tự động về Dashboard */}
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </div>
              </div>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;