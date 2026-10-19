package com.ithw.dto;

import lombok.Data;

@Data
public class CreateCommentDto {
    private String  content;    // 评论内容（必填，≤1000 字）
    private Integer parentId;   // 回复哪条【一级评论】；不传 = 发一级评论
}