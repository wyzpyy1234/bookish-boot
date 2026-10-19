package com.ithw.dto;

import lombok.Data;

/**
 * 7.12 帖子管理操作：置顶 / 加精 / 锁定 / 隐藏
 * 只传要改的字段，不传 = 不改（SQL 用 <if> 包起来）
 */
@Data
public class PostFlagsDto {
    private Integer isTop;      // 1=置顶 / 0=取消置顶
    private Integer isEssence;  // 1=加精 / 0=取消加精
    private Integer isLocked;   // 1=锁定 / 0=解锁
    private Integer status;     // 0=隐藏 / 1=恢复 / -1=软删
}
