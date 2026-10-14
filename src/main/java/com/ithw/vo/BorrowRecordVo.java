package com.ithw.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@AllArgsConstructor
@NoArgsConstructor
@Data
public class BorrowRecordVo {
    private Integer total;
    private Integer page;
    private Integer size;
    private List<BorrowRecordList> list;
}
