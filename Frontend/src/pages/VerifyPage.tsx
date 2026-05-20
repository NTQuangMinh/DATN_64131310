import React, { useState } from 'react';
import axios from 'axios';

// 1. Khai báo Interface (Kiểu dữ liệu) rõ ràng cho đối tượng Result trả về từ Server
interface VerifyResult {
    isValid: boolean;
    message: string;
    orderCode?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
}

const VerifyPage: React.FC = () => {
    // 2. Gắn kiểu dữ liệu (Generic Types) cho các State
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<VerifyResult | null>(null);

    // 3. Khai báo kiểu dữ liệu cho Event của thẻ <input type="file">
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setResult(null); // Xóa kết quả cũ khi chọn file mới
        }
    };

    const handleVerify = async () => {
        if (!file) {
            alert("Vui lòng chọn một file PDF để kiểm tra!");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            // 4. Ép kiểu dữ liệu trả về của Axios khớp với interface VerifyResult
            const response = await axios.post<VerifyResult>('http://localhost:8080/api/orders/verify-pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(response.data);
        } catch (error) {
            setResult({ isValid: false, message: "Lỗi kết nối đến máy chủ xác thực." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '50px auto', padding: '30px', fontFamily: 'Arial', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '12px', backgroundColor: '#fff' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: '#007AFF', fontSize: '24px' }}>🛡️ KIỂM CHỨNG BIÊN BẢN ĐIỆN TỬ</h1>
                <p style={{ color: '#666', fontSize: '14px' }}>Tải lên file PDF biên bản giao hàng để hệ thống xác thực tính toàn vẹn và chữ ký số.</p>
            </div>

            <div style={{ border: '2px dashed #007AFF', padding: '40px 20px', textAlign: 'center', borderRadius: '8px', backgroundColor: '#f0f8ff', marginBottom: '20px' }}>
                <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleFileChange}
                    style={{ display: 'block', margin: '0 auto' }}
                />
            </div>

            <button 
                onClick={handleVerify} 
                disabled={loading}
                style={{ width: '100%', padding: '14px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
                {loading ? "⏳ Đang phân tích chữ ký số..." : "Xác thực biên bản"}
            </button>

            {/* HIỂN THỊ KẾT QUẢ XÁC THỰC */}
            {result && (
                <div style={{ marginTop: '30px', padding: '20px', borderRadius: '8px', backgroundColor: result.isValid ? '#e6ffe6' : '#ffe6e6', border: `1px solid ${result.isValid ? '#34C759' : '#FF3B30'}` }}>
                    <h3 style={{ margin: '0 0 15px 0', color: result.isValid ? '#28a745' : '#dc3545', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {result.isValid ? '✅ BIÊN BẢN HỢP LỆ' : '❌ BIÊN BẢN KHÔNG HỢP LỆ'}
                    </h3>
                    <p style={{ color: '#333', fontSize: '14px', marginBottom: '15px' }}>{result.message}</p>
                    
                    {result.isValid && (
                        <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6' }}>
                            <div><strong style={{color: '#555'}}>Mã đơn hàng:</strong> {result?.orderCode}</div>
                            <div><strong style={{color: '#555'}}>Khách hàng:</strong> {result?.customerName}</div>
                            <div><strong style={{color: '#555'}}>Số điện thoại:</strong> {result?.customerPhone}</div>
                            <div><strong style={{color: '#555'}}>Địa chỉ giao:</strong> {result?.deliveryAddress}</div>
                            <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '10px 0' }}/>
                            <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '12px' }}>🔒 Chữ ký số DocuSign đã được đối chiếu khớp với hệ thống.</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VerifyPage;