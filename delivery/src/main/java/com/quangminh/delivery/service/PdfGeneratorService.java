package com.quangminh.delivery.service;

// Các thư viện cho giao diện PDF và Font
import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;

// Các thư viện TẠO MÃ QR (Đã được thêm vào)
import com.itextpdf.barcodes.BarcodeQRCode;
import com.itextpdf.kernel.pdf.xobject.PdfFormXObject;
import com.itextpdf.layout.element.Image;

import com.quangminh.delivery.entity.Order;
import org.springframework.core.io.ClassPathResource;
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
            PdfDocument pdf = new PdfDocument(writer); // Biến gốc tên là "pdf"
            Document document = new Document(pdf);

            // Nạp Font bằng ClassPathResource
            ClassPathResource fontResource = new ClassPathResource("fonts/Arial.ttf");
            byte[] fontBytes;
            try (InputStream is = fontResource.getInputStream()) {
                fontBytes = is.readAllBytes();
            }
            PdfFont vietnameseFont = PdfFontFactory.createFont(fontBytes, PdfEncodings.IDENTITY_H);
            document.setFont(vietnameseFont);

            // Định nghĩa bảng màu
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

            // =================================================================
            // CHÈN MÃ QR CODE (Sử dụng biến "pdf" thay vì "pdfDoc")
            // =================================================================
            String verifyUrl = "http://localhost:5173/verify"; // Đổi thành tên miền sau khi Deploy
            BarcodeQRCode qrCode = new BarcodeQRCode(verifyUrl);

            // Ép QR Code thành dạng ảnh gắn vào biến "pdf"
            PdfFormXObject qrCodeObject = qrCode.createFormXObject(ColorConstants.BLACK, pdf);
            Image qrImage = new Image(qrCodeObject);
            qrImage.setWidth(100);
            qrImage.setHeight(100);

            document.add(new Paragraph("Quét mã QR dưới đây để kiểm chứng biên bản trực tuyến:")
                    .setMarginTop(20)
                    .setFontSize(10)
                    .setItalic());
            document.add(qrImage);
            // =================================================================

            // Footer chờ ký DocuSign
            Paragraph footer = new Paragraph("\nChữ ký điện tử xác nhận của khách hàng\n(Ký số bảo mật an toàn qua hệ thống DocuSign PKI)")
                    .setFontSize(10)
                    .setItalic()
                    .setFontColor(mutedGray)
                    .setTextAlignment(TextAlignment.RIGHT);
            document.add(footer);

            document.close();

            System.out.println("Đã tạo PDF thành công (chạy ngầm): " + dest);
            return dest;
        } catch (Exception e) {
            System.err.println("Lỗi khi sinh file PDF: " + e.getMessage());
            e.printStackTrace();
            return null;
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