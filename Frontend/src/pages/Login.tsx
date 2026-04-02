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
            // 1. Gọi API Đăng nhập
            const response = await axiosInstance.post('/auth/login', { username, password });
            
            // 2. Phân tách dữ liệu từ Backend (token và object user)
            const { token, user } = response.data;

            // 3. Lưu vào localStorage
            localStorage.setItem('token', token);
            // Quan trọng: Phải chuyển object thành string để lưu
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('username', username);
            
            // 4. Chuyển hướng dựa trên Role của User
            if (user.role === 'DRIVER') {
                navigate('/driver/tasks');
            } else {
                navigate('/dashboard');
            }
            
        } catch (err: any) {
            console.error("Login error:", err);
            if (err.response && err.response.status === 403) {
                setError('Tài khoản không có quyền truy cập hoặc bị khóa.');
            } else {
                setError('Sai tên đăng nhập hoặc mật khẩu!');
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200">
                <div className="text-center mb-8">
                    <div className="bg-blue-600 text-white p-4 rounded-2xl inline-block mb-4 shadow-lg shadow-blue-200">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Delivery System</h1>
                    <p className="text-slate-500 mt-2 font-medium">Vui lòng đăng nhập để tiếp tục</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 font-medium">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Tên đăng nhập</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Nhập username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Mật khẩu</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="password"
                                placeholder="Nhập mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                required
                            />
                        </div>
                    </div>
                    
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition duration-300 shadow-lg shadow-blue-200 mt-2"
                    >
                        Đăng nhập hệ thống
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;