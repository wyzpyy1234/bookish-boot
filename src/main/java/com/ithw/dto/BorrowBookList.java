package com.ithw.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BorrowBookList {
    private String status;
    private Integer page;
    private Integer size;
    private Integer readerId;
}
