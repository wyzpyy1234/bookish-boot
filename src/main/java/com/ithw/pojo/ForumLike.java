package com.ithw.pojo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ForumLike {
    private Integer id;
    private Integer postId;
    private Integer userId;
    private LocalDateTime createTime;
}
