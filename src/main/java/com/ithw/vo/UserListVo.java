package com.ithw.vo;

import lombok.Data;

import java.util.List;

/**
 * 7.15 用户列表的返回结构：{ total, page, size, list }
 */
@Data
public class UserListVo {
    private Integer total;
    private Integer page;
    private Integer size;
    private List<UserAdminVo> list;
}
