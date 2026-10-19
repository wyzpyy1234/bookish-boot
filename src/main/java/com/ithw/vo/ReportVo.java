package com.ithw.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 7.13 举报列表 的单条记录
 * 前 12 个字段直接来自 forum_report；targetTitle/targetExcerpt/targetStatus/authorId/authorName
 * 是 Service 按 targetType 去论坛帖子/评论表里补的。
 */
@Data
public class ReportVo {
    private Integer id;                 // 举报编号
    private String  targetType;         // 举报对象类型：post / comment
    private Integer targetId;           // 被举报对象 id
    private Integer reporterId;         // 举报人 id
    private String  reporterName;       // 举报人昵称（JOIN users）
    private String  reasonType;         // 举报类型
    private String  reason;             // 举报补充说明
    private Integer status;             // 0待处理 1已处理 2已驳回
    private Integer handleBy;           // 处理人（管理员 id）
    private LocalDateTime handleTime;   // 处理时间
    private String  handleAction;       // 处理动作
    private String  handleRemark;       // 处理备注
    private LocalDateTime createTime;   // 举报时间

    private String  targetTitle;        // 被举报帖子标题（评论没有标题，给空串）
    private String  targetExcerpt;      // 被举报内容前 80 字
    private Integer targetStatus;       // 被举报对象当前状态
    private Integer authorId;           // 被举报内容的作者 id
    private String  authorName;         // 被举报内容的作者昵称
}
