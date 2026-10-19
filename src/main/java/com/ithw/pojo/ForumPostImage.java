package com.ithw.pojo;

import lombok.Data;

@Data
public class ForumPostImage {
    private Integer id;
    private Integer postId;
    private String url;
    private Integer sortNo;
}
