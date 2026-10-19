package com.ithw.dto;

import lombok.Data;

/**
 * 7.15 用户列表 的查询参数
 */
@Data
public class UserQueryDto {
    private String  keyword;  // 匹配 username 或 nickname
    private String  role;     // reader / admin
    private Integer status;   // 0禁言中 / 1正常
    private Integer page;     // 默认 1
    private Integer size;     // 默认 10
}
