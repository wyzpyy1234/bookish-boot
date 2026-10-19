package com.ithw.vo;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CommentVo {
    private Integer id;               // 评论编号
    private String  content;          // 评论内容
    private Integer parentId;         // 它回复的【一级评论】id；一级评论本身是 null
    private Integer userId;           // 评论人 id
    private String  userName;         // 评论人昵称（JOIN users）
    private String  userAvatar;       // 评论人头像（JOIN users）
    private String  userRole;         // 评论人角色（JOIN users）
    private Integer replyToUserId;    // 被回复的人 id（显示"回复 @某某"用）
    private String  replyToUserName;  // 被回复的人昵称
    private LocalDateTime createTime; // 评论时间
    private Integer canDelete;        // 我能不能删它（0/1，Service 算：我是作者 或 admin）
    private List<CommentVo> children; // 它的二级回复（一级评论才有；二级评论这里是空/不填）
}
