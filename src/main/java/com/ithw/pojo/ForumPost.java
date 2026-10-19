package com.ithw.pojo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ForumPost {
    private Integer id;
    private Integer userId;
    private String title;
    private String content;
    private String tag;
    private Integer isTop;
    private Integer isEssence;
    private Integer isLocked;
    private Integer status;
    private Integer viewCount;
    private Integer likeCount;
    private Integer commentCount;
    private LocalDateTime lastReplyTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private String rejectReason;
}
