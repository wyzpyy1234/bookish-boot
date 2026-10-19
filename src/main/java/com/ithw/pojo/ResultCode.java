package com.ithw.pojo;

/**
 * 全局业务响应码常量
 *
 * <p>HTTP 状态码：200 成功；401 未登录 / token 失效；403 无权限（拦截器处理，不进业务）
 *
 * <p>业务编码分段（看日志里的 code 就知道属于哪个模块）：
 * <ul>
 *   <li><b>1xxx</b> 登录 / 用户 / 参数类</li>
 *   <li><b>2xxx</b> 图书借阅业务 + 用户状态（禁言 / 锁帖）</li>
 *   <li><b>3xxx</b> 论坛内容</li>
 *   <li><b>4xxx</b> 公告</li>
 * </ul>
 *
 * <p>约定：每个码都配一对常量（int + String 的 XXX / XXX_MSG）。
 * Service 里统一 {@code throw new BusinessException(ResultCode.XXX, ResultCode.XXX_MSG);}
 * 文案只有一处定义，以后改提示语只改一行。
 */
public class ResultCode {

    // ==================== 通用（对齐 HTTP 语义） ====================

    /**
     * 200 成功 —— 前端只认这一个成功码（不是 0、不是 1）
     */
    public static final int SUCCESS = 200;
    public static final String SUCCESS_MSG = "操作成功";

    /**
     * 500 服务器异常 —— 兜底，不把堆栈 / SQL 暴露给前端
     */
    public static final int SERVICE_ERROR = 500;
    public static final String SERVICE_ERROR_MSG = "服务器异常";

    /**
     * 401 未登录 / token 失效 —— 前端看到它会自动清登录态并跳登录页
     */
    public static final int NOT_LOGIN = 401;
    public static final String NOT_LOGIN_MSG = "用户没有登录";

    /**
     * 403 无权限 —— 角色粗筛在 Controller、归属校验在 Service
     */
    public static final int FORBIDDEN = 403;
    public static final String FORBIDDEN_MSG = "无权限";

    // ==================== 1xxx 用户 / 登录 / 参数 ====================

    /**
     * 1001 用户不存在（登录账号查不到）
     */
    public static final int USER_NOT_EXIST = 1001;
    public static final String USER_NOT_EXIST_MSG = "用户不存在";

    /**
     * 1002 密码错误
     */
    public static final int PASSWORD_ERROR = 1002;
    public static final String PASSWORD_ERROR_MSG = "密码错误";

    /**
     * 1003 资源不存在：图书、借阅记录 id 查询不到
     */
    public static final int RESOURCE_NOT_FOUND = 1003;
    public static final String RESOURCE_NOT_FOUND_MSG = "资源不存在";

    /**
     * 1004 参数错误：缺参、格式不对、分页参数非法
     */
    public static final int PARAM_ERROR = 1004;
    public static final String PARAM_ERROR_MSG = "参数错误";

    /**
     * 1005 注册失败，账号已存在
     */
    public static final int ACCOUNT_EXIST = 1005;
    public static final String ACCOUNT_EXIST_MSG = "账号已存在，注册失败";

    /**
     * 1006 必填参数为空（★ 原为 2007，为避免与论坛"已禁言"撞号，挪进参数段）
     */
    public static final int EMPTY_PARAMETER = 1006;
    public static final String EMPTY_PARAMETER_MSG = "参数为空";

    /**
     * 1007 参数超出范围（★ 原为 2008，同上，把 2008 让给"帖子已锁定"）
     */
    public static final int FIELD_OUT_OF_RANGE = 1007;
    public static final String FIELD_OUT_OF_RANGE_MSG = "参数超出范围";

    /**
     * 1008 管理员邀请码不正确（注册管理员时校验，防止陌生人自助成为管理员）
     */
    public static final int INVITE_CODE_ERROR = 1008;
    public static final String INVITE_CODE_ERROR_MSG = "管理员邀请码不正确";

    // ==================== 2xxx 图书借阅业务 ====================

    /**
     * 2001 该图书暂无可借副本（全部借出 / 丢失）
     */
    public static final int BOOK_NO_COPY_AVAILABLE = 2001;
    public static final String BOOK_NO_COPY_AVAILABLE_MSG = "该图书暂无可借副本";

