package com.ithw.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookItem{
    private Integer id;
    private String isbn;
    private String title;
    private String author;
    private Integer categoryId;
    private String categoryName;
    private Integer publisherId;
    private String publisherName;
    private BigDecimal price;
    private LocalDateTime publishDate;
    private String intro;
    private String cover;
    private Integer totalCopies;
    private Integer availableCopies;
    private Integer borrowCount;
}
