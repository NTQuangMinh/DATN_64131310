import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Users } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 🌟 1. TẠO ICON TÀI XẾ (Hình tròn xanh có emoji xe tải)
const DriverIcon = L.divIcon({
    className: 'custom-driver-icon',
    html: `
        <div style="
            background-color: #2563eb; 
            border: 2px solid white; 
            border-radius: 50%; 
            width: 32px; height: 32px; 
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            font-size: 16px;
        ">
            🚚
        </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16], // Tâm của icon nằm ở chính giữa
});

// 🌟 2. TẠO ICON ĐƠN HÀNG (Hình tròn cam có emoji hộp hàng)
const OrderIcon = L.divIcon({
    className: 'custom-order-icon',
    html: `
        <div style="
            background-color: #f59e0b; 
            border: 2px solid white; 
            border-radius: 50%; 
            width: 24px; height: 24px; 
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            font-size: 12px;
        ">
            📦
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const DriverTracking: React.FC = () => {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]); // State lưu đơn hàng
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            // Gọi song song 2 API để lấy cả Tài xế và Đơn hàng
            const [driversRes, ordersRes] = await Promise.all([
                axiosInstance.get('/users'),
                // Giả định API này lấy tất cả đơn. Hãy thay đổi endpoint nếu bạn có API riêng cho đơn "chưa giao"
                axiosInstance.get('/orders') 
            ]);

            setDrivers(driversRes.data.content || driversRes.data);
            
            // Lọc ra các đơn hàng CHƯA hoàn thành (PENDING, ASSIGNED, DELIVERING) và CÓ tọa độ
            const activeOrders = (ordersRes.data.content || ordersRes.data).filter((o: any) => 
                o.status !== 'DELIVERED' && o.status !== 'CANCELED' && o.latitude && o.longitude
            );
            setPendingOrders(activeOrders);

        } catch (error) {
            console.error("Lỗi tải dữ liệu bản đồ:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Cập nhật vị trí tài xế mỗi 5s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Users className="text-blue-600" /> Bản đồ điều hành Fleet
                </h1>
                <div className="flex items-center gap-4">
                    {/* Chú giải bản đồ */}
                    <div className="flex gap-3 text-xs font-bold text-slate-600 mr-4">
                        <span className="flex items-center gap-1">📍 <span className="text-blue-600">Tài xế</span></span>
                        <span className="flex items-center gap-1">📦 <span className="text-amber-500">Điểm giao</span></span>
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black animate-pulse">
                        ● Đang kết nối trực tiếp
                    </div>
                </div>
            </div>

            {/* Layout chính */}
            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* 1. Bản đồ chiếm 75% */}
                <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
                    <MapContainer center={[12.2451, 109.1951]} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        
                        {/* Render Danh sách Đơn hàng (Vẽ dưới cùng để không che tài xế) */}
                        {pendingOrders.map((order: any) => (
                            <Marker 
                                key={`order-${order.id}`} 
                                position={[order.latitude, order.longitude]} 
                                icon={OrderIcon} // Dùng icon màu cam
                            >
                                <Popup>
                                    <div className="text-xs">
                                        <p className="font-black text-amber-600 mb-1">Mã đơn: {order.orderCode}</p>
                                        <p><span className="font-bold">Khách:</span> {order.customerName}</p>
                                        <p><span className="font-bold">Địa chỉ:</span> {order.deliveryAddress}</p>
                                        <p className="mt-1 text-[10px] text-slate-400">Trạng thái: {order.status}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* Render Danh sách Tài xế (Vẽ đè lên trên) */}
                        {drivers.map((d: any) => (
                            d.latitude && d.longitude && (
                                <Marker 
                                    key={`driver-${d.id}`} 
                                    position={[d.latitude, d.longitude]} 
                                    icon={DriverIcon} // Dùng icon màu xanh
                                >
                                    <Popup>
                                        <div className="text-xs font-bold text-center">
                                            <p className="text-blue-600 mb-1">Tài xế: {d.fullName}</p>
                                            <p className="text-slate-500 font-normal">Đang hoạt động</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            )
                        ))}
                    </MapContainer>
                </div>

                {/* 2. Danh sách tài xế/Logs chiếm 25% */}
                <div className="w-80 bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col gap-4">
                    <h2 className="font-black text-slate-700 uppercase text-xs tracking-widest">Trạng thái tài xế</h2>
                    <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3">
                        {drivers.map((d: any) => (
                            <div key={d.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 hover:border-blue-300 cursor-pointer transition-colors">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-600">
                                    {d.fullName?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">{d.fullName}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Đang trực tuyến</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverTracking;