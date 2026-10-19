package com.ithw.dto;

import lombok.Data;

/**
 * 7.11 举报 的请求体
 */
@Data
public class CreateReportDto {
    private String  targetType;  // 举报的是"帖子"还是"评论"：post / comment
    private Integer targetId;    // 被举报的帖子 id 或评论 id
    private String  reasonType;  // spam广告 / abuse辱骂 / illegal违法 / other其他
    private String  reason;      // 补充说明（≤200 字）
}
