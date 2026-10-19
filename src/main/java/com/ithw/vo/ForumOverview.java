package com.ithw.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class ForumOverview {
    private Integer totalPosts;
    private Integer todayPosts;
    private Integer totalComments;
    private Integer myPosts;
    private Integer myComments;
    private Integer likeReceived;
    private Integer pendingPosts;
    private Integer pendingReports;
}
