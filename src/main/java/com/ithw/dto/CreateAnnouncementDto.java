package com.ithw.dto;

import lombok.Data;

/**
 * 8.6 发布公告 的请求体
 */
@Data
public class CreateAnnouncementDto {
    private String  title;    // 标题（必填，≤120）
    private String  content;  // 正文（必填）
    private String  type;     // notice（默认）/ rule / event，非法值存 notice
    private Integer isTop;    // 0/1，默认 0
    private Integer status;   // 1=直接发布（默认） / 0=先存草稿
}
