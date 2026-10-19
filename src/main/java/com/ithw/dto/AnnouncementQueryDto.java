package com.ithw.dto;

import lombok.Data;

/**
 * 8.1 公告列表 的查询参数
 */
@Data
public class AnnouncementQueryDto {
    private String  keyword;     // 标题或正文包含
    private String  type;        // notice通知 / rule规则 / event活动
    private Boolean onlyUnread;  // true = 只看未读（参数名就是 onlyUnread）
    private Integer page;        // 默认 1
    private Integer size;        // 默认 10
}
