package com.ithw.pojo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AnnouncementRead {
    private Integer id;
    private Integer announcementId;
    private Integer userId;
    private LocalDateTime readTime;
}
