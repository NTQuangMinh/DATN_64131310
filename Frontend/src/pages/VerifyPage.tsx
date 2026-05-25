import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, UploadCloud, FileText, CheckCircle, 
  XCircle, AlertTriangle, Loader2, LockKeyhole 
} from 'lucide-react';

// Khai báo Interface cho đối tượng Result trả về từ Server
interface VerifyResult {
  isValid: boolean;
  message: string;
  orderCode?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
}

const VerifyPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý kéo thả file
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  // Xử lý chọn file qua nút bấm
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectFile(e.target.files[0]);
    }
  };

  const handleSelectFile = (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      setResult({ isValid: false, message: "Định dạng không hợp lệ. Vui lòng tải lên file PDF!" });
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setResult(null); // Xóa kết quả cũ khi chọn file mới
  };

  const handleVerify = async () => {
    if (!file) {
      setResult({ isValid: false, message: "Vui lòng chọn hoặc kéo thả một file PDF để kiểm tra!" });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setResult(null);
    try {
      // Ép kiểu dữ liệu trả về của Axios khớp với interface VerifyResult
      const response = await axios.post<VerifyResult>('http://localhost:8080/api/orders/verify-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (error) {
      setResult({ isValid: false, message: "Lỗi kết nối đến máy chủ xác thực. Vui lòng thử lại sau." });
    } finally {
      setLoading(false);
    }
  };

  const resetPage = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 text-blue-600 mb-6 shadow-sm border border-blue-100">
          <ShieldCheck size={40} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-3 uppercase">Cổng Kiểm Chứng Điện Tử</h1>
        <p className="text-slate-500 font-medium max-w-lg mx-auto">
          Tải lên file PDF biên bản giao hàng do khách hàng cung cấp. Hệ thống sẽ tự động quét, bóc tách và đối chiếu toàn vẹn chữ ký số DocuSign.
        </p>
      </div>

      {/* UPLOAD SECTION (DRAG & DROP) */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 mb-8 overflow-hidden relative">
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
            isDragging 
              ? 'border-blue-500 bg-blue-50 scale-[0.98]' 
              : file 
                ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100/50' 
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            accept="application/pdf" 
            onChange={handleFileChange}
            className="hidden" 
          />
          
          {file ? (
            <>
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500">
                <FileText size={32} />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg">{file.name}</p>
                <p className="text-slate-500 text-sm font-medium mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB • Sẵn sàng xác thực</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-500 mb-2">
                <UploadCloud size={32} />
              </div>
              <div>
                <p className="font-bold text-slate-700 text-lg">Kéo thả file PDF vào đây</p>
                <p className="text-slate-500 text-sm font-medium mt-1">hoặc <span className="text-blue-600 font-bold hover:underline">Click để duyệt tệp</span> từ máy tính của bạn</p>
              </div>
            </>
          )}
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); handleVerify(); }} 
          disabled={loading || !file}
          className="w-full mt-6 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-3 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={24} /> Hệ thống đang bóc tách & phân tích...</>
          ) : (
            <><ShieldCheck size={24} /> Bắt đầu Xác thực</>
          )}
        </button>
      </div>

      {/* HIỂN THỊ KẾT QUẢ XÁC THỰC (RESULT CARD) */}
      {result && (
        <div className={`rounded-[2rem] border overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500 ${
          result.isValid 
            ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100' 
            : 'bg-red-50 border-red-200 shadow-red-100'
        }`}>
          
          <div className="p-8 pb-6 text-center border-b border-white/50">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-sm ${
              result.isValid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
            }`}>
              {result.isValid ? <CheckCircle size={32} strokeWidth={3} /> : <XCircle size={32} strokeWidth={3} />}
            </div>
            <h2 className={`text-2xl font-black tracking-tight uppercase ${result.isValid ? 'text-emerald-700' : 'text-red-700'}`}>
              {result.isValid ? 'Biên bản hợp lệ' : 'Biên bản bị từ chối'}
            </h2>
            <p className={`mt-2 font-medium px-4 py-2 rounded-xl inline-block ${result.isValid ? 'bg-emerald-100/50 text-emerald-800' : 'bg-red-100/50 text-red-800'}`}>
              {result.message}
            </p>
          </div>

          {result.isValid && (
            <div className="p-8 pt-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100/50 space-y-4 relative overflow-hidden">
                
                {/* Hình mờ background (Watermark) */}
                <ShieldCheck className="absolute -right-8 -bottom-8 w-40 h-40 text-emerald-50 opacity-50 pointer-events-none" />

                <div className="grid grid-cols-2 gap-y-6 relative z-10">
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Mã đơn hàng</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">{result.orderCode}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Số điện thoại (Masked)</span>
                    <span className="font-bold text-slate-700">{result.customerPhone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Khách hàng</span>
                    <span className="font-black text-emerald-700 text-lg">{result.customerName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Địa chỉ giao hàng</span>
                    <span className="font-medium text-slate-600 leading-relaxed">{result.deliveryAddress}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-emerald-100 flex items-center gap-3 relative z-10">
                  <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                     <LockKeyhole size={16} />
                  </div>
                  <p className="text-xs font-bold text-emerald-700">
                    Chữ ký số DocuSign đã được giải mã và khớp 100% với dữ liệu gốc trên hệ thống.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!result.isValid && (
             <div className="p-8 pt-2 flex justify-center">
                <button onClick={resetPage} className="flex items-center gap-2 text-red-600 font-bold hover:underline">
                  <AlertTriangle size={18} /> Quét lại file khác
                </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerifyPage;