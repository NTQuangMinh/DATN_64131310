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
                // 1. Cấu hình CORS sử dụng Bean ở dưới
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // 2. Disable CSRF (Bắt buộc cho API dùng JWT)
                .csrf(csrf -> csrf.disable())
                // 3. Quản lý Session là Stateless (Không lưu trạng thái server)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Cho phép các yêu cầu OPTIONS (Preflight request của CORS)
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Các URL công khai (Login, Swagger)
                        .requestMatchers("/api/auth/**", "/v3/api-docs/**", "/swagger-ui/**").permitAll()

                        // Endpoint Webhook từ DocuSign
                        .requestMatchers("/api/orders/docusign/webhook").permitAll()

                        // --- NHÓM QUYỀN CHO TÀI XẾ (VÀ ADMIN) ---
                        // QUAN TRỌNG: Đưa các endpoint cụ thể lên TRƯỚC endpoint chung /api/orders/**
                                .requestMatchers("/api/orders/stats").hasAnyRole("ADMIN", "DRIVER")
                                .requestMatchers("/api/orders/my-tasks").hasAnyRole("ADMIN", "DRIVER")

                                .requestMatchers("/api/orders/*/signing-url").hasAnyRole("ADMIN", "DRIVER")
                                .requestMatchers("/api/orders/*/complete").hasAnyRole("ADMIN", "DRIVER")
                                .requestMatchers("/api/orders/*/status").hasAnyRole("ADMIN", "DRIVER")
                                .requestMatchers("/api/orders/*/check-in").hasAnyRole("ADMIN", "DRIVER")
                                .requestMatchers("/api/orders/*/receipt").hasAnyRole("ADMIN")
                                .requestMatchers("/api/orders/*/report").hasAnyRole("ADMIN", "DRIVER")
                                .requestMatchers("/api/orders/verify-pdf").permitAll()

                                .requestMatchers("/api/orders/**").hasRole("ADMIN")
                                .requestMatchers("/api/routes/**").hasRole("ADMIN")

                        .anyRequest().authenticated()
                );

        // Thêm Filter kiểm tra JWT trước khi đến bước xác thực User
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // FIX: Cho phép tất cả các Origin để Mobile dễ dàng kết nối qua IP
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));

        // Cho phép đầy đủ các phương thức HTTP
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // FIX CHÍ MẠNG: Cho phép TẤT CẢ các Headers để tránh bị chặn 403 do thiếu Header custom
        configuration.setAllowedHeaders(Arrays.asList("*"));

        configuration.setAllowCredentials(true);

        // Cho phép Client truy cập được vào Header Authorization (nếu cần lấy token từ Header)
        configuration.setExposedHeaders(Arrays.asList("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}