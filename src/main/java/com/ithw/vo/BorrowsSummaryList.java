package com.ithw.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
@AllArgsConstructor
@NoArgsConstructor
@Data
public class BorrowsSummaryList {
    private Integer borrowing;
    private Integer overdue;
    private Integer returned;
    private BigDecimal unpaidFine;
}
