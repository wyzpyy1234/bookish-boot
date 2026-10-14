package com.ithw.pojo;

/**
 * 全局业务响应码常量
 * HTTP状态码：200成功；401未登录/token失效；403无权限（拦截器处理，不进业务）
 * 业务编码：
 * 1xxx：登录、用户相关
 * 2xxx：图书借阅业务相关
 */
public class ResultCode {

    // ========== HTTP层统一返回（JSON里的code，正常业务都返回http 200） ==========
    public static final int SUCCESS = 200;
    public static final String SUCCESS_MSG = "操作成功";


    public static final int SERVICE_ERROR = 500;
    public static final String SERVICE_ERROR_MSG = "服务器异常";


    public static final int NOT_LOGIN = 401;
    public static final String NOT_LOGIN_MSG = "用户没有登录";

    public static final int FORBIDDEN = 403;
    public static final String FORBIDDEN_MSG = "无权限";
    // ========== 1000 用户/登录相关业务码 ==========
    /** 1001 用户不存在（登录账号查不到） */
    public static final int USER_NOT_EXIST = 1001;
    public static final String USER_NOT_EXIST_MSG = "用户不存在";

    /** 1002 密码错误 */
    public static final int PASSWORD_ERROR = 1002;
    public static final String PASSWORD_ERROR_MSG = "密码错误";

    /** 1003 资源不存在：图书、借阅记录id查询不到 */
    public static final int RESOURCE_NOT_FOUND = 1003;
    public static final String RESOURCE_NOT_FOUND_MSG = "资源不存在";

    /** 1004 参数错误：缺参、格式不对、分页参数非法 */
    public static final int PARAM_ERROR = 1004;
    public static final String PARAM_ERROR_MSG = "参数错误";

    /** 1005 注册失败，账号已存在 */
    public static final int ACCOUNT_EXIST = 1005;
    public static final String ACCOUNT_EXIST_MSG = "账号已存在，注册失败";

    // ========== 2000 图书借阅业务码 ==========
    /** 2001 该图书暂无可借副本（全部借出/丢失） */
    public static final int BOOK_NO_COPY_AVAILABLE = 2001;
    public static final String BOOK_NO_COPY_AVAILABLE_MSG = "该图书暂无可借副本";

    /** 2002 超出可借上限，当前在借数量 >=max_borrow */
    public static final int BORROW_UPPER_LIMIT = 2002;
    public static final String BORROW_UPPER_LIMIT_MSG = "超出最大可借数量";

    /** 2003 存在逾期未还图书，请先归还 */
    public static final int HAS_OVERDUE = 2003;
    public static final String HAS_OVERDUE_MSG = "存在逾期未还图书，请先归还";

    /** 2004 借阅记录已归还，重复还书 */
    public static final int ALREADY_RETURN = 2004;
    public static final String ALREADY_RETURN_MSG = "该借阅记录已归还，请勿重复归还";

    /** 2005 超过最大续借次数 renew_count ≥2 */
    public static final int RENEW_COUNT_EXCEED = 2005;
    public static final String RENEW_COUNT_EXCEED_MSG = "已达到最大续借次数，无法续借";

    /** 2006 图书存在借阅记录，不能删除 */
    public static final int BOOK_CANNOT_DELETE = 2006;
    public static final String BOOK_CANNOT_DELETE_MSG = "图书存在借阅记录，不允许删除";

    /** 2006 图书存在借阅记录，不能删除 */
    public static final int EMPTY_PARAMETER = 2007;
    public static final String EMPTY_PARAMETER_MSG = "参数为空";


}

