package com.ithw.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@AllArgsConstructor
@NoArgsConstructor
@Data
public class Book {
    private Integer id;
    private String isbn;
    private String title;
    private String author;
    private Integer categoryId;
    private Integer publisherId;
    private BigDecimal price;
    private LocalDate publishDate;
    private String intro;
    private String cover;
    private LocalDateTime createTime;
}