    /**
     * 2002 超出可借上限，当前在借数量 >= max_borrow
     */
    public static final int BORROW_UPPER_LIMIT = 2002;
    public static final String BORROW_UPPER_LIMIT_MSG = "超出最大可借数量";

    /**
     * 2003 存在逾期未还图书，请先归还
     */
    public static final int HAS_OVERDUE = 2003;
    public static final String HAS_OVERDUE_MSG = "存在逾期未还图书，请先归还";

    /**
     * 2004 借阅记录已归还，重复还书
     */
    public static final int ALREADY_RETURN = 2004;
    public static final String ALREADY_RETURN_MSG = "该借阅记录已归还，请勿重复归还";

    /**
     * 2005 超过最大续借次数 renew_count >= 2
     */
    public static final int RENEW_COUNT_EXCEED = 2005;
    public static final String RENEW_COUNT_EXCEED_MSG = "已达到最大续借次数，无法续借";

    /**
     * 2006 图书存在借阅记录，不能删除
     */
    public static final int BOOK_CANNOT_DELETE = 2006;
    public static final String BOOK_CANNOT_DELETE_MSG = "图书存在借阅记录，不允许删除";

    // ---- 用户 / 内容状态（论坛、公告要用到的通用状态码） ----

    /**
     * 2007 已被禁言（发帖 / 评论 / 举报前最先校验）
     */
    public static final int USER_MUTED = 2007;
    public static final String USER_MUTED_MSG = "你已被禁言";

    /**
     * 2008 帖子已锁定（锁定后不能评论；非管理员不能编辑）
     */
    public static final int POST_LOCKED = 2008;
    public static final String POST_LOCKED_MSG = "帖子已锁定";

    /**
     * 2009 文本为空
     */
    public static final int TEST_IS_NULL = 2009;
    public static final String TEST_IS_NULL_MSG = "文本为空";

    // ==================== 3xxx 论坛内容 ====================

    /**
     * 3001 帖子不存在或已删除（含：无权查看别人的待审核帖 —— 也返回 3001，不暴露"这帖存在"）
     */
    public static final int POST_NOT_FOUND = 3001;
    public static final String POST_NOT_FOUND_MSG = "帖子不存在或已删除";

    /**
     * 3002 评论不存在
     */
    public static final int COMMENT_NOT_FOUND = 3002;
    public static final String COMMENT_NOT_FOUND_MSG = "评论不存在";

    /**
     * 3003 只能操作自己的内容（编辑 / 删除别人的帖子、评论）
     */
    public static final int NOT_OWN_CONTENT = 3003;
    public static final String NOT_OWN_CONTENT_MSG = "只能操作自己的内容";

    /**
     * 3004 举报不存在
     */
    public static final int REPORT_NOT_FOUND = 3004;
    public static final String REPORT_NOT_FOUND_MSG = "举报不存在";

    /**
     * 3005 重复举报（先查一次 + 靠唯一键 uk_reporter_target 兜底）
     */
    public static final int REPORT_DUPLICATE = 3005;
    public static final String REPORT_DUPLICATE_MSG = "你已经举报过这条内容了";

    /**
     * 3006 配图超过 3 张
     */
    public static final int TOO_MANY_IMAGES = 3006;
    public static final String TOO_MANY_IMAGES_MSG = "最多上传 3 张图片";

    /**
     * 3007 举报已处理过（防手滑重复点、防覆盖处理记录）
     */
    public static final int REPORT_HANDLED = 3007;
    public static final String REPORT_HANDLED_MSG = "该举报已处理过";

    /**
     * 3008 帖子不在待审核状态（审核通过 / 驳回时 status 不是 0）
     */
    public static final int POST_NOT_PENDING = 3008;
    public static final String POST_NOT_PENDING_MSG = "该帖不在待审核状态";

    // ==================== 4xxx 公告 ====================

    /**
     * 4001 公告不存在
     */
    public static final int ANNOUNCEMENT_NOT_FOUND = 4001;
    public static final String ANNOUNCEMENT_NOT_FOUND_MSG = "公告不存在";


}