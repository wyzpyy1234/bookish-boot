package com.ithw.vo;

import lombok.Data;

/**
 * 举报列表的"被举报内容"信息（内部用，不直接返回给前端）
 * 帖子、评论两张表查出来的形状不一样，先统一成这个，再往 ReportVo 里塞。
 */
@Data
public class ReportTargetVo {
    private Integer id;         // 帖子 id 或评论 id
    private String  title;      // 帖子标题（评论为 null）
    private String  excerpt;    // 内容前 80 字
    private Integer status;     // 当前状态
    private Integer authorId;   // 作者 id
    private String  authorName; // 作者昵称
}
