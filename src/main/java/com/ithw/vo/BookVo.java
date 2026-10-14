package com.ithw.vo;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@NoArgsConstructor
public class BookVo {
    private Integer total;
    private Integer page;
    private Integer size;
    private List<BookItem> list;

}
