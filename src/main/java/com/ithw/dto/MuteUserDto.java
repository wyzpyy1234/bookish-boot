package com.ithw.dto;

import lombok.Data;

/**
 * 7.16 禁言用户 的请求体
 */
@Data
public class MuteUserDto {
    private Integer days;    // 1/3/7/30；不传或 0 = 永久禁言
    private String  reason;  // 禁言原因（展示给被禁的人看，≤200）
}
