package com.ithw;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@MapperScan("com.ithw.dao")
@SpringBootApplication
public class BookishBootApplication {
// http://localhost:8080/login.html
    public static void main(String[] args) {
        SpringApplication.run(BookishBootApplication.class, args);
    }

}
