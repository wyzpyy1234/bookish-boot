package com.ithw.pojo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Announcement {
    private Integer id;
    private Integer adminId;
    private String title;
    private String content;
    private String type;
    private Integer isTop;
    private Integer status;
    private LocalDateTime publishTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
