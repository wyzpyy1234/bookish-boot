package com.ithw.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BorrowingHistoryVo {
    private Integer total;
    private Integer page;
    private Integer size;
    private List<BorrowingHistoryList> list;
}
