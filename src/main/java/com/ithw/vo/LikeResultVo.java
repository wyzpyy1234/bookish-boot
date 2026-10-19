package com.ithw.vo;

import lombok.Data;

/**
 * 7.10 点赞 / 取消点赞 的返回
 */
@Data
public class LikeResultVo {
    /** 操作后我到底赞没赞：true=已赞，false=已取消 */
    private Boolean liked;
    /** 操作后的最新点赞总数（前端立刻更新数字用） */
    private Integer likeCount;
}
