package com.ithw.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 8.1 / 8.2 一条公告
 */
@Data
public class AnnouncementVo {
    private Integer id;                 // 公告编号
    private Integer adminId;            // 发布人 id
    private String  adminName;          // 发布人昵称（JOIN users）
    private String  title;              // 标题
    private String  content;            // 正文（详情页给全文）
    private String  type;               // notice / rule / event
    private Integer isTop;              // 1=置顶
    private Integer status;             // 1已发布 / 0已下架 / -1已删除
    private LocalDateTime publishTime;  // 发布时间
    private LocalDateTime updateTime;   // 更新时间

    private String  excerpt;            // 正文前 80 字（SQL 算）
    private Boolean isRead;             // 我读过吗（前端给未读加小圆点）
    private Integer readCount;          // 已读人数（管理员看效果）
}
