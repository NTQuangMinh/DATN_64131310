package com.quangminh.delivery.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Cho phép tất cả các API
                .allowedOrigins("http://localhost:5173") // CỔNG CỦA VITE (Bắt buộc đúng)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Cho phép các phương thức
                .allowedHeaders("*") // Cho phép tất cả các Header
                .allowCredentials(true); // Cho phép gửi kèm Token/Cookie
    }
}