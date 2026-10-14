package com.ithw.vo;

import com.ithw.pojo.BookCopy;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
@AllArgsConstructor
@NoArgsConstructor
@Data
public class BookByIDVo {
    private Integer id;
    private String isbn;
    private String title;
    private String author;
    private String categoryName;
    private String publisherName;
    private String publisherAddress;
    private BigDecimal price;
    private LocalDateTime publishDate;
    private String intro;
    private String cover;
    private Integer totalCopies;
    private Integer availableCopies;
    private Integer borrowCount;
    private List<BookCopy>copies;
}
