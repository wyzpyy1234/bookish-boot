package com.ithw.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BorrowingHistoryList {
    private Integer id;
    private Integer readerId;
    private String readerName;
    private Integer copyId;
    private String barcode;
    private Integer bookId;
    private String bookTitle;
    private String bookAuthor;
    private String categoryName;
    private LocalDateTime borrowDate;
    private LocalDateTime dueDate;
    private LocalDateTime returnDate;
    private String status;
    private Boolean overdue;
    private Integer overdueDays;
    private Integer renewCount;
}
