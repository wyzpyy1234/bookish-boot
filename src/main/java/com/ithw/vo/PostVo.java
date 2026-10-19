package com.ithw.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class PostVo {
    private Integer id;
    private Integer userId;
    private String title;
    private String content;
    private String tag;
    private List<String> images;
    private Integer isTop;
    private Integer isEssence;
    private Integer isLocked;
    private Integer status;
    private String rejectReason;
    private Integer viewCount;
    private Integer likeCount;
    private Integer commentCount;
    private LocalDateTime createTime;
    private LocalDateTime lastReplyTime;
    private String excerpt;
    private Integer authorId;
    private String authorName;
    private String authorAvatar;
    private String authorRole;
    private Boolean liked;
    private Integer canEdit;
    private Integer canDelete;
    private Integer canReport;
    private Integer isAdmin;
}
