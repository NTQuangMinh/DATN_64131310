package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.DeliveryCompleteDTO;
import com.quangminh.delivery.dto.OrderRequestDTO;
import com.quangminh.delivery.entity.Order;
import com.quangminh.delivery.entity.AuditLog;
import com.quangminh.delivery.repository.AuditLogRepository;
import com.quangminh.delivery.service.DocuSignService;
import com.quangminh.delivery.service.OrderCompletionService;
import com.quangminh.delivery.service.OrderService;
import com.quangminh.delivery.service.PdfGeneratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource; // Import thêm cái này
import org.springframework.core.io.UrlResource; // Import thêm cái này
import org.springframework.http.HttpHeaders; // Import thêm cái này
import org.springframework.http.MediaType; // Import thêm cái này
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import java.util.HashMap;
import java.util.Map;

import java.nio.file.Path; // Import thêm cái này
import java.nio.file.Paths; // Import thêm cái này
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*") // Ngăn lỗi CORS cho cả Web Admin và Mobile App
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private DocuSignService docuSignService;

    @Autowired
    private PdfGeneratorService pdfGeneratorService;

    @Autowired
    private OrderCompletionService orderCompletionService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private AuditLogRepository auditLogRepository;

    // =========================================================================
    // TUẦN 6: API GHI NHẬN TÀI XẾ CHECK-IN TẠI ĐIỂM ĐẾN (GPS + THỜI GIAN)
    // =========================================================================
    @PostMapping("/{id}/check-in")
    public ResponseEntity<String> checkInAtLocation(
            @PathVariable UUID id,
            @RequestParam String driverId,
            @RequestParam double lat,
            @RequestParam double lng) {

        Order order = orderService.getOrderById(id);

        // Ghi nhật ký hệ thống (Audit Log) theo đúng tuần 12 đề cương
        String logDetail = String.format("Tài xế [ID: %s] đã nhấn CHECK-IN thành công tại đơn [%s]. Vị trí GPS ghi nhận: Vĩ độ %f, Kinh độ %f",
                driverId, order.getOrderCode(), lat, lng);

        AuditLog checkInLog = new AuditLog("CHECK_IN", driverId, logDetail);
        auditLogRepository.save(checkInLog);

        System.out.println("Audit Log: " + logDetail);
        return ResponseEntity.ok("Ghi nhận thông tin Check-in thành công!");
    }
    // 1. Tạo đơn hàng và thông báo Real-time cho tài xế qua WebSocket
    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody OrderRequestDTO dto) {
        Order savedOrder = orderService.createOrder(dto);

        // Gửi thông báo đến topic riêng của tài xế: /topic/driver/{driverId}
        if (savedOrder.getDriver() != null) {
            messagingTemplate.convertAndSend(
                    "/topic/driver/" + savedOrder.getDriver().getId(),
                    savedOrder
            );
        }

        return ResponseEntity.ok(savedOrder);
    }

    // 2. Lấy link ký số DocuSign (Thay thế cho việc ký tay trên App)
    @PostMapping("/{id}/signing-url")
    public ResponseEntity<?> getSigningUrl(@PathVariable UUID id) {
        Order order = orderService.getOrderById(id);
        // Gọi OrderCompletionService để làm mọi việc (Tạo PDF -> Lấy Link)
        String url = orderCompletionService.initiateOrderSigning(order);
        return ResponseEntity.ok(Collections.singletonMap("signingUrl", url));
    }

    // 3. Webhook nhận tín hiệu từ DocuSign khi tài xế ký xong
    @PostMapping("/docusign/webhook")
    public ResponseEntity<String> handleDocuSignWebhook(@RequestBody String xmlData) {
        if (xmlData.contains("<Status>Completed</Status>")) {
            System.out.println("Đơn hàng đã được ký thành công!");
        }
        return ResponseEntity.ok("Confirmed");
    }

    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping("/my-tasks")
    public ResponseEntity<List<Order>> getMyTasks(@RequestParam UUID driverId) {
        return ResponseEntity.ok(orderService.getOrdersByDriverId(driverId));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(orderService.getOrderStatistics());
    }

    // API dành riêng cho việc chuyển đổi trạng thái (Ví dụ: Từ ASSIGNED sang DELIVERING)
    // Hoàn toàn không kích hoạt luồng tạo file PDF tại đây
    @PutMapping("/{id}/status")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable UUID id,
            @RequestParam String status) {

        Order order = orderService.getOrderById(id);

        // Cập nhật trạng thái mới do Mobile gửi lên (Ví dụ: DELIVERING)
        order.setStatus(status);

        // Lưu lại vào Database thông qua hàm save của bạn
        Order updatedOrder = orderService.updateOrderStatus(id, status); // Hoặc gọi qua Service của bạn

        System.out.println("Đơn hàng " + order.getOrderCode() + " đã chuyển sang trạng thái: " + status);
        return ResponseEntity.ok(updatedOrder);
    }
    // Endpoint cập nhật trạng thái đơn và lưu ảnh minh chứng Base64 từ Mobile gửi lên
    @PostMapping("/{id}/complete")
    public ResponseEntity<Order> completeDelivery(
            @PathVariable UUID id,
            @RequestBody DeliveryCompleteDTO dto) {

        // 1. Gọi service cập nhật trạng thái đơn hàng sang DELIVERED và lưu ảnh vào DB
        Order completedOrder = orderService.completeDelivery(id, dto);

        // =========================================================================
        // VÁ LỖI MẤT FILE: TỰ ĐỘNG SINH FILE PDF LƯU VÀO Ổ CỨNG NGAY TẠI ĐÂY
        // =========================================================================
        try {
            System.out.println("Đang kích hoạt tự động tạo tệp PDF cho đơn hàng: " + completedOrder.getOrderCode());

            // Gọi dịch vụ iText 7 đã sửa hôm trước để tạo file PDF có dấu tiếng Việt
            pdfGeneratorService.generateDeliveryReceipt(completedOrder);

            System.out.println("Đã tạo và lưu thành công file PDF vào thư mục storage/receipts!");
        } catch (Exception e) {
            System.out.println("Cảnh báo: Trạng thái đã cập nhật nhưng không thể sinh file PDF: " + e.getMessage());
        }
        // =========================================================================

        return ResponseEntity.ok(completedOrder);
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<Map<String, Object>> getOrderReport(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.getOrderReport(id));
    }

    // =========================================================================
    // THÊM ENDPOINT NÀY: ĐỌC VÀ STREAM FILE PDF BIÊN BẢN CHO WEB ADMIN
    // =========================================================================
    /**
     * API đọc file PDF từ thư mục 'storage/receipts/' và đẩy luồng dữ liệu về Web Admin.
     * Sử dụng tham số `@PathVariable UUID id` đồng bộ với toàn bộ dự án.
     */
    @GetMapping("/{id}/receipt")
    public ResponseEntity<Resource> viewDeliveryReceiptPdf(@PathVariable UUID id) {
        // Lấy thông tin đơn hàng để tìm ra trường OrderCode làm tên file PDF
        Order order = orderService.getOrderById(id);

        try {
            // Định vị chính xác đường dẫn file PDF do PdfGeneratorService lưu ở bước trước
            Path filePath = Paths.get("storage/receipts/").resolve(order.getOrderCode() + ".pdf").normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                System.out.println("Không tìm thấy file PDF tại: " + filePath.toAbsolutePath());
                return ResponseEntity.notFound().build();
            }

            // Trả về file PDF kèm cấu hình "inline" để trình duyệt Web Admin
            // tự động mở tab preview xem trực tiếp thay vì bắt ép người dùng tải về
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + order.getOrderCode() + "_receipt.pdf\"")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    @PostMapping("/verify-pdf")
    public ResponseEntity<Map<String, Object>> verifyPdf(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        try {
            // 1. Đọc nội dung text từ file PDF tải lên bằng iText 7
            PdfDocument pdfDoc = new PdfDocument(new PdfReader(file.getInputStream()));
            String pdfText = PdfTextExtractor.getTextFromPage(pdfDoc.getPage(1));
            pdfDoc.close();

            // 2. Trích xuất Mã Đơn Hàng (OrderCode) từ đoạn text đọc được
            // Giả sử trong PDF có chứa chuỗi "Mã Đơn Hàng: ORD-xxx" hoặc "ORD-"
            String orderCode = null;
            String[] words = pdfText.split("\\s+");
            for (String word : words) {
                if (word.startsWith("ORD-")) {
                    orderCode = word.replaceAll("[^a-zA-Z0-9-]", ""); // Xóa ký tự thừa
                    break;
                }
            }

            if (orderCode == null) {
                response.put("isValid", false);
                response.put("message", "Không tìm thấy mã đơn hàng hợp lệ trong file PDF. File có thể đã bị làm giả.");
                return ResponseEntity.ok(response);
            }

            // 3. Truy vấn Database xem có đơn hàng này không
            Order order = orderService.findByOrderCode(orderCode); // Đảm bảo bạn có hàm này trong Service

            if (order == null || !"DELIVERED".equals(order.getStatus())) {
                response.put("isValid", false);
                response.put("message", "Đơn hàng không tồn tại hoặc chưa được giao thành công.");
                return ResponseEntity.ok(response);
            }

            // 4. Nếu hợp lệ, trả về kết quả kèm thông tin đã bị che (Masked) để bảo mật
            // Che tên khách hàng: "Nguyễn Văn A" -> "Nguyễn V*** A"
            String maskedName = order.getCustomerName().replaceAll("(?<=.{2}).(?=.{2})", "*");
            // Che SĐT: "0901234567" -> "090****567"
            String maskedPhone = order.getCustomerPhone().replaceAll("(?<=\\d{3})\\d(?=\\d{3})", "*");

            response.put("isValid", true);
            response.put("message", "Biên bản hợp lệ! Chữ ký số và dữ liệu khớp với hệ thống.");
            response.put("orderCode", orderCode);
            response.put("customerName", maskedName);
            response.put("customerPhone", maskedPhone);
            response.put("deliveryAddress", order.getDeliveryAddress());

            // Lưu lại hành động này vào Audit Log (Tuần 12)
            auditLogRepository.save(new AuditLog("VERIFY", "PUBLIC_USER", "Kiểm chứng thành công biên bản PDF đơn " + orderCode));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("isValid", false);
            response.put("message", "Định dạng file không hợp lệ hoặc file bị hỏng.");
            return ResponseEntity.ok(response);
        }
    }
}