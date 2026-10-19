package com.ithw.vo;

import lombok.Data;

import java.util.List;

/**
 * 8.1 公告列表的返回结构：{ total, page, size, list }
 */
@Data
public class AnnouncementListVo {
    private Integer total;
    private Integer page;
    private Integer size;
    private List<AnnouncementVo> list;
}
