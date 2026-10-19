package com.ithw.dto;

import lombok.Data;

/**
 * 8.7 编辑公告 的请求体：只传要改的字段
 * 上架/下架也走这个接口：传 {"status":0} 就是下架
 */
@Data
public class UpdateAnnouncementDto {
    private String  title;
    private String  content;
    private String  type;
    private Integer isTop;
    private Integer status;
}
