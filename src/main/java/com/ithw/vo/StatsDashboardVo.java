package com.ithw.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
@AllArgsConstructor
@NoArgsConstructor
@Data
public class StatsDashboardVo {
    private Integer bookCount;
    private Integer copyCount;
    private Integer borrowingCount;
    private Integer overdueCount;
    private Integer todayBorrowCount;
    private Integer readerCount;
    private BigDecimal unpaidFineTotal;
    private List<CategoryStats> categoryStats;
    private List<MonthlyStats> monthlyStats;

}
