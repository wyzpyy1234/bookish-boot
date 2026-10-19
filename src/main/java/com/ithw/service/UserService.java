package com.ithw.service;
import com.ithw.dto.*;
import com.ithw.pojo.User;
import com.ithw.vo.*;

public interface UserService {
    void register(User user);
    User getUserByUserName(String username);


    User getById(Integer id);

    void updateAvatar(Integer id, String avatarUrl);

    /** 改密码：内部会校验原密码，不对就抛业务异常 */
    void changePassword(Integer id, String oldPassword, String newPassword);

    User updateProfile(UpdateProfileDto updateProfileDto,User user);

    ForumOverview getForumOverview(User loginUser);

    ForumListVo forumList(ForumListDto forumListDto, User loginUser);

    Integer postForum(CreatePostDto createPostDto, User loginUser);

    PostVo postDetails(Integer id,User user);

    void editForum(User user, Integer id, CreatePostDto createPostDto);

    void deleteForum(Integer id,User user);

    CommentListVo getComments(Integer id, Integer page, Integer size,User user);

    void reject(Integer id, RejectPostDto rejectPostDto);

    Integer postComment(CreateCommentDto createCommentDto, Integer id, User user);

    void deleteComment(Integer id,User user);

    // ==================== 论坛互动：点赞 / 举报 ====================
    LikeResultVo toggleLike(Integer postId, User user);

    Integer createReport(CreateReportDto dto, User user);

    // ==================== 论坛管理端 ====================
    void updatePostFlags(Integer id, PostFlagsDto dto);

    ReportListVo listReports(ReportQueryDto dto);

    void handleReport(Integer id, HandleReportDto dto, User admin);

    void approvePost(Integer id);

    // ==================== 用户管理端 ====================
    UserListVo listUsers(UserQueryDto dto);

    String muteUser(Integer id, MuteUserDto dto, User admin);

    void unmuteUser(Integer id);

    // ==================== 公告 ====================
    AnnouncementListVo listAnnouncements(AnnouncementQueryDto dto, User user);

    AnnouncementVo getAnnouncement(Integer id, User user);

    void markRead(Integer id, User user);

    void markAllRead(User user);

    Integer unreadCount(User user);

    Integer createAnnouncement(CreateAnnouncementDto dto, User admin);

    void updateAnnouncement(Integer id, UpdateAnnouncementDto dto);

    void deleteAnnouncement(Integer id);
}
