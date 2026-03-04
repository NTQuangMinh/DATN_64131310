CHƯƠNG 1: PHÂN TÍCH NGHIỆP VỤ GIAO NHẬN
1.1. Khảo sát hiện trạng quy trình giao nhận

Trong thực tế, quy trình giao nhận hàng hóa tại các đơn vị vận chuyển nhỏ và vừa thường diễn ra như sau:

Bộ phận điều phối tiếp nhận thông tin đơn hàng từ khách hoặc hệ thống bán hàng.

Điều phối viên nhập thông tin khách hàng, địa chỉ giao hàng và số điện thoại liên hệ.

Các đơn hàng trong ngày được tổng hợp và phân công cho tài xế.

Tài xế nhận danh sách đơn cần giao và di chuyển theo thứ tự tự sắp xếp.

Khi giao hàng thành công, tài xế yêu cầu khách ký tay vào phiếu giấy hoặc xác nhận miệng.

Sau khi kết thúc ngày làm việc, tài xế nộp lại biên bản cho công ty để đối soát.

Nhận xét về hiện trạng

Tuyến đường không được tối ưu → tốn thời gian, nhiên liệu.

Không có bằng chứng vị trí giao hàng chính xác.

Ảnh minh chứng thường không được lưu trữ tập trung.

Biên bản giấy có thể bị mất, sửa đổi.

Khi xảy ra tranh chấp rất khó chứng minh.

1.2. Các rủi ro và tranh chấp thường gặp

Hệ thống giao nhận truyền thống gặp các rủi ro sau:

1. Tranh chấp khách hàng

Khách phủ nhận đã nhận hàng.

Khách cho rằng hàng bị giao sai thời điểm.

2. Sai lệch thông tin vị trí

Tài xế báo đã giao nhưng không có chứng cứ GPS.

Không có lịch sử theo dõi lộ trình.

3. Gian lận hoặc chỉnh sửa biên bản

Biên bản giấy có thể bị sửa nội dung.

File PDF có thể bị chỉnh sửa nếu không có cơ chế bảo vệ.

4. Thiếu khả năng kiểm chứng công khai

Bên thứ ba không thể kiểm tra tính xác thực của biên bản.

1.3. Mục tiêu của hệ thống đề xuất

Hệ thống “Theo dõi giao hàng trên bản đồ kèm biên bản giao nhận ký số” được xây dựng nhằm:

Số hóa toàn bộ quy trình giao nhận.

Theo dõi tài xế theo thời gian thực trên bản đồ.

Tối ưu tuyến giao hàng dựa trên khoảng cách hoặc thời gian.

Ghi nhận bằng chứng giao hàng:

Thời gian

Vị trí GPS

Ảnh minh chứng

Tự động sinh biên bản giao nhận dạng PDF.

Ứng dụng chữ ký số để:

Đảm bảo tính toàn vẹn dữ liệu

Chống chỉnh sửa

Đảm bảo tính không thể chối bỏ (non-repudiation)

Cho phép verify công khai thông qua hệ thống.

1.4. Quy trình nghiệp vụ hệ thống đề xuất
1.4.1. Quy trình của Điều phối viên (Admin)

Đăng nhập hệ thống.

Tạo khách hàng và đơn hàng mới.

Nhập địa chỉ hoặc tọa độ giao hàng.

Chọn danh sách đơn trong ngày để lập tuyến.

Hệ thống gọi Routing API để đề xuất tuyến tối ưu.

Hiển thị tuyến trên bản đồ.

Gán tuyến cho tài xế.

Theo dõi trạng thái giao hàng theo thời gian thực.

Xem và kiểm tra biên bản đã ký số.

1.4.2. Quy trình của Tài xế (Mobile App)

Đăng nhập bằng tài khoản được cấp.

Nhận danh sách điểm giao theo tuyến đã được sắp xếp.

Khi đến điểm giao:

Nhấn “Check-in”

Hệ thống ghi nhận:

Thời gian

Vị trí GPS

Tài xế chụp ảnh minh chứng (1–2 ảnh)

Sau khi giao xong:

Chọn trạng thái:

Thành công

Thất bại

Nhập lý do nếu thất bại

Nhấn “Hoàn tất”

Hệ thống tự động:

Sinh biên bản PDF

Tạo hash SHA-256

Ký số bằng khóa riêng

Lưu chữ ký vào hệ thống

1.4.3. Quy trình Verify công khai

Người dùng tải lên file PDF hoặc quét mã QR.

Hệ thống:

Tính lại hash của nội dung

So sánh với hash đã lưu

Dùng public key để verify chữ ký

Hiển thị kết quả:

Hợp lệ (Valid)

Không hợp lệ (Invalid)

Chỉ hiển thị thông tin tối thiểu (không lộ dữ liệu nhạy cảm).

1.5. Yêu cầu bảo mật

Hệ thống áp dụng các cơ chế bảo mật sau:

1. JWT Authentication

Xác thực người dùng không trạng thái (stateless).

Token chứa vai trò (ROLE_ADMIN, ROLE_DRIVER).

2. Phân quyền

Admin: CRUD, lập tuyến, xem dashboard.

Driver: xem tuyến, check-in/out.

3. Bảo vệ dữ liệu đơn hàng

Không trả entity trực tiếp.

Sử dụng DTO.

Kiểm soát quyền truy cập theo vai trò.

4. Audit Log

Ghi nhận các hành động quan trọng:

Tạo tuyến

Gán tài xế

Check-in/out

Sinh biên bản

Verify

1.6. Mô hình kiến trúc hệ thống

Hệ thống được xây dựng theo mô hình 3 lớp (Three-tier Architecture):

Presentation Layer

Website Admin

Ứng dụng React Native cho tài xế

Business Logic Layer

Spring Boot REST API

Data Layer

PostgreSQL

Ngoài ra, hệ thống tích hợp Mashup với:

Routing API (OpenRouteService hoặc Google Directions)

Thư viện PDF

Thư viện ký số

1.7. Kết luận phần phân tích

Việc áp dụng bản đồ, GPS tracking và chữ ký số giúp:

Tăng tính minh bạch trong giao nhận.

Giảm tranh chấp.

Đảm bảo tính toàn vẹn dữ liệu.

Tạo nền tảng chuyển đổi số trong logistics.