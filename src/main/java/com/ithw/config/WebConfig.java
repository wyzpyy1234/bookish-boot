package com.ithw.config;

import com.ithw.interceptor.LoginInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Value("${bookish-boot.upload.dir:./uploads}")
    private String uploadDir;
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new LoginInterceptor())
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/login", "/api/register");   // ⚠️ 必须放行，否则登录接口自己被拦死
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        File dir = new File(uploadDir).getAbsoluteFile();
        String location = "file:"+dir.getAbsolutePath().replace("\\","/")+"/";
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }
}
