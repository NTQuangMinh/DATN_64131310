import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { Lock, User, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();

    // 1. Gộp State cho gọn gàng và dễ quản lý
    const [formData, setFormData] = useState({ username: '', password: '' });
    // 2. State quản lý lỗi cho từng trường (field)
    const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({});
    const [isLoading, setIsLoading] = useState(false);

    // Xử lý khi người dùng gõ phím
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Tự động xóa lỗi của ô đó khi người dùng bắt đầu nhập lại
        if (errors[name as keyof typeof errors]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    // 3. LỚP KHIÊN 1: VALIDATE FRONTEND
    const validateForm = () => {
        let newErrors: any = {};
        let isValid = true;

        if (!formData.username.trim()) {
            newErrors.username = 'Tên đăng nhập không được để trống';
            isValid = false;
        } else if (formData.username.length < 4) {
            newErrors.username = 'Tên đăng nhập phải từ 4 ký tự trở lên';
            isValid = false;
        }

        if (!formData.password) {
            newErrors.password = 'Mật khẩu không được để trống';
            isValid = false;
        } else if (formData.password.length < 6) {
            newErrors.password = 'Mật khẩu phải chứa ít nhất 6 ký tự';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({}); // Xóa lỗi form cũ

        // Chặn gọi API nếu Frontend phát hiện lỗi
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const response = await axiosInstance.post('/auth/login', formData);
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('username', formData.username);
            
            // Chuyển hướng
            if (user.role === 'DRIVER') {
                navigate('/driver/tasks');
            } else {
                navigate('/dashboard');
            }
            
        } catch (err: any) {
            console.error("Login error:", err);
            // 4. LỚP KHIÊN 2: HỨNG LỖI TỪ BACKEND TRẢ VỀ
            if (err.response?.data?.error) {
                // Lỗi RuntimeException (Sai pass, tài khoản không tồn tại)
                setErrors({ form: err.response.data.error });
            } else if (err.response?.data) {
                // Lỗi Validation DTO từ Backend
                setErrors(err.response.data);
            } else if (err.response?.status === 403) {
                setErrors({ form: 'Tài khoản không có quyền truy cập hoặc bị khóa.' });
            } else {
                setErrors({ form: 'Lỗi máy chủ. Vui lòng thử lại sau!' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100">
                <div className="text-center mb-8">
                    <div className="bg-blue-600 text-white p-4 rounded-2xl inline-block mb-4 shadow-lg shadow-blue-200">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Delivery System</h1>
                    <p className="text-slate-500 mt-2 font-medium">Vui lòng đăng nhập để tiếp tục</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Báo lỗi chung của Form */}
                    {errors.form && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3.5 rounded-xl text-sm border border-red-100 font-medium animate-pulse">
                            <AlertCircle size={18} />
                            <span>{errors.form}</span>
                        </div>
                    )}
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tên đăng nhập</label>
                        <div className="relative">
                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${errors.username ? 'text-red-400' : 'text-slate-400'}`} size={18} />
                            <input
                                type="text"
                                name="username"
                                placeholder="Nhập username"
                                value={formData.username}
                                onChange={handleChange}
                                className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border rounded-2xl outline-none transition-all ${
                                    errors.username 
                                    ? 'border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/50' 
                                    : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                                }`}
                            />
                        </div>
                        {errors.username && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.username}</p>}
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mật khẩu</label>
                        <div className="relative">
                            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${errors.password ? 'text-red-400' : 'text-slate-400'}`} size={18} />
                            <input
                                type="password"
                                name="password"
                                placeholder="Nhập mật khẩu"
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border rounded-2xl outline-none transition-all ${
                                    errors.password 
                                    ? 'border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/50' 
                                    : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                                }`}
                            />
                        </div>
                        {errors.password && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.password}</p>}
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition duration-300 shadow-lg shadow-blue-200 mt-4 disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Đăng nhập hệ thống'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;