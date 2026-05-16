package com.quangminh.delivery.service;

import com.quangminh.delivery.entity.Order;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.io.File;

@Service
public class OrderCompletionService {

    @Autowired
    private PdfGeneratorService pdfGeneratorService;

    @Autowired
    private DocuSignService docuSignService; // Thay thế SignatureService cũ

    /**
     * Quy trình chuẩn bị để ký số DocuSign:
     * 1. Tạo file PDF thô từ dữ liệu đơn hàng (Chứa thông tin giao hàng)
     * 2. Gửi PDF này lên DocuSign để tạo Envelope (Phong bì điện tử)
     * 3. Trả về link (URL) để tài xế có thể mở trên App Mobile để ký
     */
    public String initiateOrderSigning(Order order) {
        String unsignedPdfPath = null;
        try {
            // Bước 1: Tạo file PDF thô (unsigned)
            // File này lưu tạm tại storage/receipts/ORD-XXX.pdf
            unsignedPdfPath = pdfGeneratorService.generateDeliveryReceipt(order);

            // Bước 2: Gọi DocuSignService để lấy link ký số nhúng
            // Đây là bước "ký số PKI" thực sự thông qua bên thứ 3 (DocuSign)
            String signingUrl = docuSignService.getEmbeddedSigningUrl(order, unsignedPdfPath);

            // Bước 3: Xóa file thô sau khi đã tải lên DocuSign để bảo mật và tiết kiệm bộ nhớ
            // DocuSign đã giữ một bản sao của file này trên Cloud của họ để chờ ký
            File unsignedFile = new File(unsignedPdfPath);
            if (unsignedFile.exists()) {
                unsignedFile.delete();
            }

            // Trả về URL để Controller gửi về cho Mobile
            return signingUrl;

        } catch (Exception e) {
            // Cleanup: Nếu lỗi xảy ra, cố gắng xóa file tạm nếu nó vẫn tồn tại
            if (unsignedPdfPath != null) {
                new File(unsignedPdfPath).delete();
            }
            throw new RuntimeException("Lỗi khởi tạo quy trình ký số DocuSign: " + e.getMessage());
        }
    }
}