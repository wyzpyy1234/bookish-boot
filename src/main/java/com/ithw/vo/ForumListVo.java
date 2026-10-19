package com.ithw.vo;

import lombok.Data;

import java.util.List;

@Data
public class ForumListVo {
    private Integer total;
    private Integer page;
    private Integer size;
    private List<PostVo> list;
}
