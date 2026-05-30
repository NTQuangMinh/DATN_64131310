import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { Lock, User, AlertCircle, Loader2, Truck, ShieldCheck, Map } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ username: '', password: '' });
    const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({});
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name as keyof typeof errors]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

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
        setErrors({}); 

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const response = await axiosInstance.post('/auth/login', formData);
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('username', formData.username);
            
            if (user.role === 'DRIVER') {
                navigate('/driver/tasks');
            } else {
                navigate('/dashboard');
            }
            
        } catch (err: any) {
            console.error("Login error:", err);
            if (err.response?.data?.error) {
                setErrors({ form: err.response.data.error });
            } else if (err.response?.data) {
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
        // Container chiếm toàn bộ màn hình, chia làm 2 cột trên Desktop
        <div className="flex min-h-screen bg-slate-50 font-sans">
            
            {/* CỘT TRÁI: Khu vực Branding (Chỉ hiện trên màn hình lớn) */}
            <div className="hidden lg:flex lg:w-1/2 bg-blue-900 relative overflow-hidden flex-col justify-between p-12">
                {/* Background Pattern trang trí */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 text-white mb-16">
                        <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                            <Truck size={32} />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">Q-Logistics</h1>
                    </div>

                    <div className="space-y-6 max-w-md">
                        <h2 className="text-4xl font-bold text-white leading-tight">
                            Hệ thống Điều hành <br/> <span className="text-blue-300">Vận tải Thông minh</span>
                        </h2>
                        <p className="text-blue-100 text-lg leading-relaxed">
                            Quản lý lộ trình, giám sát GPS thời gian thực và số hóa biên bản bàn giao hoàn toàn tự động.
                        </p>
                    </div>
                </div>

                {/* Các tính năng nổi bật */}
                <div className="relative z-10 grid grid-cols-2 gap-6 mt-16 text-blue-100">
                    <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/10">
                        <Map className="mb-3 text-cyan-300" size={28} />
                        <h3 className="font-bold text-white mb-1">Định tuyến AI</h3>
                        <p className="text-sm opacity-80">Tối ưu hóa quãng đường giao hàng qua OSRM.</p>
                    </div>
                    <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/10">
                        <ShieldCheck className="mb-3 text-cyan-300" size={28} />
                        <h3 className="font-bold text-white mb-1">Bảo mật tuyệt đối</h3>
                        <p className="text-sm opacity-80">Xác thực ký số DocuSign chống gian lận.</p>
                    </div>
                </div>
                
                {/* Footer bản quyền */}
                <div className="relative z-10 text-blue-200/60 text-sm mt-12 font-medium">
                    &copy; {new Date().getFullYear()} Q-Logistics Corporation. Bảo lưu mọi quyền.
                </div>
            </div>

            {/* CỘT PHẢI: Form Đăng nhập */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white relative">
                
                {/* Nút Help (Demo) */}
                <div className="absolute top-8 right-8 hidden sm:block">
                    <button className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors">
                        Cần hỗ trợ?
                    </button>
                </div>

                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    {/* Header Mobile (Chỉ hiện trên điện thoại) */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="bg-blue-600 text-white p-3 rounded-2xl inline-block mb-4 shadow-lg shadow-blue-200">
                            <Truck size={28} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Q-Logistics</h1>
                    </div>

                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Đăng nhập</h2>
                        <p className="text-slate-500 font-medium">Nhập thông tin tài khoản nội bộ để truy cập hệ thống.</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                        {errors.form && (
                            <div className="flex items-start gap-3 bg-red-50 text-red-700 p-4 rounded-2xl text-sm border border-red-100 font-medium animate-pulse">
                                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{errors.form}</span>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">
                                Tên đăng nhập
                            </label>
                            <div className="relative group">
                                <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.username ? 'text-red-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} size={20} />
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="Ví dụ: admin, taixe01..."
                                    value={formData.username}
                                    onChange={handleChange}
                                    className={`w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 rounded-2xl outline-none transition-all font-medium text-slate-700 ${
                                        errors.username 
                                        ? 'border-red-300 focus:bg-red-50/50 focus:border-red-400 bg-red-50/30' 
                                        : 'border-slate-100 hover:border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                                    }`}
                                />
                            </div>
                            {errors.username && <p className="text-red-500 text-xs mt-1.5 ml-1 font-bold">{errors.username}</p>}
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                    Mật khẩu
                                </label>
                                <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                    Quên mật khẩu?
                                </a>
                            </div>
                            <div className="relative group">
                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-red-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} size={20} />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 rounded-2xl outline-none transition-all font-medium text-slate-700 ${
                                        errors.password 
                                        ? 'border-red-300 focus:bg-red-50/50 focus:border-red-400 bg-red-50/30' 
                                        : 'border-slate-100 hover:border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                                    }`}
                                />
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1 font-bold">{errors.password}</p>}
                        </div>
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white py-4.5 rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-600/20 mt-8 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 h-14"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={22} /> : 'Truy cập hệ thống'}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
};

export default Login;