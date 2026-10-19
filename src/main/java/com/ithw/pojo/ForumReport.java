package com.ithw.pojo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ForumReport {
    private Integer id;
    private String targetType;
    private Integer targetId;
    private Integer reporterId;
    private String reasonType;
    private String reason;
    private Integer status;
    private Integer handleBy;
    private LocalDateTime handleTime;
    private String handleAction;
    private String handleRemark;
    private LocalDateTime createTime;
}
