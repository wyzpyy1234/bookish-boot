package com.ithw.vo;

import lombok.Data;

import java.util.List;

/**
 * 7.13 举报列表的返回结构：{ total, page, size, list }
 */
@Data
public class ReportListVo {
    private Integer total;
    private Integer page;
    private Integer size;
    private List<ReportVo> list;
}
