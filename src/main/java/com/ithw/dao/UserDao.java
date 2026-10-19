package com.ithw.dao;
import com.ithw.dto.*;
import com.ithw.pojo.*;
import com.ithw.vo.*;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface UserDao {
    void register(User user);

    User getUserByUserName(@Param("username") String username);

    User getById(@Param("id") Integer id);

    void updateAvatar(@Param("id") Integer id, @Param("avatar") String avatar);

    void updatePassword(@Param("id") Integer id, @Param("password") String password);

    void updateProfile(@Param("updatePd") UpdateProfileDto updateProfileDto, @Param("id") Integer id);


    @Select("SELECT COUNT(*) FROM forum_post WHERE status = 1")
    Integer getTotalPosts();
    @Select("SELECT COUNT(*) FROM forum_post WHERE status = 1 and DATE(create_time) = CURDATE()")
    Integer getTodayPosts();
    @Select("SELECT COUNT(*) FROM forum_comment WHERE status = 1")
    Integer getTotalComments();
    @Select("SELECT COUNT(*) FROM forum_post WHERE user_id=#{id} AND status=1")
    Integer getMyPosts(Integer id);
    @Select("SELECT COUNT(*) FROM forum_comment WHERE user_id=#{id} AND status=1")
    Integer getMyComments(Integer id);
    @Select("SELECT IFNULL(SUM(like_count),0) FROM forum_post WHERE user_id=#{id}")
    Integer getLikeReceived(Integer id);
    @Select("SELECT COUNT(*) FROM forum_post WHERE status = 0")
    Integer getPendingPosts();
    @Select("SELECT COUNT(*) FROM forum_report WHERE status = 0")
    Integer getPendingReports();

    List<PostVo> forumList(@Param("dto") ForumListDto dto,
                           @Param("id") Integer id,
                           @Param("isAdmin") boolean isAdmin,
                           @Param("offset") int offset,
                           @Param("size") int size);

    Integer forumListGetTotal(@Param("dto") ForumListDto dto,
                              @Param("id") Integer id,
                              @Param("isAdmin") boolean isAdmin);

    List<String> listPostImages(@Param("postId") Integer postId);

    // 我有没有举报过这条帖
    Integer hasReported(@Param("postId") Integer postId, @Param("userId") Integer userId);

    void postForum(ForumPost post);

    void postForumImage(@Param("postId") Integer postId,
                        @Param("url") String url,
                        @Param("sortNo") Integer sortNo);

    PostVo postDetails(@Param("id")Integer id,
                       @Param("user") User user);


    void updateViewCount(Integer id);


    int isLocked(Integer id);

    void editForum(@Param("id") Integer id, @Param("createPostDto")CreatePostDto createPostDto);

    void deleteImage(Integer id);


    void updateSR(@Param("status")int status, @Param("reject")String reject,@Param("id")Integer id);

    void deleteForum(Integer id);

    int getCommentTotal(@Param("postId") Integer postId);

    /** 一级评论（分页） */
    List<CommentVo> listRootComments(@Param("postId") Integer postId,
                                     @Param("offset") int offset,
                                     @Param("size") int size);

    /** 这批一级评论下的全部回复（不分页） */
    List<CommentVo> listRepliesByParentIds(@Param("parentIds") List<Integer> parentIds);

    int reject(@Param("id") Integer id, @Param("reason") String reason);

    ForumComment selectForumCommentById(Integer id);

    void insertComment(ForumComment comment);

    void addCommentCount(Integer id);

    Integer countKids(Integer id);

    void updateComment(Integer id);

    void updateKids(@Param("postId") Integer postId, @Param("kids") Integer kids);

    // ==================== 7.10 点赞 ====================
    ForumLike findLike(@Param("postId") Integer postId, @Param("userId") Integer userId);

    void insertLike(@Param("postId") Integer postId, @Param("userId") Integer userId);

    void deleteLike(@Param("postId") Integer postId, @Param("userId") Integer userId);

    void incLikeCount(@Param("postId") Integer postId);

    void decLikeCount(@Param("postId") Integer postId);

    Integer getLikeCount(@Param("postId") Integer postId);

    // ==================== 帖子基础查询 / 管理标记 ====================
    /** 只查判权限要用的几列（比 postDetails 轻得多） */
    ForumPost selectPostById(@Param("id") Integer id);

    void updatePostFlags(@Param("id") Integer id, @Param("dto") PostFlagsDto dto);

    // ==================== 7.11 举报 ====================
    Integer countReport(@Param("targetType") String targetType,
                        @Param("targetId") Integer targetId,
                        @Param("userId") Integer userId);

    void insertReport(ForumReport report);

    // ==================== 7.13 举报列表 ====================
    Integer countReports(@Param("dto") ReportQueryDto dto);

    List<ReportVo> listReports(@Param("dto") ReportQueryDto dto,
                               @Param("offset") int offset,
                               @Param("size") int size);

    List<ReportTargetVo> listReportPostTargets(@Param("ids") List<Integer> ids);

    List<ReportTargetVo> listReportCommentTargets(@Param("ids") List<Integer> ids);

    ForumReport selectReportById(@Param("id") Integer id);

    // ==================== 7.14 处理举报 ====================
    void updatePostStatus(@Param("id") Integer id, @Param("status") Integer status);

    void updateCommentStatus(@Param("id") Integer id, @Param("status") Integer status);

    void updateReportHandle(@Param("id") Integer id,
                            @Param("status") Integer status,
                            @Param("handleBy") Integer handleBy,
                            @Param("handleAction") String handleAction,
                            @Param("handleRemark") String handleRemark);

    // ==================== 7.15 用户列表 ====================
    Integer countUsers(@Param("dto") UserQueryDto dto);

    List<UserAdminVo> listUsers(@Param("dto") UserQueryDto dto,
                                @Param("offset") int offset,
                                @Param("size") int size);

    // ==================== 7.16 / 7.17 禁言 ====================
    void muteUser(@Param("id") Integer id, @Param("days") Integer days, @Param("reason") String reason);

    void unmuteUser(@Param("id") Integer id);

    // ==================== 7.18 审核通过 ====================
    int approvePost(@Param("id") Integer id);

    // ==================== 8.x 公告 ====================
    Integer countAnnouncements(@Param("dto") AnnouncementQueryDto dto,
                               @Param("isAdmin") boolean isAdmin,
                               @Param("me") Integer me);

    List<AnnouncementVo> listAnnouncements(@Param("dto") AnnouncementQueryDto dto,
                                           @Param("isAdmin") boolean isAdmin,
                                           @Param("me") Integer me,
                                           @Param("offset") int offset,
                                           @Param("size") int size);

    AnnouncementVo getAnnouncement(@Param("id") Integer id, @Param("me") Integer me);

    Announcement selectAnnouncementById(@Param("id") Integer id);

    void markRead(@Param("id") Integer id, @Param("me") Integer me);

    void markAllRead(@Param("me") Integer me);

    Integer unreadCount(@Param("me") Integer me);

    void insertAnnouncement(Announcement announcement);

    void updateAnnouncement(@Param("id") Integer id, @Param("dto") UpdateAnnouncementDto dto);

    void deleteAnnouncement(@Param("id") Integer id);
}
