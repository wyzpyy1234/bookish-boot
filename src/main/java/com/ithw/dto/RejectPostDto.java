package com.ithw.dto;

import lombok.Data;

@Data
public class RejectPostDto {
    private String reason;   // 驳回理由（作者能看到，≤200 字；不传落默认"内容不符合社区规范"）
}