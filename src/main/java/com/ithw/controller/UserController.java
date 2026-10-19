package com.ithw.controller;

import com.ithw.dto.*;
import com.ithw.pojo.*;
import com.ithw.service.UserService;
import com.ithw.vo.*;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.ibatis.annotations.Param;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class UserController {
    private static final Log log = LogFactory.getLog(UserController.class);
    @Value("${bookish-boot.upload.dir:./uploads}")
    private String uploadDir;
    private UserService userService;
    public UserController(UserService userService){
        this.userService = userService;
    }
    @PostMapping("/register")
    public Result<Void> register(@RequestBody RegisterUserVo userVo){
        User user = new User();
        if ((userVo.getPassword() == null|| userVo.getUsername()==null ||userVo.getNickname()==null)
                || userVo.getPassword().length()<6){
            return Result.fail(ResultCode.PARAM_ERROR,ResultCode.PARAM_ERROR_MSG);
        }
        BeanUtils.copyProperties(userVo, user);
        user.setRole("reader");
        user.setMaxBorrow(5);
        if(userService.getUserByUserName(user.getUsername())!=null){
            return Result.fail(ResultCode.ACCOUNT_EXIST,ResultCode.ACCOUNT_EXIST_MSG);
        }
        userService.register(user);
        return Result.success();
    }

    @PostMapping("/login")
    public Result<ResultToken> login(@RequestBody LoginUserDto loginUserDto){
        if (loginUserDto.getUsername() == null||loginUserDto.getPassword() == null) {
            return Result.fail(ResultCode.PARAM_ERROR,ResultCode.PARAM_ERROR_MSG);
        }
        LoginUserVo loginUserVo = new LoginUserVo();
        String uuid = UUID.randomUUID().toString();
        User user1 =  userService.getUserByUserName(loginUserDto.getUsername());
        if (user1 == null){
            return Result.fail(ResultCode.USER_NOT_EXIST,ResultCode.USER_NOT_EXIST_MSG);
        }
        if (!user1.getPassword().equals(loginUserDto.getPassword())) {
            return Result.fail(ResultCode.PASSWORD_ERROR,ResultCode.PASSWORD_ERROR_MSG);
        }
        BeanUtils.copyProperties(user1,loginUserVo);
        TokenUtils.setToken(uuid,user1);

        return Result.success(new ResultToken(uuid,loginUserVo));
    }

    @PostMapping("/logout")
    public Result<Void> logout(HttpServletRequest request){
        String token = request.getHeader("Authorization");
        TokenUtils.removeToken(token);
        return Result.success();
    }

    @GetMapping("/user/profile")
    public Result<User> profile(HttpServletRequest request) {
        User loginUser = (User) request.getAttribute("loginUser");
        User db = userService.getById(loginUser.getId());
        if (db == null) {
            return Result.fail(ResultCode.USER_NOT_EXIST, ResultCode.USER_NOT_EXIST_MSG);
        }
        db.setPassword(null);          // ★ 绝对不能把密码吐给前端
        return Result.success(db);
    }

    /** 上传头像 */
    @PostMapping("/user/avatar")
    public Result<Map<String, String>> uploadAvatar(@RequestParam("file") MultipartFile file,
                                                    HttpServletRequest request) throws IOException {
        if (file == null || file.isEmpty()) {
            return Result.fail(ResultCode.PARAM_ERROR, "请选择要上传的图片");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return Result.fail(ResultCode.PARAM_ERROR, "只能上传图片");
        }
        if (file.getSize() > 2 * 1024 * 1024) {
            return Result.fail(ResultCode.PARAM_ERROR, "图片不能超过 2MB");
        }

        // 1) 文件名：UUID + 白名单扩展名（不要用用户传来的原文件名，原因见第 8 节）
        String fileName = UUID.randomUUID().toString().replace("-", "") + extensionOf(file.getOriginalFilename());

        // 2) 落盘。★ 必须 getAbsoluteFile()：
        //    file.transferTo() 对相对路径是相对【临时目录】解析的，会存到你意想不到的地方
        File dir = new File(uploadDir, "avatar").getAbsoluteFile();
        if (!dir.exists() && !dir.mkdirs()) {
            return Result.fail(ResultCode.SERVICE_ERROR, "创建上传目录失败");
        }
        File dest = new File(dir, fileName);
        file.transferTo(dest);

        String url = "/uploads/avatar/" + fileName;

        User loginUser = (User) request.getAttribute("loginUser");
        String oldAvatar = loginUser.getAvatar();

        userService.updateAvatar(loginUser.getId(), url);
        deleteOldAvatar(oldAvatar);         // 删掉上一张，别让磁盘无限长

        // 3) ★★ 这一步最容易漏：
        //    TokenUtils 里存的是【User 对象的快照】，不改它的话，
        //    本次会话后续请求从拦截器拿到的还是旧对象（avatar 仍是 null）
        User fresh = userService.getById(loginUser.getId());
        if (fresh != null) {
            fresh.setPassword(null);
            TokenUtils.setToken(request.getHeader("Authorization"), fresh);
        }

        Map<String, String> data = new HashMap<>();
        data.put("avatar", url);
        return Result.success(data);
    }

    /** 删除头像（恢复默认） */
    @DeleteMapping("/user/avatar")
    public Result<Void> removeAvatar(HttpServletRequest request) {
        User loginUser = (User) request.getAttribute("loginUser");
        userService.updateAvatar(loginUser.getId(), null);
        deleteOldAvatar(loginUser.getAvatar());

        User fresh = userService.getById(loginUser.getId());
        if (fresh != null) {
            fresh.setPassword(null);
            TokenUtils.setToken(request.getHeader("Authorization"), fresh);
        }
        return Result.success();
    }

    /** 修改密码 */
    @PutMapping("/user/password")
    public Result<Void> changePassword(@RequestBody ChangePasswordDto dto, HttpServletRequest request) {
        if (dto == null || dto.getOldPassword() == null || dto.getNewPassword() == null) {
            return Result.fail(ResultCode.PARAM_ERROR, ResultCode.PARAM_ERROR_MSG);
        }
        User loginUser = (User) request.getAttribute("loginUser");
        userService.changePassword(loginUser.getId(), dto.getOldPassword(), dto.getNewPassword());

        // 密码变了，把当前 token 作废，强制重新登录
        TokenUtils.removeToken(request.getHeader("Authorization"));
        return Result.success();
    }

    /* ==================== 上传辅助 ==================== */

    /** 只接受白名单扩展名，其余一律当成 .png —— 防的是传个 .jsp/.svg 上来 */
    private static String extensionOf(String originalFilename) {
        if (originalFilename == null) return ".png";
        int i = originalFilename.lastIndexOf('.');
        if (i < 0 || i == originalFilename.length() - 1) return ".png";
        String ext = originalFilename.substring(i).toLowerCase();
        return ext.matches("\\.(jpg|jpeg|png|gif|webp|bmp)") ? ext : ".png";
    }

    /** 删掉上一张头像文件（只删自己上传的，别误删外链） */
    private void deleteOldAvatar(String oldUrl) {
        if (oldUrl == null || !oldUrl.startsWith("/uploads/")) return;
        File old = new File(uploadDir, oldUrl.substring("/uploads/".length())).getAbsoluteFile();
        if (old.isFile() && !old.delete()) {
            log.warn("旧头像删除失败: " + old.getAbsolutePath());
        }
    }

    @PutMapping("user/profile")
    public Result<User> updateProfile(@RequestBody UpdateProfileDto updateProfileDto, HttpServletRequest request) {
        User loginUser = (User) request.getAttribute("loginUser");
        if (loginUser == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        if (updateProfileDto.getNickname() == null||updateProfileDto.getNickname().length()>20) {
            return Result.fail(ResultCode.FIELD_OUT_OF_RANGE,ResultCode.FIELD_OUT_OF_RANGE_MSG);
        }
        if (updateProfileDto.getPhone().length()>11 || !updateProfileDto.getPhone().matches("^1\\d{10}$")) {
            return Result.fail(ResultCode.FIELD_OUT_OF_RANGE, ResultCode.FIELD_OUT_OF_RANGE_MSG);
        }
        User dbUser = userService.updateProfile(updateProfileDto,loginUser);
        return Result.success(dbUser);
    }

    @PostMapping("/upload")
    public Result<Map<String,String>> fileUpload(@RequestParam(required = false) String type,@RequestParam MultipartFile file
    ,HttpServletRequest request) throws IOException {
        User loginUser = (User) request.getAttribute("loginUser");
        if (file == null || file.isEmpty()) {
            return Result.fail(ResultCode.PARAM_ERROR, "请选择要上传的图片");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return Result.fail(ResultCode.PARAM_ERROR, "只能上传图片");
        }
        if (file.getSize() > 2 * 1024 * 1024) {
            return Result.fail(ResultCode.PARAM_ERROR, "图片不能超过 2MB");
        }
        // 1) 文件名：UUID + 白名单扩展名（不要用用户传来的原文件名，原因见第 8 节）

        String fileName = UUID.randomUUID().toString().replace("-", "") + extensionOf(file.getOriginalFilename());
        File dir = new File(uploadDir,"forum/"+loginUser.getUsername()).getAbsoluteFile();
        if (!dir.exists() && !dir.mkdirs()) {
            return Result.fail(ResultCode.SERVICE_ERROR, "创建上传目录失败");
        }
        File dest = new File(dir, fileName);
        file.transferTo(dest);
        String url = "/uploads/forum/" +loginUser.getUsername()+"/"+ fileName;
        Map<String, String> data = new HashMap<>();
        data.put("url", url);
        return Result.success(data);

    }

    @GetMapping("/forum/stats")
    public Result<ForumOverview> getForumOverview(HttpServletRequest request) {
        User loginUser = (User) request.getAttribute("loginUser");
        if (loginUser == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }

        ForumOverview overview = userService.getForumOverview(loginUser);
        return Result.success(overview);
    }

    @GetMapping("/forum/posts")
    public Result<ForumListVo> forumList(ForumListDto forumListDto,HttpServletRequest request){
        User loginUser = (User) request.getAttribute("loginUser");
        if (loginUser == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        ForumListVo forumListVo = userService.forumList(forumListDto,loginUser);
        return Result.success(forumListVo);
    }

    @PostMapping("/forum/posts")
    public Result<Map<String,Integer>>postForum(HttpServletRequest request,@RequestBody CreatePostDto createPostDto){
        User loginUser = (User) request.getAttribute("loginUser");
        if (loginUser == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        Integer i = userService.postForum(createPostDto, loginUser);
        Map<String,Integer> map = new HashMap<>();
        map.put("id",i);
        return Result.success(map);
    }

    @GetMapping("/forum/posts/{id}")
    public Result<PostVo>postDetails(@PathVariable Integer id,HttpServletRequest request){
        User loginUser = (User) request.getAttribute("loginUser");
        PostVo postVo = userService.postDetails(id,loginUser);
        return Result.success(postVo);
    }

    // 编辑帖子
    @PutMapping("/forum/posts/{id}")
    public Result<Void> editForum(HttpServletRequest request, @PathVariable Integer id,@RequestBody CreatePostDto createPostDto) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        userService.editForum(user,id,createPostDto);
        return Result.success(null);
    }

    // 删除帖子
    @DeleteMapping("/forum/posts/{id}")
    public Result<Void> deleteForum(@PathVariable Integer id,HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        userService.deleteForum(id,user);
        return Result.success(null);
    }

    // 评论列表
    @GetMapping("/forum/posts/{id}/comments")
    public Result<CommentListVo> getComments(@PathVariable Integer id,Integer page,Integer size,HttpServletRequest request) {
        User user = (User)request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        CommentListVo commentListVo = userService.getComments(id,page,size,user);
        return Result.success(commentListVo);
    }

    // 发表评论
    @PostMapping("/forum/posts/{id}/comments")
    public Result<Map<String,Integer>> postComment(@RequestBody CreateCommentDto createCommentDto
            ,@PathVariable Integer id,HttpServletRequest request) {
        User user = (User)request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        Map<String,Integer> map = new HashMap<>();
        Integer id1 = userService.postComment(createCommentDto,id,user);
        map.put("id",id1);
        return Result.success(map);
    }

    // 删除评论
    @DeleteMapping("/forum/comments/{id}")
    public Result<Void> deleteComment(@PathVariable Integer id ,HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        userService.deleteComment(id,user);
        return Result.success(null);
    }



    // 7.19 驳回帖子（admin）
    @PostMapping("forum/admin/posts/{id}/reject")
    public Result<Void> reject(@PathVariable Integer id,
                               @RequestBody RejectPostDto rejectPostDto,
                               HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        userService.reject(id, rejectPostDto);
        return Result.success(null);
    }


    // ==================== 7.10 点赞 / 取消点赞 ====================
    @PostMapping("/forum/posts/{id}/like")
    public Result<LikeResultVo> toggleLike(@PathVariable Integer id, HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        return Result.success(userService.toggleLike(id, user));
    }


    // ==================== 7.11 举报 ====================
    @PostMapping("/forum/reports")
    public Result<Map<String, Integer>> createReport(@RequestBody CreateReportDto dto,
                                                     HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        Map<String, Integer> data = new HashMap<>();
        data.put("id", userService.createReport(dto, user));
        return Result.success(data);
    }


    // ==================== 7.12 置顶 / 加精 / 锁定 / 隐藏 ====================
    @PutMapping("/admin/forum/posts/{id}/flags")
    public Result<Void> updatePostFlags(@PathVariable Integer id,
                                        @RequestBody PostFlagsDto dto,
                                        HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        userService.updatePostFlags(id, dto);
        return Result.success(null);
    }


    // ==================== 7.13 举报列表（admin） ====================
    @GetMapping("/admin/forum/reports")
    public Result<ReportListVo> listReports(ReportQueryDto dto, HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        return Result.success(userService.listReports(dto));
    }


    // ==================== 7.14 处理举报（admin） ====================
    @PutMapping("/admin/forum/reports/{id}")
    public Result<Void> handleReport(@PathVariable Integer id,
                                     @RequestBody HandleReportDto dto,
                                     HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        userService.handleReport(id, dto, user);
        return Result.success(null);
    }


    // ==================== 7.15 用户列表（admin） ====================
    @GetMapping("/admin/users")
    public Result<UserListVo> listUsers(UserQueryDto dto, HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        return Result.success(userService.listUsers(dto));
    }


    // ==================== 7.16 禁言用户（admin） ====================
    @PutMapping("/admin/users/{id}/mute")
    public Result<Map<String, Object>> muteUser(@PathVariable Integer id,
                                                @RequestBody MuteUserDto dto,
                                                HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        String muteUntil = userService.muteUser(id, dto, user);
        Map<String, Object> data = new HashMap<>();
        data.put("muteUntil", muteUntil);
        return Result.success(data);
    }


    // ==================== 7.17 解除禁言（admin） ====================
    @PutMapping("/admin/users/{id}/unmute")
    public Result<Void> unmuteUser(@PathVariable Integer id, HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        userService.unmuteUser(id);
        return Result.success(null);
    }


    // ==================== 7.18 审核通过（admin） ====================
    @PostMapping("/forum/admin/posts/{id}/approve")
    public Result<Void> approvePost(@PathVariable Integer id, HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        userService.approvePost(id);
        return Result.success(null);
    }


    // ==================== 8.1 公告列表 ====================
    @GetMapping("/announcements")
    public Result<AnnouncementListVo> listAnnouncements(AnnouncementQueryDto dto,
                                                        HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        return Result.success(userService.listAnnouncements(dto, user));
    }


    // ==================== 8.5 未读数（必须写在 /{id} 之前） ====================
    @GetMapping("/announcements/unread-count")
    public Result<Map<String, Integer>> unreadCount(HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        Map<String, Integer> data = new HashMap<>();
        data.put("unread", userService.unreadCount(user));
        return Result.success(data);
    }


    // ==================== 8.4 全部已读 ====================
    @PostMapping("/announcements/read-all")
    public Result<Void> markAllRead(HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        userService.markAllRead(user);
        return Result.success(null);
    }


    // ==================== 8.2 公告详情 ====================
    @GetMapping("/announcements/{id}")
    public Result<AnnouncementVo> getAnnouncement(@PathVariable Integer id, HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        return Result.success(userService.getAnnouncement(id, user));
    }


    // ==================== 8.3 标记单条已读 ====================
    @PostMapping("/announcements/{id}/read")
    public Result<Void> markRead(@PathVariable Integer id, HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        userService.markRead(id, user);
        return Result.success(null);
    }


    // ==================== 8.6 发布公告（admin） ====================
    @PostMapping("/admin/announcements")
    public Result<Map<String, Integer>> createAnnouncement(@RequestBody CreateAnnouncementDto dto,
                                                           HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        Map<String, Integer> data = new HashMap<>();
        data.put("id", userService.createAnnouncement(dto, user));
        return Result.success(data);
    }


    // ==================== 8.7 编辑公告（admin） ====================
    @PutMapping("/admin/announcements/{id}")
    public Result<Void> updateAnnouncement(@PathVariable Integer id,
                                           @RequestBody UpdateAnnouncementDto dto,
                                           HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        userService.updateAnnouncement(id, dto);
        return Result.success(null);
    }


    // ==================== 8.8 删除公告（admin） ====================
    @DeleteMapping("/admin/announcements/{id}")
    public Result<Void> deleteAnnouncement(@PathVariable Integer id, HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN, ResultCode.NOT_LOGIN_MSG);
        }
        if (!isAdmin(user)) {
            return Result.fail(ResultCode.FORBIDDEN, ResultCode.FORBIDDEN_MSG);
        }
        userService.deleteAnnouncement(id);
        return Result.success(null);
    }


    /** 角色粗筛：管理端接口统一用这个判 */
    private boolean isAdmin(User user) {
        return user != null && "admin".equals(user.getRole());
    }
}
