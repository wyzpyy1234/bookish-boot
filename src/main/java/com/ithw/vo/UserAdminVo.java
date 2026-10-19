package com.ithw.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 7.15 用户列表 的单条记录
 * ⚠️ 绝对不要加 password 字段：管理页也不需要密码，返回出去就是安全事故。
 */
@Data
public class UserAdminVo {
    private Integer id;                 // 用户 id
    private String  username;           // 登录名
    private String  nickname;           // 昵称
    private String  phone;              // 手机号
    private String  avatar;             // 头像地址
    private String  role;               // reader / admin
    private Integer maxBorrow;          // 最多可借几本
    private LocalDateTime createTime;   // 注册时间

    private Integer status;             // 1正常 / 0禁言
    private LocalDateTime muteUntil;    // 禁言到什么时候（null=永久或未禁言）
    private String  muteReason;         // 禁言原因

    private Integer postCount;          // 发帖数（SQL 子查询算）
    private Integer commentCount;       // 评论数（SQL 子查询算）
    private Integer borrowingCount;     // 当前在借数（SQL 子查询算）
}
