import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { Lock, User } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            // Gọi API Đăng nhập
            const response = await axiosInstance.post('/auth/login', { username, password });
            
            // Lưu token vào localStorage để dùng cho các request sau
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('username', username);
            
            // Chuyển hướng sang trang Dashboard
            navigate('/dashboard');
        } catch (err: any) {
            // Xử lý lỗi đăng nhập (Sai tài khoản, mật khẩu hoặc lỗi 403)
            if (err.response && err.response.status === 403) {
                setError('Tài khoản không có quyền truy cập Admin hoặc bị khóa.');
            } else {
                setError('Sai tên đăng nhập hoặc mật khẩu!');
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
                <div className="text-center mb-8">
                    <div className="bg-blue-100 text-blue-600 p-4 rounded-full inline-block mb-4">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Delivery Admin</h1>
                    <p className="text-slate-500 mt-2">Đăng nhập để quản lý hệ thống</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                            {error}
                        </div>
                    )}
                    
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Tên đăng nhập"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                            required
                        />
                    </div>
                    
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="password"
                            placeholder="Mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition duration-200"
                    
                    >
                        Đăng nhập
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;