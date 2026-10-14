package com.ithw.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
@AllArgsConstructor
@NoArgsConstructor
@Data
public class InsertBookDto {
    private String isbn;
    private String title;
    private String author;
    private Integer categoryId;
    private Integer publisherId;
    private BigDecimal price;
    private LocalDate publishDate;
    private String intro;
    private Integer copyCount;
}
