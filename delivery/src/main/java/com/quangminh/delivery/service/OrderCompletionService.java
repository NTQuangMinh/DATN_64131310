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

    public String initiateOrderSigning(Order order) {
        String unsignedPdfPath = null;
        try {
            // Bước 1: Tạo file PDF thô (unsigned)
            // File này lưu tạm tại storage/receipts/ORD-XXX.pdf
            unsignedPdfPath = pdfGeneratorService.generateDeliveryReceipt(order);

            // Bước 2: Gọi DocuSignService để lấy link ký số nhúng
            // Đây là bước "ký số PKI" thực sự thông qua bên thứ 3 (DocuSign)
            String signingUrl = docuSignService.getEmbeddedSigningUrl(order, unsignedPdfPath);

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