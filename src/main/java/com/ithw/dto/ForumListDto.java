package com.ithw.dto;

import lombok.Data;

@Data
public class ForumListDto {
    private Integer status;
    private String keyword;
    private String tag;
    private String sort;
    private Boolean mine;
    private Boolean essenceOnly;
    private Integer page;
    private Integer size;

}
