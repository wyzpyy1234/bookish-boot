package com.ithw.pojo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ForumComment {
    private Integer id;
    private Integer postId;
    private Integer userId;
    private Integer parentId;
    private Integer replyToUserId;
    private String content;
    private Integer status;
    private LocalDateTime createTime;
}
