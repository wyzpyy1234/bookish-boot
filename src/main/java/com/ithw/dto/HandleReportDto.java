package com.ithw.dto;

import lombok.Data;

/**
 * 7.14 处理举报 的请求体
 */
@Data
public class HandleReportDto {
    private String  action;    // reject驳回举报 / hide隐藏内容 / delete删除内容 / mute隐藏内容+禁言作者
    private String  remark;    // 处理备注（≤200）
    private Integer muteDays;  // 仅 action=mute 用：1/3/7/30；不传=永久
}
