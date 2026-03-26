package com.quangminh.delivery.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. Cấu hình CORS tích hợp vào Security
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // 2. Disable CSRF vì dùng JWT
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Cho phép yêu cầu OPTIONS (Preflight request) đi qua không cần auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers("/api/auth/**", "/v3/api-docs/**", "/swagger-ui/**").permitAll()

                        // --- ƯU TIÊN: CÁC API CHO TÀI XẾ PHẢI ĐẶT TRƯỚC ---

                        // Lấy danh sách nhiệm vụ của tôi
                        .requestMatchers("/api/orders/my-tasks").hasAnyRole("ADMIN", "DRIVER")

                        // Hoàn tất đơn hàng (có chứa ID đơn hàng trong path)
                        .requestMatchers("/api/orders/*/complete").hasAnyRole("ADMIN", "DRIVER")

                        // Xem báo cáo/biên bản (Tuần 10)
                        .requestMatchers("/api/orders/*/report").hasAnyRole("ADMIN", "DRIVER")

                        // --- SAU ĐÓ MỚI ĐẾN CÁC API QUẢN TRỊ CỦA ADMIN ---

                        // Tất cả các path còn lại của orders và routes chỉ Admin mới được vào
                        .requestMatchers("/api/orders/**").hasRole("ADMIN")
                        .requestMatchers("/api/routes/**").hasRole("ADMIN")

                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    // 3. Định nghĩa chi tiết các nguồn (Origins) được phép truy cập
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 1. Dùng OriginPatterns thay vì Origins để tránh lỗi mâu thuẫn với Credentials
        configuration.setAllowedOriginPatterns(Arrays.asList(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://localhost:5173" // Cổng mặc định của Vite/React
        ));

        // 2. Cho phép đầy đủ các Method
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // 3. Cho phép các Header cần thiết cho JWT
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Cache-Control", "X-Requested-With"));

        // 4. Cho phép gửi Credentials (Cookie, Auth Header)
        configuration.setAllowCredentials(true);

        // 5. Expose header Authorization để Frontend có thể đọc Token
        configuration.setExposedHeaders(Arrays.asList("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}