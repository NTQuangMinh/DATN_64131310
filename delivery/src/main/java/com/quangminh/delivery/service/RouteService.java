package com.quangminh.delivery.service;

import com.quangminh.delivery.dto.RouteRequestDTO;
import com.quangminh.delivery.entity.Order;
import com.quangminh.delivery.entity.Route;
import com.quangminh.delivery.entity.RouteStop;
import com.quangminh.delivery.entity.User;
import com.quangminh.delivery.repository.OrderRepository;
import com.quangminh.delivery.repository.RouteRepository;
import com.quangminh.delivery.repository.RouteStopRepository;
import com.quangminh.delivery.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
public class RouteService {

    @Autowired
    private RouteRepository routeRepository;

    @Autowired
    private RouteStopRepository routeStopRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional // Đảm bảo nếu một bước lỗi thì toàn bộ quá trình sẽ được hoàn tác
    public Route createRoute(RouteRequestDTO dto) {
        // 1. Kiểm tra sự tồn tại của tài xế
        User driver = userRepository.findById(dto.getDriverId())
                .orElseThrow(() -> new RuntimeException("Tài xế không tồn tại!"));

        // 2. Khởi tạo một Tuyến đường mới
        Route route = new Route();
        route.setDriver(driver);
        route.setRouteDate(LocalDate.now());
        route.setRouteStatus("PENDING"); // Trạng thái ban đầu: Chờ xử lý
        route = routeRepository.save(route);

        // 3. Duyệt danh sách ID đơn hàng gửi lên để tạo các điểm dừng (Route Stops)
        for (int i = 0; i < dto.getOrderIds().size(); i++) {
            UUID orderId = dto.getOrderIds().get(i);
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng ID: " + orderId));

            // Tạo điểm dừng trong tuyến
            RouteStop stop = new RouteStop();
            stop.setRoute(route);
            stop.setOrder(order);
            stop.setStopOrder(i + 1); // Thứ tự giao hàng từ 1 đến n
            routeStopRepository.save(stop);

            // Cập nhật thông tin phân công vào Đơn hàng
            order.setStatus("ASSIGNED");
            order.setDriver(driver);
            order.setDeliverySequence(i + 1);
            orderRepository.save(order);
        }

        return route;
    }
}