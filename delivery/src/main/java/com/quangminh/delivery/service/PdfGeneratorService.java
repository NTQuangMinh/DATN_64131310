package com.quangminh.delivery.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.quangminh.delivery.entity.Order;
import org.springframework.stereotype.Service;
import java.io.File;

@Service
public class PdfGeneratorService {

    public String generateDeliveryReceipt(Order order) {
        // Tạo thư mục lưu trữ nếu chưa có
        String dest = "storage/receipts/" + order.getOrderCode() + ".pdf";
        File file = new File("storage/receipts/");
        if (!file.exists()) file.mkdirs();

        try {
            PdfWriter writer = new PdfWriter(dest);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            // Nội dung biên bản
            document.add(new Paragraph("BIEN BAN GIAO NHAN HANG HOA"));
            document.add(new Paragraph("Ma don hang: " + order.getOrderCode()));
            document.add(new Paragraph("Khach hang: " + order.getCustomerName()));
            document.add(new Paragraph("Dia chi: " + order.getDeliveryAddress()));
            document.add(new Paragraph("Trang thai: THANH CONG"));
            document.add(new Paragraph("Thoi gian ky: " + java.time.LocalDateTime.now()));

            document.close();
            return dest;
        } catch (Exception e) {
            throw new RuntimeException("Loi khi sinh file PDF: " + e.getMessage());
        }
    }
}