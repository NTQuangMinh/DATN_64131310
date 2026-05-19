package com.quangminh.delivery.service;

import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.quangminh.delivery.entity.Order;
import org.springframework.core.io.ClassPathResource; // Import thêm thư viện này
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;

@Service
public class PdfGeneratorService {

    public String generateDeliveryReceipt(Order order) {
        String dest = "storage/receipts/" + order.getOrderCode() + ".pdf";
        File file = new File("storage/receipts/");
        if (!file.exists()) file.mkdirs();

        try {
            PdfWriter writer = new PdfWriter(dest);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            // =================================================================
            // SỬA TẠI ĐÂY: Nạp Font bằng ClassPathResource (An toàn tuyệt đối)
            // =================================================================
            ClassPathResource fontResource = new ClassPathResource("fonts/Arial.ttf");
            byte[] fontBytes;
            try (InputStream is = fontResource.getInputStream()) {
                fontBytes = is.readAllBytes();
            }
            PdfFont vietnameseFont = PdfFontFactory.createFont(fontBytes, PdfEncodings.IDENTITY_H);
            document.setFont(vietnameseFont);

            // Định nghĩa bảng màu (Theme Xanh Dương Công Nghệ)
            DeviceRgb primaryColor = new DeviceRgb(0, 122, 255);
            DeviceRgb headerTextColor = new DeviceRgb(255, 255, 255);
            DeviceRgb labelBgColor = new DeviceRgb(245, 245, 247);
            DeviceRgb mutedGray = new DeviceRgb(120, 120, 125);

            // Tiêu đề
            Paragraph title = new Paragraph("BIÊN BẢN GIAO NHẬN HÀNG HÓA")
                    .setFontSize(18)
                    .setBold()
                    .setFontColor(primaryColor)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(title);

            // Bảng thông tin
            Table table = new Table(new float[]{3f, 7f});
            table.useAllAvailableWidth();

            Cell headerCell = new Cell(1, 2)
                    .add(new Paragraph("THÔNG TIN CHI TIẾT ĐƠN HÀNG").setBold().setFontColor(headerTextColor))
                    .setBackgroundColor(primaryColor)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(8);
            table.addCell(headerCell);

            addRow(table, "Mã đơn hàng:", order.getOrderCode(), labelBgColor);
            addRow(table, "Khách hàng:", order.getCustomerName(), labelBgColor);
            addRow(table, "Địa chỉ nhận:", order.getDeliveryAddress(), labelBgColor);
            addRow(table, "Trạng thái:", "THÀNH CÔNG", labelBgColor);

            String formattedTime = java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
            addRow(table, "Thời gian ký:", formattedTime, labelBgColor);

            document.add(table);

            // Footer chờ ký DocuSign
            Paragraph footer = new Paragraph("\n\n\nChữ ký điện tử xác nhận của khách hàng\n(Ký số bảo mật an toàn qua hệ thống DocuSign PKI)")
                    .setFontSize(10)
                    .setItalic()
                    .setFontColor(mutedGray)
                    .setTextAlignment(TextAlignment.RIGHT);
            document.add(footer);

            document.close();
            return dest;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi sinh file PDF: " + e.getMessage(), e);
        }
    }

    private void addRow(Table table, String label, String value, DeviceRgb labelBg) {
        Cell labelCell = new Cell()
                .add(new Paragraph(label).setBold())
                .setBackgroundColor(labelBg)
                .setPadding(6);

        Cell valueCell = new Cell()
                .add(new Paragraph(value != null ? value : ""))
                .setPadding(6);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }
}