package com.ithw.service.impl;

import com.ithw.dao.UserDao;
import com.ithw.dto.*;
import com.ithw.exception.BusinessException;
import com.ithw.pojo.*;
import com.ithw.service.UserService;
import com.ithw.vo.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class UserServiceImpl implements UserService {
    private UserDao userDao;
    public UserServiceImpl(UserDao userDao){
        this.userDao = userDao;
    }
    @Override
    public void register(User user) {
        userDao.register(user);
    }

    @Override
    public User getUserByUserName(String username) {
        return userDao.getUserByUserName(username);
    }

    @Override
    public User getById(Integer id) {
        return userDao.getById(id);
    }

    @Override
    public void updateAvatar(Integer id, String avatarUrl) {
        userDao.updateAvatar(id, avatarUrl);
    }

    @Override
    public void changePassword(Integer id, String oldPassword, String newPassword) {
        User u = userDao.getById(id);
        if (u == null) {
            throw new BusinessException(ResultCode.USER_NOT_EXIST, ResultCode.USER_NOT_EXIST_MSG);
        }
        // ★ 校验必须在后端做 —— 前端那道只是省一次无效请求，能被绕过
        if (!u.getPassword().equals(oldPassword)) {
            throw new BusinessException(ResultCode.PASSWORD_ERROR, "原密码不正确");
        }
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "新密码至少 6 位");
        }
        if (newPassword.equals(oldPassword)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "新密码不能和原密码相同");
        }
        userDao.updatePassword(id, newPassword);
    }

    @Override
    public User updateProfile(UpdateProfileDto updateProfileDto, User user) {
        Integer id = user.getId();
        userDao.updateProfile(updateProfileDto,id);
        User dbUser = userDao.getById(id);
        if (dbUser == null) {
            throw new BusinessException(ResultCode.RESOURCE_NOT_FOUND,ResultCode.RESOURCE_NOT_FOUND_MSG);
        }
        return dbUser;
    }


    @Override
    public ForumOverview getForumOverview(User loginUser) {
       Integer pendingPosts=0;
       Integer pendingReports=0;
       Integer id = loginUser.getId();
       String role = loginUser.getRole();
       Integer totalPosts=userDao.getTotalPosts();
       Integer todayPosts=userDao.getTodayPosts();
       Integer totalComments=userDao.getTotalComments();
       Integer myPosts=userDao.getMyPosts(id);
       Integer myComments=userDao.getMyComments(id);
       Integer likeReceived=userDao.getLikeReceived(id);
       if (role==null){
           throw new BusinessException(ResultCode.PARAM_ERROR,ResultCode.PARAM_ERROR_MSG);
       }
       if (role.equals("admin")){
           pendingPosts = userDao.getPendingPosts();//仅 admin 返回，普通用户固定返回 0
           pendingReports = userDao.getPendingReports();
       }

       return new ForumOverview(totalPosts,todayPosts,
               totalComments,myPosts,myComments,likeReceived,
               pendingPosts,pendingReports);
    }

    @Override
    public ForumListVo forumList(ForumListDto dto, User loginUser) {
        boolean isAdmin = "admin".equals(loginUser.getRole());
        Integer id = loginUser.getId();
        int page = (dto.getPage() == null || dto.getPage() < 1) ? 1 : dto.getPage();
        int size = (dto.getSize() == null || dto.getSize() < 1) ? 10 : dto.getSize();
        dto.setPage(page);
        dto.setSize(size);
        int offset = (page - 1) * size;
        // 状态只允许 0 待审 / 1 已发布 / 2 已驳回，负数（如 -1 已删除）直接拒
        if (dto.getStatus() != null && dto.getStatus() < 0) {
            throw new BusinessException(ResultCode.PARAM_ERROR, ResultCode.PARAM_ERROR_MSG);
        }
        if (isAdmin) {
            if (dto.getStatus() == null) {
                dto.setStatus(1);   // 不传：默认看已发布
            }
            // 传了 status 就保留，交给 SQL 过滤（审核要看 0 待审 / 2 已驳回）
        }
        if (dto.getSort() == null || dto.getSort().isEmpty()) {
            dto.setSort("newest");
        }
        List<PostVo> postVo = userDao.forumList(dto, id, isAdmin, offset, size);

        /* 批量取图片和举报状态：原来每行 2 次 SQL（11 篇帖 = 22 次往返），
           TiDB Serverless 每次往返 200~300ms，列表接口被拖到 7 秒。
           合并成 2 次批量查询后整个接口只剩 4 次 SQL。 */
        Map<Integer, List<String>> imgMap = new HashMap<Integer, List<String>>();
        java.util.Set<Integer> reportedSet = new java.util.HashSet<Integer>();
        if (!postVo.isEmpty()) {
            List<Integer> postIds = new ArrayList<Integer>();
            for (PostVo vo : postVo) {
                postIds.add(vo.getId());
            }
            List<Map<String, Object>> imgRows = userDao.listPostImagesBatch(postIds);
            for (Map<String, Object> row : imgRows) {
                Integer pid = ((Number) row.get("postId")).intValue();
                String url = (String) row.get("url");
                List<String> urls = imgMap.get(pid);
                if (urls == null) {
                    urls = new ArrayList<String>();
                    imgMap.put(pid, urls);
                }
                urls.add(url);
            }
            List<Integer> reportedIds = userDao.listReportedPostIds(postIds, loginUser.getId());
            for (Integer pid : reportedIds) {
                reportedSet.add(pid);
            }
        }

        for (PostVo vo : postVo) {
            List<String> imgs = imgMap.get(vo.getId());
            vo.setImages(imgs != null ? imgs : new ArrayList<String>());

            boolean author = vo.getUserId() != null && vo.getUserId().equals(id);

            vo.setCanEdit((author && vo.getIsLocked() != null && vo.getIsLocked() == 0) || isAdmin ? 1 : 0);
            vo.setCanDelete(author || isAdmin ? 1 : 0);
            vo.setIsAdmin(isAdmin ? 1 : 0);

            boolean reported = reportedSet.contains(vo.getId());
            vo.setCanReport((vo.getStatus() != null && vo.getStatus() == 1)
                    && !author && !isAdmin && !reported ? 1 : 0);

            // 驳回理由只有作者和 admin 能看
            if (!author && !isAdmin) {
                vo.setRejectReason(null);
            }
            // liked 已在主 SQL 里由 EXISTS 自动映射到 PostVo.liked（Boolean）
        }
        ForumListVo forumListVo = new ForumListVo();
        forumListVo.setList(postVo);
        forumListVo.setPage(page);
        forumListVo.setSize(size);
        forumListVo.setTotal(userDao.forumListGetTotal(dto,id,isAdmin));
        return forumListVo;
    }

    @Transactional
    @Override
    public Integer postForum(CreatePostDto createPostDto, User loginUser) {
        User dbuser = userDao.getById(loginUser.getId());
        if (createPostDto.getTitle().trim().isEmpty()||createPostDto.getContent().trim().isEmpty()){
            throw new BusinessException(ResultCode.PARAM_ERROR,ResultCode.PARAM_ERROR_MSG);
        }
        if (createPostDto.getImages()==null){
            throw new BusinessException(ResultCode.PARAM_ERROR,ResultCode.PARAM_ERROR_MSG);
        }
        if (createPostDto.getImages().size()>3){
            throw new BusinessException(ResultCode.TOO_MANY_IMAGES,ResultCode.TOO_MANY_IMAGES_MSG);
        }
        boolean muted = dbuser.getStatus() != null && dbuser.getStatus() == 0
                && (dbuser.getMuteUntil() == null || dbuser.getMuteUntil().isAfter(LocalDateTime.now()));
        if (muted){
            throw new BusinessException(ResultCode.USER_MUTED,ResultCode.USER_MUTED_MSG);
        }
        List<String> urls = createPostDto.getImages();


        ForumPost post = getForumPost(createPostDto, loginUser);
        userDao.postForum(post);
        if (createPostDto.getImages()!=null&&!createPostDto.getImages().isEmpty()){
            int sortNo = 0;
            for (String url : urls) {
                userDao.postForumImage(post.getId(),url,sortNo++);
            }
        }
        return post.getId();

    }

    private static ForumPost getForumPost(CreatePostDto createPostDto, User loginUser) {
        ForumPost post = new ForumPost();
        post.setUserId(loginUser.getId());
        post.setTitle(createPostDto.getTitle());
        post.setContent(createPostDto.getContent());
        post.setTag(createPostDto.getTag());
        post.setStatus(loginUser.getRole().equals("admin")?1:0);
        post.setRejectReason(null);
        post.setIsTop(0);
        post.setIsEssence(0);
        post.setIsLocked(0);
        post.setViewCount(0);
        post.setLikeCount(0);
        post.setCommentCount(0);
        return post;
    }

    @Transactional
    @Override
    public PostVo postDetails(Integer id,User user) {
        boolean isAdmin = "admin".equals(user.getRole());
        PostVo postVo = userDao.postDetails(id,user);
        if (postVo == null) {
            throw new BusinessException(ResultCode.POST_NOT_FOUND,ResultCode.POST_NOT_FOUND_MSG);
        }
        boolean author = postVo.getUserId() != null && postVo.getUserId().equals(user.getId());
        if (postVo.getStatus()!=1&&!isAdmin&&!author){
            throw new BusinessException(ResultCode.POST_NOT_FOUND,ResultCode.POST_NOT_FOUND_MSG);
        }
        if (postVo.getStatus()==-1){
            throw new BusinessException(ResultCode.POST_NOT_FOUND,ResultCode.POST_NOT_FOUND_MSG);
        }
        if (postVo.getStatus()==1){
            postVo.setViewCount(postVo.getViewCount()+1);
            userDao.updateViewCount(postVo.getId());
        }
        postVo.setImages(userDao.listPostImages(postVo.getId()));
        postVo.setCanEdit((author && postVo.getIsLocked() != null && postVo.getIsLocked() == 0) || isAdmin ? 1 : 0);
        postVo.setCanDelete(author || isAdmin ? 1 : 0);
        postVo.setIsAdmin(isAdmin ? 1 : 0);
        boolean reported = userDao.hasReported(postVo.getId(), user.getId()) > 0;
        postVo.setCanReport((postVo.getStatus() != null && postVo.getStatus() == 1)
                && !author && !isAdmin && !reported ? 1 : 0);
        if (!author && !isAdmin) {
            postVo.setRejectReason(null);
        }
        return postVo;
    }


    @Transactional
    @Override
    public void editForum(User user, Integer id, CreatePostDto createPostDto) {
        PostVo postVo = userDao.postDetails(id,user);
        if (postVo == null) {
            throw new BusinessException(ResultCode.POST_NOT_FOUND,ResultCode.POST_NOT_FOUND_MSG);
        }
        boolean isAdmin = "admin".equals(user.getRole());
        boolean author = postVo.getUserId() != null && postVo.getUserId().equals(user.getId());
        if (author && !isAdmin && (postVo.getStatus()==0||postVo.getStatus()==2)){
            postVo.setStatus(0);
            postVo.setRejectReason(null);
            userDao.updateSR(0,null,id);
        }
        if (postVo.getStatus() != null && postVo.getStatus() == -1) {
            throw new BusinessException(ResultCode.POST_NOT_FOUND, ResultCode.POST_NOT_FOUND_MSG);
        }

        if (!isAdmin&&!author){
            throw new BusinessException(ResultCode.NOT_OWN_CONTENT,ResultCode.NOT_OWN_CONTENT_MSG);
        }
        if (!isAdmin&&postVo.getIsLocked()==1){
            throw new BusinessException(ResultCode.POST_LOCKED,ResultCode.POST_LOCKED_MSG);
        }
        if ((createPostDto.getTitle().trim().isEmpty())||createPostDto.getContent().trim().isEmpty()){
            throw new BusinessException(ResultCode.PARAM_ERROR,ResultCode.PARAM_ERROR_MSG);
        }

        if (createPostDto.getImages()!=null){
            if(createPostDto.getImages().size()>3){
                throw new BusinessException(ResultCode.TOO_MANY_IMAGES,ResultCode.TOO_MANY_IMAGES_MSG);
            }
            userDao.deleteImage(id);
            int sortNo = 0;
            for (String image : createPostDto.getImages()) {
                userDao.postForumImage(id,image,sortNo++);
            }

        }
        userDao.editForum(id,createPostDto);
    }

    @Override
    public void deleteForum(Integer id,User user){
        PostVo post = userDao.postDetails(id, user);
        if (post == null) {
            throw new BusinessException(ResultCode.POST_NOT_FOUND, ResultCode.POST_NOT_FOUND_MSG);
        }
        if (post.getStatus() != null && post.getStatus() == -1) {   // 已软删的再删，也当不存在
            throw new BusinessException(ResultCode.POST_NOT_FOUND, ResultCode.POST_NOT_FOUND_MSG);
        }

        boolean isAdmin  = "admin".equals(user.getRole());
        boolean isAuthor = post.getUserId() != null && post.getUserId().equals(user.getId());
        if (!isAuthor && !isAdmin) {
            throw new BusinessException(ResultCode.NOT_OWN_CONTENT, ResultCode.NOT_OWN_CONTENT_MSG);
        }
        // 软删，连着其他表的，直接删除会报错，用update把status变成-1
        userDao.deleteForum(id);
    }

    @Override
    public CommentListVo getComments(Integer postId, Integer page, Integer size, User user) {
        // ---------- 1. 参数归一 ----------
        if (page == null || page < 1) { page = 1; }
        if (size == null || size < 1) { size = 10; }

        // ---------- 2. 总数 + 一级评论 ----------
        int total  = userDao.getCommentTotal(postId);
        int offset = (page - 1) * size;

        List<CommentVo> roots = userDao.listRootComments(postId, offset, size);

        // ---------- 3. 拼 children：查子 → 按 parentId 分堆 → 塞回去 ----------
        if (!roots.isEmpty()) {
            List<Integer> rootIds = new ArrayList<>();
            for (CommentVo root : roots) {
                rootIds.add(root.getId());        // ② 收 id
            }

            List<CommentVo> replies = userDao.listRepliesByParentIds(rootIds);   // ③ 一次查完

            // ④ 分堆：key = 一级评论 id，value = 这个一级评论下面的所有回复
            Map<Integer, List<CommentVo>> byParent = new HashMap<>();
            for (CommentVo reply : replies) {
                Integer pid = reply.getParentId();      // 它挂在哪条一级评论下
                List<CommentVo> group = byParent.get(pid);
                if (group == null) {                    // 第一次遇到这个 pid → 先建个空盒子
                    group = new ArrayList<>();
                    byParent.put(pid, group);
                }
                group.add(reply);                       // 往盒子里放
            }

            for (CommentVo root : roots) {
                List<CommentVo> kids = byParent.get(root.getId());
                if (kids == null) {                     // 没人回复它 → 给空 list，不是 null
                    kids = new ArrayList<>();
                }
                root.setChildren(kids);
            }
        }

        // ---------- 4. 逐条算 canDelete（含 children） ----------
        boolean isAdmin = "admin".equals(user.getRole());
        fillCanDelete(roots, user.getId(), isAdmin);

        // ---------- 5. 装返回 ----------
        CommentListVo vo = new CommentListVo();
        vo.setTotal(total);
        vo.setPage(page);
        vo.setSize(size);
        vo.setList(roots);
        return vo;
    }
    /** 递归给一级评论和它的回复都算上 canDelete */
    private void fillCanDelete(List<CommentVo> list, Integer me, boolean isAdmin) {
        for (CommentVo c : list) {
            boolean mine = c.getUserId() != null && c.getUserId().equals(me);
            c.setCanDelete(isAdmin || mine ? 1 : 0);
            if (c.getChildren() != null && !c.getChildren().isEmpty()) {
                fillCanDelete(c.getChildren(), me, isAdmin);
            }
        }
    }

    @Transactional
    @Override
    public void reject(Integer id, RejectPostDto rejectPostDto) {
        if (id == null) {
            throw new BusinessException(ResultCode.EMPTY_PARAMETER, ResultCode.EMPTY_PARAMETER_MSG);
        }
        ForumPost post = userDao.selectPostById(id);
        if (post == null || (post.getStatus() != null && post.getStatus() == -1)) {
            throw new BusinessException(ResultCode.POST_NOT_FOUND, ResultCode.POST_NOT_FOUND_MSG);
        }
        if (post.getStatus() == null || post.getStatus() != 0) {
            throw new BusinessException(ResultCode.POST_NOT_PENDING, ResultCode.POST_NOT_PENDING_MSG);
        }
        String reason = (rejectPostDto == null || rejectPostDto.getReason() == null
                || rejectPostDto.getReason().trim().isEmpty())
                ? "内容不符合社区规范" : rejectPostDto.getReason().trim();
        int rows = userDao.reject(id, reason);
        if (rows == 0) {
            throw new BusinessException(ResultCode.POST_NOT_PENDING, ResultCode.POST_NOT_PENDING_MSG);
        }
    }


    @Transactional
    @Override
    public Integer postComment(CreateCommentDto dto, Integer postId, User user) {
        PostVo post = userDao.postDetails(postId, user);
        if (post == null || post.getStatus() == null || post.getStatus() != 1) {
            throw new BusinessException(ResultCode.POST_NOT_FOUND, ResultCode.POST_NOT_FOUND_MSG);
        }

        // ---------- 2. 锁帖 ----------
        if (post.getIsLocked() != null && post.getIsLocked() == 1) {
            throw new BusinessException(ResultCode.POST_LOCKED, ResultCode.POST_LOCKED_MSG);
        }

        // ---------- 3. 禁言（查库，别用 token 里的快照） ----------
        User dbUser = userDao.getById(user.getId());
        if (dbUser != null && dbUser.getStatus() != null && dbUser.getStatus() == 0
                && (dbUser.getMuteUntil() == null
                || dbUser.getMuteUntil().isAfter(LocalDateTime.now()))) {
            throw new BusinessException(ResultCode.USER_MUTED, "你已被禁言，不能评论");
        }

        // ---------- 4. 内容校验 ----------
        if (dto.getContent() == null || dto.getContent().trim().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "评论内容不能为空");
        }
        String content = dto.getContent().trim();
        if (content.length() > 1000) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "评论不能超过 1000 字");
        }

        // ---------- 5. parentId → 校验 + 反查 replyToUserId ----------
        Integer parentId      = dto.getParentId();
        Integer replyToUserId = null;

        if (parentId != null) {
            ForumComment target = userDao.selectForumCommentById(parentId);

            // 5.1 评论必须存在、属于本帖、没被删
            if (target == null
                    || !postId.equals(target.getPostId())
                    || target.getStatus() == null
                    || target.getStatus() != 1) {
                throw new BusinessException(ResultCode.PARAM_ERROR, "回复的评论不存在");
            }

            // 5.2 ★ 这里就是 replyToUserId 的来源：被回复那条评论的作者
            replyToUserId = target.getUserId();

            // 5.3 兜底：如果传进来的本身是二级评论，把它归到所属的一级评论下
            //     （前端正常会直接传一级 id，这一步只为防脏数据）
            if (target.getParentId() != null) {
                parentId = target.getParentId();
            }
        }

        // ---------- 6. 插评论 + 更新计数（同一事务） ----------
        ForumComment comment = new ForumComment();
        comment.setPostId(postId);
        comment.setUserId(user.getId());        // [token] 当前登录人
        comment.setParentId(parentId);
        comment.setReplyToUserId(replyToUserId);
        comment.setContent(content);
        comment.setStatus(1);

        userDao.insertComment(comment);         // 自增 id 回写到 comment.id
        userDao.addCommentCount(postId);

        return comment.getId();                 // 返回给 Controller 拼 data.id
    }


    @Transactional
    @Override
    public void deleteComment(Integer id, User user) {
        // ---------- 1. 查评论实体（不查帖子，评论自带 post_id） ----------
        ForumComment comment = userDao.selectForumCommentById(id);
        if (comment == null || comment.getStatus() == null || comment.getStatus() == -1) {
            throw new BusinessException(ResultCode.COMMENT_NOT_FOUND, ResultCode.COMMENT_NOT_FOUND_MSG);
        }

        // ---------- 2. 权限：既不是管理员、也不是作者 → 拒绝 ----------
        boolean isAdmin  = "admin".equals(user.getRole());
        boolean isAuthor = comment.getUserId() != null && comment.getUserId().equals(user.getId());
        if (!isAdmin && !isAuthor) {
            throw new BusinessException(ResultCode.NOT_OWN_CONTENT, ResultCode.NOT_OWN_CONTENT_MSG);
        }

        // ---------- 3. 软删（本条 + 它下面的回复）+ 扣减帖子评论数 ----------
        Integer kids = userDao.countKids(id);
        if (kids == null) {
            kids = 0;
        }
        userDao.updateComment(id);              // 本条 + 子回复 → status = -1
        userDao.updateKids(comment.getPostId(), kids);   // 帖子 id 从评论实体来，不能传评论 id
    }


    // ==================================================================
    // 7.10 点赞 / 取消点赞（toggle：同一个接口，再点一次就是取消）
    // ==================================================================
    @Transactional
    @Override
    public LikeResultVo toggleLike(Integer postId, User user) {
        ForumPost post = userDao.selectPostById(postId);
        if (post == null || post.getStatus() == null || post.getStatus() != 1) {
            throw new BusinessException(ResultCode.POST_NOT_FOUND, ResultCode.POST_NOT_FOUND_MSG);
        }

        ForumLike exist = userDao.findLike(postId, user.getId());
        if (exist != null) {
            // 已经赞过 → 取消
            userDao.deleteLike(postId, user.getId());
            userDao.decLikeCount(postId);
            LikeResultVo vo = new LikeResultVo();
            vo.setLiked(false);
            vo.setLikeCount(userDao.getLikeCount(postId));
            return vo;
        }

        try {
            userDao.insertLike(postId, user.getId());
            userDao.incLikeCount(postId);
        } catch (DuplicateKeyException e) {
            // 并发下两次请求同时插入 → 唯一键 uk_post_user 拦下，当作"已经点过"，不报错
        }
        LikeResultVo vo = new LikeResultVo();
        vo.setLiked(true);
        vo.setLikeCount(userDao.getLikeCount(postId));
        return vo;
    }


    // ==================================================================
    // 7.11 举报
    // ==================================================================
    @Transactional
    @Override
    public Integer createReport(CreateReportDto dto, User user) {
        // ---------- 1. 禁言校验（查库，不用 token 快照） ----------
        User dbUser = userDao.getById(user.getId());
        if (dbUser != null && dbUser.getStatus() != null && dbUser.getStatus() == 0
                && (dbUser.getMuteUntil() == null
                || dbUser.getMuteUntil().isAfter(LocalDateTime.now()))) {
            throw new BusinessException(ResultCode.USER_MUTED, "你已被禁言，不能举报");
        }

        // ---------- 2. 参数校验 ----------
        if (dto == null || dto.getTargetType() == null || dto.getTargetId() == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "举报对象不能为空");
        }
        String targetType = dto.getTargetType();
        if (!"post".equals(targetType) && !"comment".equals(targetType)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "targetType 只能是 post 或 comment");
        }

        // ---------- 3. 举报对象必须存在，并取出它的作者 ----------
        Integer authorId;
        if ("post".equals(targetType)) {
            ForumPost post = userDao.selectPostById(dto.getTargetId());
            if (post == null || post.getStatus() == null || post.getStatus() == -1) {
                throw new BusinessException(ResultCode.PARAM_ERROR, "举报的内容不存在");
            }
            authorId = post.getUserId();
        } else {
            ForumComment comment = userDao.selectForumCommentById(dto.getTargetId());
            if (comment == null || comment.getStatus() == null || comment.getStatus() == -1) {
                throw new BusinessException(ResultCode.PARAM_ERROR, "举报的内容不存在");
            }
            authorId = comment.getUserId();
        }
        if (authorId != null && authorId.equals(user.getId())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "不能举报自己的内容");
        }

        // ---------- 4. 不能重复举报（先查一次，唯一键再兜一层） ----------
        Integer count = userDao.countReport(targetType, dto.getTargetId(), user.getId());
        if (count != null && count > 0) {
            throw new BusinessException(ResultCode.REPORT_DUPLICATE, ResultCode.REPORT_DUPLICATE_MSG);
        }

        // ---------- 5. 入库：status=0 待处理 ----------
        ForumReport report = new ForumReport();
        report.setTargetType(targetType);
        report.setTargetId(dto.getTargetId());
        report.setReporterId(user.getId());
        report.setReasonType(dto.getReasonType() == null || dto.getReasonType().trim().isEmpty()
                ? "other" : dto.getReasonType());
        report.setReason(dto.getReason());
        report.setStatus(0);
        try {
            userDao.insertReport(report);
        } catch (DuplicateKeyException e) {
            throw new BusinessException(ResultCode.REPORT_DUPLICATE, ResultCode.REPORT_DUPLICATE_MSG);
        }
        return report.getId();
    }


    // ==================================================================
    // 7.12 置顶 / 加精 / 锁定 / 隐藏
    // ==================================================================
    @Override
    public void updatePostFlags(Integer id, PostFlagsDto dto) {
        if (dto == null || (dto.getIsTop() == null && dto.getIsEssence() == null
                && dto.getIsLocked() == null && dto.getStatus() == null)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "没有要修改的字段");
        }
        ForumPost post = userDao.selectPostById(id);
        if (post == null || (post.getStatus() != null && post.getStatus() == -1)) {
            throw new BusinessException(ResultCode.POST_NOT_FOUND, ResultCode.POST_NOT_FOUND_MSG);
        }
        userDao.updatePostFlags(id, dto);
    }


    // ==================================================================
    // 7.13 举报列表（admin）
    // ==================================================================
    @Override
    public ReportListVo listReports(ReportQueryDto dto) {
        if (dto == null) {
            dto = new ReportQueryDto();
        }
        int page = (dto.getPage() == null || dto.getPage() < 1) ? 1 : dto.getPage();
        int size = (dto.getSize() == null || dto.getSize() < 1) ? 10 : dto.getSize();
        dto.setPage(page);
        dto.setSize(size);
        int offset = (page - 1) * size;

        Integer totalObj = userDao.countReports(dto);
        int total = totalObj == null ? 0 : totalObj;
        List<ReportVo> list = userDao.listReports(dto, offset, size);

        // ---- 批量补"被举报内容"的信息：先按类型收集 id，再各查一次（避免每条举报查一次库） ----
        List<Integer> postIds = new ArrayList<>();
        List<Integer> commentIds = new ArrayList<>();
        for (ReportVo r : list) {
            if ("post".equals(r.getTargetType())) {
                postIds.add(r.getTargetId());
            } else if ("comment".equals(r.getTargetType())) {
                commentIds.add(r.getTargetId());
            }
        }

        Map<Integer, ReportTargetVo> postMap = new HashMap<>();
        if (!postIds.isEmpty()) {
            List<ReportTargetVo> posts = userDao.listReportPostTargets(postIds);
            for (ReportTargetVo t : posts) {
                postMap.put(t.getId(), t);
            }
        }
        Map<Integer, ReportTargetVo> commentMap = new HashMap<>();
        if (!commentIds.isEmpty()) {
            List<ReportTargetVo> comments = userDao.listReportCommentTargets(commentIds);
            for (ReportTargetVo t : comments) {
                commentMap.put(t.getId(), t);
            }
        }

        for (ReportVo r : list) {
            ReportTargetVo t = "post".equals(r.getTargetType())
                    ? postMap.get(r.getTargetId())
                    : commentMap.get(r.getTargetId());
            if (t == null) {
                r.setTargetTitle("（内容已删除）");
                r.setTargetExcerpt("");
                continue;
            }
            r.setTargetTitle(t.getTitle() == null ? "" : t.getTitle());
            r.setTargetExcerpt(t.getExcerpt() == null ? "" : t.getExcerpt());
            r.setTargetStatus(t.getStatus());
            r.setAuthorId(t.getAuthorId());
            r.setAuthorName(t.getAuthorName());
        }

        ReportListVo vo = new ReportListVo();
        vo.setTotal(total);
        vo.setPage(page);
        vo.setSize(size);
        vo.setList(list);
        return vo;
    }


    // ==================================================================
    // 7.14 处理举报（一个事务里动 3 张表）
    // ==================================================================
    @Transactional
    @Override
    public void handleReport(Integer id, HandleReportDto dto, User admin) {
        if (dto == null || dto.getAction() == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "处理动作不能为空");
        }
        String action = dto.getAction();
        if (!"reject".equals(action) && !"hide".equals(action)
                && !"delete".equals(action) && !"mute".equals(action)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "action 只能是 reject/hide/delete/mute");
        }

        ForumReport report = userDao.selectReportById(id);
        if (report == null) {
            throw new BusinessException(ResultCode.REPORT_NOT_FOUND, ResultCode.REPORT_NOT_FOUND_MSG);
        }
        if (report.getStatus() != null && report.getStatus() != 0) {
            throw new BusinessException(ResultCode.REPORT_HANDLED, ResultCode.REPORT_HANDLED_MSG);
        }

        // ---------- 1. 改被举报内容 + 记住作者（mute 要用） ----------
        Integer authorId = null;
        boolean needHide = "hide".equals(action) || "mute".equals(action);
        boolean needDelete = "delete".equals(action);
        if ("post".equals(report.getTargetType())) {
            ForumPost post = userDao.selectPostById(report.getTargetId());
            if (post != null) {
                authorId = post.getUserId();
                if (needHide) {
                    userDao.updatePostStatus(report.getTargetId(), 0);
                } else if (needDelete) {
                    userDao.updatePostStatus(report.getTargetId(), -1);
                }
            }
        } else {
            ForumComment comment = userDao.selectForumCommentById(report.getTargetId());
            if (comment != null) {
                authorId = comment.getUserId();
                if (needHide) {
                    userDao.updateCommentStatus(report.getTargetId(), 0);
                } else if (needDelete) {
                    userDao.updateCommentStatus(report.getTargetId(), -1);
                }
            }
        }

        // ---------- 2. 改举报单：reject → 2 已驳回，其它 → 1 已处理 ----------
        userDao.updateReportHandle(id, "reject".equals(action) ? 2 : 1, admin.getId(),
                action, dto.getRemark() == null ? "" : dto.getRemark());

        // ---------- 3. 仅 mute：顺手禁言作者 ----------
        if ("mute".equals(action) && authorId != null) {
            userDao.muteUser(authorId, dto.getMuteDays(), dto.getRemark());
        }
    }


    // ==================================================================
    // 7.15 用户列表（admin）
    // ==================================================================
    @Override
    public UserListVo listUsers(UserQueryDto dto) {
        if (dto == null) {
            dto = new UserQueryDto();
        }
        int page = (dto.getPage() == null || dto.getPage() < 1) ? 1 : dto.getPage();
        int size = (dto.getSize() == null || dto.getSize() < 1) ? 10 : dto.getSize();
        dto.setPage(page);
        dto.setSize(size);
        int offset = (page - 1) * size;

        Integer totalObj = userDao.countUsers(dto);
        int total = totalObj == null ? 0 : totalObj;

        UserListVo vo = new UserListVo();
        vo.setTotal(total);
        vo.setPage(page);
        vo.setSize(size);
        vo.setList(userDao.listUsers(dto, offset, size));
        return vo;
    }


    // ==================================================================
    // 7.16 禁言（返回禁言截止时间，永久返回 null）
    // ==================================================================
    @Override
    public String muteUser(Integer id, MuteUserDto dto, User admin) {
        User target = userDao.getById(id);
        if (target == null) {
            throw new BusinessException(ResultCode.USER_NOT_EXIST, ResultCode.USER_NOT_EXIST_MSG);
        }
        if (id.equals(admin.getId())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "不能禁言自己");
        }
        if ("admin".equals(target.getRole())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "不能禁言管理员");
        }
        Integer days = dto == null ? null : dto.getDays();
        if (days != null && days < 0) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "禁言天数不能为负数");
        }
        String reason = (dto == null || dto.getReason() == null || dto.getReason().trim().isEmpty())
                ? "违反社区规范" : dto.getReason().trim();
        userDao.muteUser(id, days, reason);

        if (days == null || days == 0) {
            return null;    // 永久
        }
        return LocalDateTime.now().plusDays(days)
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }


    // ==================================================================
    // 7.17 解除禁言
    // ==================================================================
    @Override
    public void unmuteUser(Integer id) {
        User target = userDao.getById(id);
        if (target == null) {
            throw new BusinessException(ResultCode.USER_NOT_EXIST, ResultCode.USER_NOT_EXIST_MSG);
        }
        userDao.unmuteUser(id);
    }


    // ==================================================================
    // 7.18 审核通过（SQL 带 AND status=0，防两个管理员同时点）
    // ==================================================================
    @Override
    public void approvePost(Integer id) {
        ForumPost post = userDao.selectPostById(id);
        if (post == null || (post.getStatus() != null && post.getStatus() == -1)) {
            throw new BusinessException(ResultCode.POST_NOT_FOUND, ResultCode.POST_NOT_FOUND_MSG);
        }
        int rows = userDao.approvePost(id);
        if (rows == 0) {
            throw new BusinessException(ResultCode.POST_NOT_PENDING, ResultCode.POST_NOT_PENDING_MSG);
        }
    }


    // ==================================================================
    // 8.1 公告列表
    // ==================================================================
    @Override
    public AnnouncementListVo listAnnouncements(AnnouncementQueryDto dto, User user) {
        if (dto == null) {
            dto = new AnnouncementQueryDto();
        }
        int page = (dto.getPage() == null || dto.getPage() < 1) ? 1 : dto.getPage();
        int size = (dto.getSize() == null || dto.getSize() < 1) ? 10 : dto.getSize();
        dto.setPage(page);
        dto.setSize(size);
        int offset = (page - 1) * size;

        boolean isAdmin = "admin".equals(user.getRole());
        Integer me = user.getId();

        Integer totalObj = userDao.countAnnouncements(dto, isAdmin, me);
        int total = totalObj == null ? 0 : totalObj;

        AnnouncementListVo vo = new AnnouncementListVo();
        vo.setTotal(total);
        vo.setPage(page);
        vo.setSize(size);
        vo.setList(userDao.listAnnouncements(dto, isAdmin, me, offset, size));
        return vo;
    }


    // ==================================================================
    // 8.2 公告详情
    // ==================================================================
    @Override
    public AnnouncementVo getAnnouncement(Integer id, User user) {
        if (id == null) {
            throw new BusinessException(ResultCode.EMPTY_PARAMETER, ResultCode.EMPTY_PARAMETER_MSG);
        }
        AnnouncementVo vo = userDao.getAnnouncement(id, user.getId());
        if (vo == null) {
            throw new BusinessException(ResultCode.ANNOUNCEMENT_NOT_FOUND, ResultCode.ANNOUNCEMENT_NOT_FOUND_MSG);
        }
        // 下架/草稿状态的公告，只有管理员能看
        boolean isAdmin = "admin".equals(user.getRole());
        if (vo.getStatus() != null && vo.getStatus() != 1 && !isAdmin) {
            throw new BusinessException(ResultCode.ANNOUNCEMENT_NOT_FOUND, ResultCode.ANNOUNCEMENT_NOT_FOUND_MSG);
        }
        return vo;
    }


    // ==================================================================
    // 8.3 标记单条已读（幂等）
    // ==================================================================
    @Override
    public void markRead(Integer id, User user) {
        Announcement a = userDao.selectAnnouncementById(id);
        if (a == null || a.getStatus() == null || a.getStatus() == -1) {
            throw new BusinessException(ResultCode.ANNOUNCEMENT_NOT_FOUND, ResultCode.ANNOUNCEMENT_NOT_FOUND_MSG);
        }
        userDao.markRead(id, user.getId());
    }


    // ==================================================================
    // 8.4 全部已读
    // ==================================================================
    @Override
    public void markAllRead(User user) {
        userDao.markAllRead(user.getId());
    }


    // ==================================================================
    // 8.5 未读数（侧边栏红点）
    // ==================================================================
    @Override
    public Integer unreadCount(User user) {
        Integer n = userDao.unreadCount(user.getId());
        return n == null ? 0 : n;
    }


    // ==================================================================
    // 8.6 发布公告（admin）
    // ==================================================================
    @Override
    public Integer createAnnouncement(CreateAnnouncementDto dto, User admin) {
        if (dto == null || dto.getTitle() == null || dto.getTitle().trim().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "标题不能为空");
        }
        if (dto.getContent() == null || dto.getContent().trim().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "正文不能为空");
        }
        if (dto.getTitle().trim().length() > 120) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "标题不能超过 120 字");
        }
        String type = dto.getType();
        if (!"notice".equals(type) && !"rule".equals(type) && !"event".equals(type)) {
            type = "notice";
        }
        Announcement a = new Announcement();
        a.setAdminId(admin.getId());          // [token] 发布人从登录态取，不由前端传
        a.setTitle(dto.getTitle().trim());
        a.setContent(dto.getContent().trim());
        a.setType(type);
        a.setIsTop(dto.getIsTop() == null ? 0 : dto.getIsTop());
        a.setStatus(dto.getStatus() == null ? 1 : dto.getStatus());
        a.setPublishTime(LocalDateTime.now());
        userDao.insertAnnouncement(a);
        return a.getId();
    }


    // ==================================================================
    // 8.7 编辑公告（admin）：只改传了的字段；上架/下架也走这里
    // ==================================================================
    @Override
    public void updateAnnouncement(Integer id, UpdateAnnouncementDto dto) {
        Announcement a = userDao.selectAnnouncementById(id);
        if (a == null || a.getStatus() == null || a.getStatus() == -1) {
            throw new BusinessException(ResultCode.ANNOUNCEMENT_NOT_FOUND, ResultCode.ANNOUNCEMENT_NOT_FOUND_MSG);
        }
        if (dto == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "没有要修改的字段");
        }
        if (dto.getTitle() != null && dto.getTitle().trim().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "标题不能为空");
        }
        if (dto.getContent() != null && dto.getContent().trim().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "正文不能为空");
        }
        if (dto.getType() != null && !"notice".equals(dto.getType())
                && !"rule".equals(dto.getType()) && !"event".equals(dto.getType())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "type 只能是 notice/rule/event");
        }
        if (dto.getTitle() != null) {
            dto.setTitle(dto.getTitle().trim());
        }
        userDao.updateAnnouncement(id, dto);
    }


    // ==================================================================
    // 8.8 删除公告（admin）：软删
    // ==================================================================
    @Override
    public void deleteAnnouncement(Integer id) {
        Announcement a = userDao.selectAnnouncementById(id);
        if (a == null || a.getStatus() == null || a.getStatus() == -1) {
            throw new BusinessException(ResultCode.ANNOUNCEMENT_NOT_FOUND, ResultCode.ANNOUNCEMENT_NOT_FOUND_MSG);
        }
        userDao.deleteAnnouncement(id);
    }

}
