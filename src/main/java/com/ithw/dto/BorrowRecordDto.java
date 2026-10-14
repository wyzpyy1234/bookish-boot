package com.ithw.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@AllArgsConstructor
@Data
@NoArgsConstructor
public class BorrowRecordDto {
    private String keyword;
    private Integer categoryId;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer page;
    private Integer size;
    private Integer offset;
}
