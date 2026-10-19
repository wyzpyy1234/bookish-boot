package com.ithw.dto;

import lombok.Data;

/**
 * 7.13 举报列表 的查询参数
 */
@Data
public class ReportQueryDto {
    private Integer status;      // 0待处理 / 1已处理 / 2已驳回；不传=全部
    private String  targetType;  // post / comment；不传=全部
    private Integer page;        // 默认 1
    private Integer size;        // 默认 10
}
