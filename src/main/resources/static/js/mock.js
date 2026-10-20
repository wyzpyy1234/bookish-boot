/* ==========================================================
 * Bookish · Mock 数据层（前端离线预览用）
 *
 * ★ 怎么用：js/api.js 顶部 USE_MOCK = true → 全部页面用这里的假数据。
 * ★ 后端写好后：USE_MOCK = false，本文件与页面上的 <script src="js/mock.js">
 *   都可以删掉（api.js 只在 USE_MOCK 时才调 mockRequest，删了也不报错）。
 *
 * ⚠️ 铁律：Mock 必须【如实模拟后端】的筛选 / 分页 / 权限 / 计数字段。
 *    不要为了让页面好看而在 Mock 里偷偷补数据 —— 否则真实接口缺逻辑时前端看不出来。
 *    下面每个方法都按《03-论坛与公告-接口文档》逐条对齐。
 * ========================================================== */

/* ==================== 1. 基础数据 ==================== */

const MOCK_CATEGORIES = [
  { id: 1, name: "计算机", sortNo: 1 },
  { id: 2, name: "文学小说", sortNo: 2 },
  { id: 3, name: "历史", sortNo: 3 },
  { id: 4, name: "经济管理", sortNo: 4 },
  { id: 5, name: "科普", sortNo: 5 }
];

const MOCK_PUBLISHERS = [
  { id: 1, name: "人民邮电出版社", address: "北京市丰台区", phone: "010-81055000" },
  { id: 2, name: "机械工业出版社", address: "北京市西城区", phone: "010-88379000" },
  { id: 3, name: "中信出版社", address: "北京市朝阳区", phone: "010-84849555" },
  { id: 4, name: "人民文学出版社", address: "北京市朝阳区", phone: "010-65252043" },
  { id: 5, name: "清华大学出版社", address: "北京市海淀区", phone: "010-62770175" }
];

const MOCK_BOOKS = [
  { id: 1,  isbn: "9787115428028", title: "Java核心技术 卷I",      author: "Cay S. Horstmann", categoryId: 1, publisherId: 1, price: 149.00, publishDate: "2016-09-01", intro: "Java 领域经典入门与进阶读物，覆盖语言基础与标准库。", cover: null },
  { id: 2,  isbn: "9787111213826", title: "Effective Java",       author: "Joshua Bloch",     categoryId: 1, publisherId: 2, price: 99.00,  publishDate: "2018-01-01", intro: "Java 编程最佳实践，含 90 条经验法则。", cover: null },
  { id: 3,  isbn: "9787111544937", title: "深入理解Java虚拟机",   author: "周志明",            categoryId: 1, publisherId: 2, price: 129.00, publishDate: "2019-12-01", intro: "JVM 领域公认的经典，讲内存模型与垃圾回收。", cover: null },
  { id: 4,  isbn: "9787121353376", title: "MySQL技术内幕",        author: "姜承尧",            categoryId: 1, publisherId: 5, price: 89.00,  publishDate: "2019-02-01", intro: "InnoDB 存储引擎原理与实现，索引部分必读。", cover: null },
  { id: 5,  isbn: "9787111606987", title: "高性能MySQL",          author: "Baron Schwartz",   categoryId: 1, publisherId: 2, price: 139.00, publishDate: "2019-06-01", intro: "MySQL 性能优化与索引设计的权威之作。", cover: null },
  { id: 6,  isbn: "9787115472034", title: "代码整洁之道",         author: "Robert C. Martin", categoryId: 1, publisherId: 1, price: 59.00,  publishDate: "2020-01-01", intro: "如何写出可读、可维护的代码。", cover: null },
  { id: 7,  isbn: "9787020002207", title: "红楼梦",               author: "曹雪芹",            categoryId: 2, publisherId: 4, price: 59.70,  publishDate: "1996-12-01", intro: "中国古典小说四大名著之一。", cover: null },
  { id: 8,  isbn: "9787532776870", title: "活着",                 author: "余华",              categoryId: 2, publisherId: 3, price: 45.00,  publishDate: "2012-08-01", intro: "讲述一个人一生的苦难与坚韧。", cover: null },
  { id: 9,  isbn: "9787544253994", title: "百年孤独",             author: "加西亚·马尔克斯",   categoryId: 2, publisherId: 4, price: 55.00,  publishDate: "2011-06-01", intro: "魔幻现实主义文学的代表作。", cover: null },
  { id: 10, isbn: "9787020104345", title: "围城",                 author: "钱锺书",            categoryId: 2, publisherId: 4, price: 39.00,  publishDate: "2017-06-01", intro: "中国现代文学讽刺小说经典。", cover: null },
  { id: 11, isbn: "9787100132551", title: "万历十五年",           author: "黄仁宇",            categoryId: 3, publisherId: 3, price: 45.00,  publishDate: "2017-01-01", intro: "以大历史观剖析明代政治。", cover: null },
  { id: 12, isbn: "9787521703412", title: "人类简史",             author: "尤瓦尔·赫拉利",     categoryId: 3, publisherId: 3, price: 68.00,  publishDate: "2017-02-01", intro: "从认知革命讲到科学革命。", cover: null },
  { id: 13, isbn: "9787508684031", title: "原则",                 author: "瑞·达利欧",         categoryId: 4, publisherId: 3, price: 98.00,  publishDate: "2018-01-01", intro: "桥水基金创始人的工作与生活原则。", cover: null },
  { id: 14, isbn: "9787115473246", title: "经济学原理",           author: "曼昆",              categoryId: 4, publisherId: 2, price: 128.00, publishDate: "2020-06-01", intro: "经济学入门教材，十大原理开篇。", cover: null },
  { id: 15, isbn: "9787535795106", title: "时间简史",             author: "史蒂芬·霍金",       categoryId: 5, publisherId: 3, price: 55.00,  publishDate: "2010-04-01", intro: "从大爆炸讲到黑洞。", cover: null },
  { id: 16, isbn: "9787115373991", title: "数学之美",             author: "吴军",              categoryId: 5, publisherId: 1, price: 59.00,  publishDate: "2014-11-01", intro: "用信息论串起自然语言处理。", cover: null }
];

const MOCK_BORROWS = [
  { id: 101, readerId: 2, readerName: "张三", copyId: 1,  barcode: "BC000101", bookId: 1,  bookTitle: "Java核心技术 卷I",  bookAuthor: "Cay S. Horstmann", categoryName: "计算机",   borrowDate: "2026-09-20 10:20:00", dueDate: "2026-10-20 10:20:00", returnDate: null,                  status: "borrowed", renewCount: 0 },
  { id: 102, readerId: 2, readerName: "张三", copyId: 9,  barcode: "BC000301", bookId: 3,  bookTitle: "深入理解Java虚拟机", bookAuthor: "周志明",          categoryName: "计算机",   borrowDate: "2026-08-01 09:00:00", dueDate: "2026-08-31 09:00:00", returnDate: null,                  status: "borrowed", renewCount: 1 },
  { id: 103, readerId: 2, readerName: "张三", copyId: 25, barcode: "BC000701", bookId: 7,  bookTitle: "红楼梦",            bookAuthor: "曹雪芹",           categoryName: "文学小说", borrowDate: "2026-09-25 14:30:00", dueDate: "2026-10-25 14:30:00", returnDate: null,                  status: "borrowed", renewCount: 0 },
  { id: 104, readerId: 2, readerName: "张三", copyId: 33, barcode: "BC000901", bookId: 9,  bookTitle: "百年孤独",          bookAuthor: "加西亚·马尔克斯",  categoryName: "文学小说", borrowDate: "2026-06-10 11:00:00", dueDate: "2026-07-10 11:00:00", returnDate: "2026-07-05 16:20:00", status: "returned", renewCount: 0 },
  { id: 105, readerId: 2, readerName: "张三", copyId: 41, barcode: "BC001101", bookId: 11, bookTitle: "万历十五年",        bookAuthor: "黄仁宇",           categoryName: "历史",     borrowDate: "2026-05-02 09:40:00", dueDate: "2026-06-01 09:40:00", returnDate: "2026-06-12 10:00:00", status: "returned", renewCount: 0 },
  { id: 106, readerId: 3, readerName: "李四", copyId: 5,  barcode: "BC000201", bookId: 2,  bookTitle: "Effective Java",   bookAuthor: "Joshua Bloch",     categoryName: "计算机",   borrowDate: "2026-09-22 15:10:00", dueDate: "2026-10-22 15:10:00", returnDate: null,                  status: "borrowed", renewCount: 0 },
  { id: 107, readerId: 4, readerName: "王五", copyId: 49, barcode: "BC001301", bookId: 13, bookTitle: "原则",             bookAuthor: "瑞·达利欧",       categoryName: "经济管理", borrowDate: "2026-09-26 08:30:00", dueDate: "2026-10-26 08:30:00", returnDate: null,                  status: "borrowed", renewCount: 0 },
  { id: 108, readerId: 5, readerName: "赵六", copyId: 57, barcode: "BC001501", bookId: 15, bookTitle: "时间简史",          author: "史蒂芬·霍金",         categoryName: "科普",     borrowDate: "2026-07-15 13:00:00", dueDate: "2026-08-14 13:00:00", returnDate: "2026-08-20 09:15:00", status: "returned", renewCount: 0 }
];

/* 用户：4 个账号都能登录（密码统一 123456）
   ★ wangwu 故意设成【已禁言】——用来演示「被禁言时发帖入口消失」的 UI */
const MOCK_USERS = [
  { id: 1, username: "admin",    nickname: "图书馆管理员", phone: "13800000000", role: "admin",  maxBorrow: 99, status: 1, muteUntil: null, muteReason: null, createTime: "2026-08-01 09:00:00" },
  { id: 2, username: "zhangsan", nickname: "张三",        phone: "13800000001", role: "reader", maxBorrow: 5,  status: 1, muteUntil: null, muteReason: null, createTime: "2026-08-05 10:20:00" },
  { id: 3, username: "lisi",     nickname: "李四",        phone: "13800000002", role: "reader", maxBorrow: 5,  status: 1, muteUntil: null, muteReason: null, createTime: "2026-08-11 14:30:00" },
  { id: 4, username: "wangwu",   nickname: "王五",        phone: "13800000003", role: "reader", maxBorrow: 5,  status: 0, muteUntil: "2027-12-31 23:59:59", muteReason: "在论坛发布广告内容", createTime: "2026-08-15 09:10:00" },
  { id: 5, username: "zhaoliu",  nickname: "赵六",        phone: "13800000004", role: "reader", maxBorrow: 5,  status: 1, muteUntil: null, muteReason: null, createTime: "2026-08-20 16:40:00" }
];

/* ==================== 2. 论坛数据 ==================== */

const MOCK_FORUM_TAGS = ["general", "discussion", "review", "ask", "share"];

let MOCK_FORUM_POSTS = [
  { id: 1, userId: 3, title: "《高性能MySQL》第 5 章讲索引讲得真透，强烈推荐", tag: "review",
    content: "上周借了《高性能MySQL》，第 5 章把 B+ 树索引、最左前缀、覆盖索引这几块讲得非常清楚，\n配了不少 EXPLAIN 的例子。\n\n我之前一直搞不懂为什么 `WHERE a=1 AND c=3` 用不上 (a,b,c) 的联合索引，看完这章终于通了。\n建议配合图书馆的数据库实验一起做，效果很好。",
    images: [], isTop: 1, isEssence: 1, isLocked: 0, status: 1, viewCount: 342, likeCount: 27, commentCount: 3,
    createTime: "2026-10-10 09:20:00", lastReplyTime: "2026-10-13 21:05:00" },
  { id: 2, userId: 1, title: "【公告同步】图书馆 10 月新增 40 本计算机类图书", tag: "share",
    content: "本月新增计算机类图书 40 本，涵盖 Java、数据库、算法与人工智能方向，\n已全部上架至 A 区 3 排，欢迎借阅。\n\n借阅规则不变：同时最多 5 本，借期 30 天，可续借 1 次。",
    images: [], isTop: 1, isEssence: 0, isLocked: 0, status: 1, viewCount: 198, likeCount: 15, commentCount: 1,
    createTime: "2026-10-08 08:30:00", lastReplyTime: "2026-10-09 10:12:00" },
  { id: 3, userId: 2, title: "求推荐几本讲 MySQL 索引的书", tag: "ask",
    content: "最近在看 EXPLAIN 的执行计划，type 里 all / index / range / ref 老是分不清，\n有没有讲得比较系统的书？谢谢！",
    images: [], isTop: 0, isEssence: 0, isLocked: 0, status: 1, viewCount: 203, likeCount: 9, commentCount: 4,
    createTime: "2026-10-09 20:14:00", lastReplyTime: "2026-10-14 09:30:00" },
  { id: 4, userId: 3, title: "关于借阅到期提醒的一点建议", tag: "discussion",
    content: "希望系统能在应还日期前 3 天给个提醒，我上个月差点逾期。\n不知道大家有没有类似需求？",
    images: [], isTop: 0, isEssence: 0, isLocked: 0, status: 1, viewCount: 156, likeCount: 21, commentCount: 2,
    createTime: "2026-10-11 15:40:00", lastReplyTime: "2026-10-12 11:20:00" },
  { id: 5, userId: 2, title: "Java 集合源码怎么啃？", tag: "ask",
    content: "HashMap 的扩容机制、红黑树那段，看源码看得头大。\n大家都是怎么入门的？先看 1.7 再看 1.8 吗？",
    images: [], isTop: 0, isEssence: 0, isLocked: 0, status: 1, viewCount: 289, likeCount: 13, commentCount: 2,
    createTime: "2026-10-12 19:05:00", lastReplyTime: "2026-10-13 08:44:00" },
  { id: 6, userId: 5, title: "荐书：《代码整洁之道》读完之后我改了项目命名", tag: "review",
    content: "看完最大的收获是命名和函数的单一职责。\n我把项目里所有 `getData`、`handleInfo` 这种名字全改了一遍，可读性确实上来了。",
    images: [], isTop: 0, isEssence: 1, isLocked: 0, status: 1, viewCount: 174, likeCount: 18, commentCount: 1,
    createTime: "2026-10-13 10:15:00", lastReplyTime: "2026-10-13 16:02:00" },
  { id: 7, userId: 2, title: "图书馆的自习区现在几点关门？", tag: "general",
    content: "昨晚 9 点半去还被赶出来，是提前闭馆了吗？",
    images: [], isTop: 0, isEssence: 0, isLocked: 1, status: 1, viewCount: 96, likeCount: 2, commentCount: 1,
    createTime: "2026-10-13 21:30:00", lastReplyTime: "2026-10-13 22:10:00" },
  { id: 8, userId: 4, title: "低价出全新 Java 教材，私聊", tag: "other",
    content: "全新未拆封，需要的联系我。",
    images: [], isTop: 0, isEssence: 0, isLocked: 0, status: 0, rejectReason: null, viewCount: 41, likeCount: 0, commentCount: 0,
    createTime: "2026-10-13 23:50:00", lastReplyTime: null }
];

let MOCK_FORUM_COMMENTS = [
  { id: 101, postId: 1, userId: 2, parentId: null, replyToUserId: null, content: "确实！我还配合着《MySQL技术内幕》一起看，两边互补。", status: 1, createTime: "2026-10-10 11:00:00" },
  { id: 102, postId: 1, userId: 3, parentId: 101, replyToUserId: 2, content: "《MySQL技术内幕》我也借过，讲 InnoDB 那块更细。", status: 1, createTime: "2026-10-10 14:22:00" },
  { id: 103, postId: 1, userId: 5, parentId: null, replyToUserId: null, content: "收藏了，周末就去借。", status: 1, createTime: "2026-10-13 21:05:00" },

  { id: 104, postId: 2, userId: 2, parentId: null, replyToUserId: null, content: "太好了，正好想借一本讲 JVM 的。", status: 1, createTime: "2026-10-09 10:12:00" },

  { id: 105, postId: 3, userId: 5, parentId: null, replyToUserId: null, content: "《高性能MySQL》第 5 章，讲得最系统。", status: 1, createTime: "2026-10-10 08:30:00" },
  { id: 106, postId: 3, userId: 3, parentId: 105, replyToUserId: 5, content: "感谢，我去借这本。", status: 1, createTime: "2026-10-10 09:15:00" },
  { id: 107, postId: 3, userId: 1, parentId: null, replyToUserId: null, content: "馆内《MySQL技术内幕》还有 2 本在架，A 区 3 排。", status: 1, createTime: "2026-10-11 10:00:00" },
  { id: 108, postId: 3, userId: 2, parentId: 107, replyToUserId: 1, content: "收到，谢谢管理员！", status: 1, createTime: "2026-10-14 09:30:00" },

  { id: 109, postId: 4, userId: 2, parentId: null, replyToUserId: null, content: "同求，逾期罚款挺肉疼的。", status: 1, createTime: "2026-10-11 18:30:00" },
  { id: 110, postId: 4, userId: 1, parentId: null, replyToUserId: null, content: "已记录建议，后续版本会考虑。", status: 1, createTime: "2026-10-12 11:20:00" },

  { id: 111, postId: 5, userId: 3, parentId: null, replyToUserId: null, content: "建议先看 putVal 的流程，别一上来啃红黑树。", status: 1, createTime: "2026-10-12 20:40:00" },
  { id: 112, postId: 5, userId: 5, parentId: 111, replyToUserId: 3, content: "对，treeifyBin 那部分可以先跳过。", status: 1, createTime: "2026-10-13 08:44:00" },

  { id: 113, postId: 6, userId: 2, parentId: null, replyToUserId: null, content: "这本书确实是取名灾难的救星。", status: 1, createTime: "2026-10-13 16:02:00" },

  { id: 114, postId: 7, userId: 1, parentId: null, replyToUserId: null, content: "该帖因重复提问已锁定，开放时间见公告。", status: 1, createTime: "2026-10-13 22:10:00" }
];

let MOCK_FORUM_LIKES = [
  { postId: 1, userId: 2 }, { postId: 1, userId: 3 }, { postId: 1, userId: 5 },
  { postId: 3, userId: 2 }, { postId: 4, userId: 2 }, { postId: 5, userId: 3 },
  { postId: 6, userId: 2 }, { postId: 6, userId: 3 }
];

let MOCK_FORUM_REPORTS = [
  { id: 1, targetType: "post", targetId: 8, reporterId: 2, reasonType: "spam", reason: "这是在论坛卖书，属于广告", status: 0, handleBy: null, handleTime: null, handleAction: null, handleRemark: null, createTime: "2026-10-14 08:05:00" },
  { id: 2, targetType: "post", targetId: 7, reporterId: 3, reasonType: "other", reason: "重复提问", status: 1, handleBy: 1, handleTime: "2026-10-13 22:12:00", handleAction: "reject", handleRemark: "已由管理员锁帖", createTime: "2026-10-13 21:45:00" }
];

let __mockPostId = 100;
let __mockCommentId = 200;
let __mockReportId = 10;

/* ==================== 3. 公告数据 ==================== */

let MOCK_ANNOUNCEMENTS = [
  { id: 1, adminId: 1, title: "国庆假期开放时间调整通知", type: "notice", isTop: 1, status: 1,
    content: "各位读者：\n\n10 月 1 日至 10 月 3 日闭馆，10 月 4 日起恢复正常开放（8:30 - 21:30）。\n闭馆期间到期应还的图书，请于 10 月 7 日前归还，不计算逾期。\n\n图书馆",
    publishTime: "2026-09-28 08:00:00", updateTime: "2026-09-28 08:00:00" },
  { id: 2, adminId: 1, title: "关于借阅规则调整的说明", type: "rule", isTop: 1, status: 1,
    content: "自 10 月 1 日起：\n\n1. 每位读者同时可借图书由 3 本调整为 5 本；\n2. 借期仍为 30 天，可续借 1 次；\n3. 逾期罚款 0.5 元/天，单本上限 20 元。\n\n已在借的图书按新规则执行。",
    publishTime: "2026-09-25 10:30:00", updateTime: "2026-09-30 09:15:00" },
  { id: 3, adminId: 1, title: "10 月新增图书 40 本（计算机类）", type: "event", isTop: 0, status: 1,
    content: "本月新上架计算机类图书 40 本，涵盖 Java、数据库、算法、人工智能方向，\n已全部上架至 A 区 3 排。热门书目包括《高性能MySQL》《深入理解Java虚拟机》。",
    publishTime: "2026-10-08 08:30:00", updateTime: "2026-10-08 08:30:00" },
  { id: 4, adminId: 1, title: "图书馆自习区延长开放至 22:00", type: "event", isTop: 0, status: 1,
    content: "应读者建议，自习区开放时间由 21:00 延长至 22:00（周一至周五），\n周末维持 9:00 - 21:00。",
    publishTime: "2026-10-12 16:00:00", updateTime: "2026-10-12 16:00:00" },
  { id: 5, adminId: 1, title: "论坛发帖规范（试行）", type: "rule", isTop: 0, status: 1,
    content: "为维护交流环境，请遵守：\n\n1. 禁止发布广告、交易信息；\n2. 禁止人身攻击、辱骂；\n3. 提问前请先搜索历史帖；\n4. 违规内容将被隐藏或删除，严重者禁言。",
    publishTime: "2026-10-05 09:00:00", updateTime: "2026-10-05 09:00:00" }
];

/* 已读记录：只存 announcementId + userId（对齐 announcement_read 表） */
let MOCK_ANN_READ = [
  { announcementId: 1, userId: 2 }, { announcementId: 2, userId: 2 },
  { announcementId: 1, userId: 3 }
];

let __mockAnnId = 100;

/* ==================== 4. 个人中心状态 ==================== */

let MOCK_AVATAR = null;
try { MOCK_AVATAR = localStorage.getItem("bk_mock_avatar") || null; } catch (e) { /* 隐私模式 */ }
let MOCK_PWD = "123456";

function mockSetAvatar(v) {
  MOCK_AVATAR = v;
  try { v ? localStorage.setItem("bk_mock_avatar", v) : localStorage.removeItem("bk_mock_avatar"); } catch (e) { /* 忽略 */ }
}

/* 当前登录用户在 mock 下的「最新」形态（等价于 GET /api/user/profile） */
function mockMe() {
  const me = getUser();
  const base = MOCK_USERS.find(function (u) { return u.id === (me && me.id); }) || MOCK_USERS[1];
  return Object.assign({}, base, { avatar: MOCK_AVATAR });
}

/* ==================== 5. Mock 上传 ====================
 * 真上传：文件 → 服务端存盘 → 返回 URL。
 * 这里简化成：文件 → FileReader 读成 base64 → 当 URL 用。
 * 行为对齐（有进度回调、返回 { avatar } / { url }），页面代码一个字不用改。
 * ==================================================== */
function mockUpload(path, file, onProgress) {
  const isAvatar = path.indexOf("/api/user/avatar") === 0;
  const isUpload = path.indexOf("/api/upload") === 0;
  if (!isAvatar && !isUpload) return mockFail(404, "Mock 未实现的接口: " + path);
  if (!file) return mockFail(1000, "没有拿到文件");

  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onerror = function () { reject(new Error("读取文件失败")); };
    reader.onload = function () {
      const dataUrl = reader.result;
      let p = 0;
      const timer = setInterval(function () {
        p = Math.min(100, p + 25);
        if (onProgress) onProgress(p);
        if (p >= 100) {
          clearInterval(timer);
          if (isAvatar) { mockSetAvatar(dataUrl); resolve({ avatar: dataUrl }); }
          else { resolve({ url: dataUrl }); }
        }
      }, 70);
    };
    reader.readAsDataURL(file);
  });
}

/* ==================== 6. Mock 辅助 ==================== */

function mockFail(code, msg) {
  const e = new Error(msg);
  e.code = code;
  return Promise.reject(e);
}

function parseQuery(path) {
  const i = path.indexOf("?");
  const out = {};
  if (i < 0) return out;
  path.slice(i + 1).split("&").forEach(function (kv) {
    if (!kv) return;
    const p = kv.split("=");
    out[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
  });
  return out;
}

function pad2(n) { return String(n).padStart(2, "0"); }

function nowStr() {
  const d = new Date();
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
         " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
}

function addDaysStr(days) {
  const d = new Date(Date.now() + days * 86400000);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
         " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":00";
}

function addDaysStrTo(str, days) {
  const d = new Date(str.replace(/-/g, "/"));
  d.setDate(d.getDate() + days);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
         " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":00";
}

let __mockCopySeed = 500;
function BookishMockNextCopy() { return ++__mockCopySeed; }

function mockPaginate(list, p, defSize) {
  const total = list.length;
  const page = Number(p.page || 1);
  const size = Number(p.size || defSize || 10);
  return { total: total, page: page, size: size, list: list.slice((page - 1) * size, page * size) };
}

function mockUser(id) {
  return MOCK_USERS.find(function (u) { return u.id === id; }) || { id: id, nickname: "已注销", role: "reader", avatar: null };
}

/* 当前登录人（用于 Mock 里的权限判断，等价于后端从 token 取 loginUser） */
function mockCurrent() {
  const me = getUser();
  if (me) {
    const fresh = MOCK_USERS.find(function (u) { return u.id === me.id; });
    if (fresh) return Object.assign({}, fresh, { avatar: MOCK_AVATAR });
    return me;
  }
  return MOCK_USERS[1];
}

function mockIsAdmin() { return mockCurrent().role === "admin"; }

/* 禁言校验（对齐后端 2007）：status=0 且（无截止时间 或 未到期） */
function mockMuted(u) {
  u = u || mockCurrent();
  if (u.status !== 0) return null;
  if (u.muteUntil && new Date(u.muteUntil.replace(/-/g, "/")) < new Date()) return null;
  return { until: u.muteUntil, reason: u.muteReason };
}

function mockPostVo(p) {
  const u = mockUser(p.userId);
  const me = mockCurrent();
  return Object.assign({}, p, {
    excerpt: (p.content || "").slice(0, 80),
    authorId: p.userId,
    authorName: u.nickname,
    authorAvatar: u.id === me.id ? MOCK_AVATAR : (u.avatar || null),
    authorRole: u.role,
    liked: MOCK_FORUM_LIKES.some(function (l) { return l.postId === p.id && l.userId === me.id; })
  });
}

/* 帖子列表排序规则（和后端 XML 的 ORDER BY 完全一致） */
function mockSortPosts(list, sort) {
  return list.slice().sort(function (a, b) {
    if (a.isTop !== b.isTop) return b.isTop - a.isTop;      // 置顶永远最前
    if (sort === "hot") {
      const sa = a.viewCount + a.likeCount * 3 + a.commentCount * 5;
      const sb = b.viewCount + b.likeCount * 3 + b.commentCount * 5;
      return sb - sa;
    }
    if (sort === "active") {
      const ta = a.lastReplyTime || a.createTime;
      const tb = b.lastReplyTime || b.createTime;
      return tb.localeCompare(ta);
    }
    return b.createTime.localeCompare(a.createTime);         // newest
  });
}

/* ==================== 7. 请求路由 ==================== */

function mockRequest(method, path, body) {
  const q = path.split("?")[0];
  const p = parseQuery(path);
  const me = mockCurrent();

  /* ---------- 认证 ---------- */
  if (q === "/api/login" && method === "POST") {
    const u = MOCK_USERS.find(function (x) { return x.username === body.username; });
    if (!u) return mockFail(1001, "用户不存在");
    if (body.password !== MOCK_PWD) return mockFail(1002, "密码错误");
    /* 登录响应里带 status / muteUntil / muteReason —— 前端据此禁用发帖入口 */
    const out = Object.assign({}, u, { avatar: u.id === 2 ? MOCK_AVATAR : null });
    delete out.password;
    return Promise.resolve({ token: "mock-token-" + u.role + "-" + u.id, user: out });
  }
  if (q === "/api/register" && method === "POST") return Promise.resolve(null);
  if (q === "/api/logout") return Promise.resolve(null);

  /* ---------- 个人中心 ---------- */
  if (q === "/api/user/profile" && method === "GET") return Promise.resolve(mockMe());
  if (q === "/api/user/profile" && method === "PUT") {
    const u = MOCK_USERS.find(function (x) { return x.id === (getUser() || {}).id; });
    if (!u) return mockFail(1001, "用户不存在");
    if (body && typeof body.nickname === "string" && body.nickname.trim()) u.nickname = body.nickname.trim();
    if (body && typeof body.phone === "string") u.phone = body.phone.trim();
    return Promise.resolve(mockMe());
  }
  if (q === "/api/user/avatar" && method === "DELETE") { mockSetAvatar(null); return Promise.resolve(null); }
  if (q === "/api/user/password" && method === "PUT") {
    if (!body || !body.oldPassword) return mockFail(1000, "请填写原密码");
    if (body.oldPassword !== MOCK_PWD) return mockFail(1002, "原密码不正确");
    if (!body.newPassword || body.newPassword.length < 6) return mockFail(1000, "新密码至少 6 位");
    MOCK_PWD = body.newPassword;
    return Promise.resolve(null);
  }

  /* ---------- 基础数据 ---------- */
  if (q === "/api/categories") return Promise.resolve(MOCK_CATEGORIES);
  if (q === "/api/publishers") return Promise.resolve(MOCK_PUBLISHERS);

  /* ---------- 图书 ---------- */
  if (q === "/api/books" && method === "GET") {
    let list = MOCK_BOOKS.map(mockBookVo);
    if (p.keyword) {
      const kw = p.keyword.toLowerCase();
      list = list.filter(function (b) {
        return b.title.toLowerCase().indexOf(kw) >= 0 || b.author.toLowerCase().indexOf(kw) >= 0;
      });
    }
    if (p.categoryId) list = list.filter(function (b) { return b.categoryId === Number(p.categoryId); });
    if (p.publisherId) list = list.filter(function (b) { return b.publisherId === Number(p.publisherId); });
    if (p.onlyAvailable === "true") list = list.filter(function (b) { return b.availableCopies > 0; });

    const sort = p.sort || "newest";
    if (sort === "priceAsc") list.sort(function (a, b) { return a.price - b.price; });
    else if (sort === "priceDesc") list.sort(function (a, b) { return b.price - a.price; });
    else if (sort === "hot") list.sort(function (a, b) { return b.borrowCount - a.borrowCount; });
    else list.sort(function (a, b) { return b.id - a.id; });

    return Promise.resolve(mockPaginate(list, p, 15));
  }

  if (q === "/api/books/hot") {
    const list = MOCK_BOOKS.map(mockBookVo)
      .sort(function (a, b) { return b.borrowCount - a.borrowCount; })
      .slice(0, 10);
    return Promise.resolve(list);
  }

  if (q.indexOf("/api/books/") === 0) {
    const id = Number(q.split("/").pop());
    const b = MOCK_BOOKS.find(function (x) { return x.id === id; });
    if (!b) return mockFail(1003, "图书不存在");
    const vo = mockBookVo(b);
    const copies = [];
    for (let i = 1; i <= vo.totalCopies; i++) {
      const cid = (b.id - 1) * 4 + i;
      const borrowed = MOCK_BORROWS.some(function (r) { return r.copyId === cid && r.status === "borrowed"; });
      copies.push({
        id: cid,
        barcode: "BC" + String(b.id).padStart(4, "0") + String(i).padStart(2, "0"),
        status: borrowed ? "borrowed" : "available",
        location: "A区-" + (i + b.id) % 20 + "-" + b.id % 8
      });
    }
    vo.copies = copies;
    return Promise.resolve(vo);
  }

  /* ---------- 借阅 ---------- */
  if (q === "/api/borrows/summary") {
    const mine = MOCK_BORROWS.filter(function (r) { return r.readerId === me.id; }).map(mockDecorateBorrow);
    return Promise.resolve({
      borrowing: mine.filter(function (r) { return r.status === "borrowed"; }).length,
      overdue: mine.filter(function (r) { return r.overdue; }).length,
      returned: mine.filter(function (r) { return r.status === "returned"; }).length,
      unpaidFine: 2.5
    });
  }

  if (q === "/api/borrows" && method === "GET") {
    let list = MOCK_BORROWS.filter(function (r) {
      return me.role === "admin" ? true : r.readerId === me.id;
    }).map(mockDecorateBorrow);

    if (p.status === "borrowed") list = list.filter(function (r) { return r.status === "borrowed" && !r.returnDate; });
    else if (p.status === "returned") list = list.filter(function (r) { return r.status === "returned"; });
    else if (p.status === "overdue") list = list.filter(function (r) { return r.overdue; });

    list.sort(function (a, b) { return b.id - a.id; });
    return Promise.resolve(mockPaginate(list, p, 10));
  }

  if (q === "/api/borrows" && method === "POST") {
    const bookId = body.bookId;
    const b = MOCK_BOOKS.find(function (x) { return x.id === bookId; });
    if (!b) return mockFail(1003, "图书不存在");
    const vo = mockBookVo(b);
    if (vo.availableCopies <= 0) return mockFail(2001, "该图书暂无可借副本");
    const mine = MOCK_BORROWS.filter(function (r) { return r.readerId === me.id && r.status === "borrowed"; });
    if (mine.length >= me.maxBorrow) return mockFail(2002, "超出可借上限");
    if (mine.some(function (r) { return mockDecorateBorrow(r).overdue; })) return mockFail(2003, "有逾期未还，请先归还");

    const newRec = {
      id: 200 + MOCK_BORROWS.length,
      readerId: me.id, readerName: me.nickname,
      copyId: BookishMockNextCopy(), barcode: "BC" + String(b.id).padStart(4, "0") + "99",
      bookId: b.id, bookTitle: b.title, bookAuthor: b.author, categoryName: vo.categoryName,
      borrowDate: nowStr(), dueDate: addDaysStr(30),
      returnDate: null, status: "borrowed", renewCount: 0
    };
    MOCK_BORROWS.push(newRec);
    return Promise.resolve({ recordId: newRec.id, dueDate: newRec.dueDate });
  }

  if (/^\/api\/borrows\/\d+\/return$/.test(q) && method === "PUT") {
    const id = Number(q.split("/")[3]);
    const rec = MOCK_BORROWS.find(function (r) { return r.id === id; });
    if (!rec) return mockFail(1003, "借阅记录不存在");
    if (rec.status === "returned") return mockFail(2004, "该记录已归还");
    const d = mockDecorateBorrow(rec);
    rec.returnDate = nowStr();
    rec.status = "returned";
    const fine = Math.min(20, d.overdueDays * 0.5);
    return Promise.resolve({ overdueDays: d.overdueDays, fineAmount: Number(fine.toFixed(2)) });
  }

  if (/^\/api\/borrows\/\d+\/renew$/.test(q) && method === "PUT") {
    const id = Number(q.split("/")[3]);
    const rec = MOCK_BORROWS.find(function (r) { return r.id === id; });
    if (!rec) return mockFail(1003, "借阅记录不存在");
    if (rec.status === "returned") return mockFail(2004, "该记录已归还");
    if (mockDecorateBorrow(rec).overdue) return mockFail(2003, "已逾期，不能续借");
    if (rec.renewCount >= 2) return mockFail(2005, "超过最大续借次数");
    rec.renewCount += 1;
    rec.dueDate = addDaysStrTo(rec.dueDate, 30);
    return Promise.resolve({ newDueDate: rec.dueDate, renewCount: rec.renewCount });
  }

  /* ---------- 管理端：图书 ---------- */
  if (q === "/api/admin/borrows") {
    let list = MOCK_BORROWS.map(mockDecorateBorrow);
    if (p.keyword) {
      const kw = p.keyword.toLowerCase();
      list = list.filter(function (r) {
        return (r.readerName || "").toLowerCase().indexOf(kw) >= 0
            || (r.bookTitle || "").toLowerCase().indexOf(kw) >= 0
            || (r.barcode || "").toLowerCase().indexOf(kw) >= 0;
      });
    }
    if (p.status === "borrowed") list = list.filter(function (r) { return r.status === "borrowed" && !r.returnDate; });
    else if (p.status === "returned") list = list.filter(function (r) { return r.status === "returned"; });
    else if (p.status === "overdue") list = list.filter(function (r) { return r.overdue; });
    list.sort(function (a, b) { return b.id - a.id; });
    return Promise.resolve(mockPaginate(list, p, 10));
  }

  if (q === "/api/admin/stats") {
    const all = MOCK_BORROWS.map(mockDecorateBorrow);
    const catMap = {};
    all.forEach(function (r) { catMap[r.categoryName] = (catMap[r.categoryName] || 0) + 1; });
    return Promise.resolve({
      bookCount: MOCK_BOOKS.length,
      copyCount: MOCK_BOOKS.length * 4,
      readerCount: MOCK_USERS.filter(function (u) { return u.role === "reader"; }).length,
      borrowingCount: all.filter(function (r) { return r.status === "borrowed"; }).length,
      overdueCount: all.filter(function (r) { return r.overdue; }).length,
      todayBorrowCount: 2,
      unpaidFineTotal: 2.5,
      postCount: MOCK_FORUM_POSTS.filter(function (x) { return x.status === 1; }).length,
      pendingPosts: MOCK_FORUM_POSTS.filter(function (x) { return x.status === 0; }).length,
      pendingReports: MOCK_FORUM_REPORTS.filter(function (x) { return x.status === 0; }).length,
      categoryStats: Object.keys(catMap).map(function (k) { return { categoryName: k, borrowCount: catMap[k] }; })
        .sort(function (a, b) { return b.borrowCount - a.borrowCount; }),
      monthlyStats: [
        { month: "2026-05", borrowCount: 1 }, { month: "2026-06", borrowCount: 1 },
        { month: "2026-07", borrowCount: 1 }, { month: "2026-08", borrowCount: 1 },
        { month: "2026-09", borrowCount: 4 }, { month: "2026-10", borrowCount: 3 }
      ]
    });
  }

  if (q === "/api/admin/books" && method === "POST") {
    const id = Math.max.apply(null, MOCK_BOOKS.map(function (b) { return b.id; })) + 1;
    MOCK_BOOKS.push({
      id: id, isbn: body.isbn, title: body.title, author: body.author,
      categoryId: body.categoryId, publisherId: body.publisherId,
      price: body.price, publishDate: body.publishDate, intro: body.intro, cover: null
    });
    return Promise.resolve({ bookId: id, copyCount: body.copyCount || 1 });
  }

  if (/^\/api\/admin\/books\/\d+$/.test(q)) {
    const id = Number(q.split("/").pop());
    const b = MOCK_BOOKS.find(function (x) { return x.id === id; });
    if (method === "PUT") {
      if (!b) return mockFail(1003, "图书不存在");
      Object.assign(b, body);
      return Promise.resolve(null);
    }
    if (method === "DELETE") {
      if (!b) return mockFail(1003, "图书不存在");
      if (MOCK_BORROWS.some(function (r) { return r.bookId === id; })) return mockFail(2006, "图书有借阅记录，不能删除");
      MOCK_BOOKS.splice(MOCK_BOOKS.indexOf(b), 1);
      return Promise.resolve(null);
    }
  }

  /* ==================== 论坛 ==================== */

  /* 3.10 论坛概览（放在 /api/forum/posts 之前判断，否则会被前缀匹配吃掉） */
  if (q === "/api/forum/stats") {
    const today = nowStr().slice(0, 10);
    return Promise.resolve({
      totalPosts: MOCK_FORUM_POSTS.filter(function (x) { return x.status === 1; }).length,
      todayPosts: MOCK_FORUM_POSTS.filter(function (x) { return x.status === 1 && x.createTime.slice(0, 10) === today; }).length,
      totalComments: MOCK_FORUM_COMMENTS.filter(function (c) { return c.status === 1; }).length,
      myPosts: MOCK_FORUM_POSTS.filter(function (x) { return x.userId === me.id && x.status === 1; }).length,
      myComments: MOCK_FORUM_COMMENTS.filter(function (c) { return c.userId === me.id && c.status === 1; }).length,
      likeReceived: MOCK_FORUM_POSTS.filter(function (x) { return x.userId === me.id; })
        .reduce(function (s, x) { return s + x.likeCount; }, 0),
      pendingPosts: mockIsAdmin()
        ? MOCK_FORUM_POSTS.filter(function (x) { return x.status === 0; }).length : 0,
      pendingReports: mockIsAdmin() ? MOCK_FORUM_REPORTS.filter(function (x) { return x.status === 0; }).length : 0
    });
  }

  /* 3.1 帖子列表 */
  if (q === "/api/forum/posts" && method === "GET") {
    /* status 语义：0 待审核 / 1 已发布 / 2 已驳回 / -1 已删除。
     * 可见性：管理员可按 ?status= 审核任意状态；
     * 普通用户看全部「已发布」+ 自己的「待审核 / 已驳回」（先覆盖再查询，Service 兜底）。 */
    let want = (p.status !== undefined && p.status !== "") ? Number(p.status) : 1;
    let list;
    if (mockIsAdmin()) {
      list = MOCK_FORUM_POSTS.filter(function (x) { return x.status === want; });
    } else {
      list = MOCK_FORUM_POSTS.filter(function (x) {
        return x.status === want ||
               (x.userId === me.id && (x.status === 0 || x.status === 2));
      });
    }

    if (p.keyword) {
      const kw = p.keyword.toLowerCase();
      list = list.filter(function (x) {
        return x.title.toLowerCase().indexOf(kw) >= 0 || x.content.toLowerCase().indexOf(kw) >= 0;
      });
    }
    if (p.tag) list = list.filter(function (x) { return x.tag === p.tag; });
    if (p.mine === "true") list = list.filter(function (x) { return x.userId === me.id; });
    if (p.essenceOnly === "true") list = list.filter(function (x) { return x.isEssence === 1; });

    list = mockSortPosts(list, p.sort || "newest").map(mockPostVo);
    return Promise.resolve(mockPaginate(list, p, 10));
  }

  /* 3.3 发帖 */
  if (q === "/api/forum/posts" && method === "POST") {
    const mu = mockMuted(me);
    if (mu) return mockFail(2007, "你已被禁言，不能发帖" + (mu.until ? "（解除时间 " + mu.until.slice(0, 10) + "）" : "（永久）"));
    if (!body.title || !body.title.trim()) return mockFail(1004, "标题不能为空");
    if (!body.content || !body.content.trim()) return mockFail(1004, "正文不能为空");
    const imgs = body.images || [];
    if (imgs.length > 3) return mockFail(3006, "最多上传 3 张图片");

    const post = {
      id: ++__mockPostId,
      userId: me.id,
      title: body.title.trim(),
      content: body.content,
      tag: MOCK_FORUM_TAGS.indexOf(body.tag) >= 0 ? body.tag : "general",
      images: imgs.slice(0, 3),
      isTop: 0, isEssence: 0, isLocked: 0,
      /* 普通用户先进审核队列；管理员发的帖免审直接发布 */
      status: mockIsAdmin() ? 1 : 0, rejectReason: null,
      viewCount: 0, likeCount: 0, commentCount: 0,
      createTime: nowStr(), lastReplyTime: null
    };
    MOCK_FORUM_POSTS.unshift(post);
    return Promise.resolve({ id: post.id });
  }

  /* 3.6 评论列表 */
  if (/^\/api\/forum\/posts\/\d+\/comments$/.test(q) && method === "GET") {
    const postId = Number(q.split("/")[4]);
    const roots = MOCK_FORUM_COMMENTS
      .filter(function (c) { return c.postId === postId && c.status === 1 && c.parentId === null; })
      .sort(function (a, b) { return a.createTime.localeCompare(b.createTime); })
      .map(function (c) { return mockCommentVo(c); });

    const ids = roots.map(function (c) { return c.id; });
    const replies = MOCK_FORUM_COMMENTS
      .filter(function (c) { return ids.indexOf(c.parentId) >= 0 && c.status === 1; })
      .sort(function (a, b) { return a.createTime.localeCompare(b.createTime); });
    replies.forEach(function (c) {
      const parent = roots.find(function (r) { return r.id === c.parentId; });
      if (parent) parent.children.push(mockCommentVo(c));
    });
    return Promise.resolve(mockPaginate(roots, p, 15));
  }

  /* 3.7 发评论 / 回复 */
  if (/^\/api\/forum\/posts\/\d+\/comments$/.test(q) && method === "POST") {
    const postId = Number(q.split("/")[4]);
    const post = MOCK_FORUM_POSTS.find(function (x) { return x.id === postId && x.status === 1; });
    if (!post) return mockFail(3001, "帖子不存在或已删除");
    if (post.isLocked === 1) return mockFail(2008, "帖子已锁定，无法回复");
    const mu = mockMuted(me);
    if (mu) return mockFail(2007, "你已被禁言，不能发言");
    if (!body.content || !body.content.trim()) return mockFail(1004, "评论内容不能为空");
    if (body.content.length > 1000) return mockFail(1004, "评论不能超过 1000 字");

    let replyTo = null;
    if (body.parentId) {
      const parent = MOCK_FORUM_COMMENTS.find(function (c) {
        return c.id === body.parentId && c.postId === postId && c.parentId === null && c.status === 1;
      });
      if (!parent) return mockFail(1004, "回复的评论不存在");
      replyTo = parent.userId;
    }

    const c = {
      id: ++__mockCommentId, postId: postId, userId: me.id,
      parentId: body.parentId || null, replyToUserId: replyTo,
      content: body.content, status: 1, createTime: nowStr()
    };
    MOCK_FORUM_COMMENTS.push(c);
    post.commentCount += 1;
    post.lastReplyTime = c.createTime;
    return Promise.resolve({ id: c.id });
  }

  /* 3.9 点赞 / 取消（toggle） */
  if (/^\/api\/forum\/posts\/\d+\/like$/.test(q) && method === "POST") {
    const postId = Number(q.split("/")[4]);
    const post = MOCK_FORUM_POSTS.find(function (x) { return x.id === postId && x.status === 1; });
    if (!post) return mockFail(3001, "帖子不存在或已删除");
    const idx = MOCK_FORUM_LIKES.findIndex(function (l) { return l.postId === postId && l.userId === me.id; });
    if (idx >= 0) {
      MOCK_FORUM_LIKES.splice(idx, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
      return Promise.resolve({ liked: false, likeCount: post.likeCount });
    }
    MOCK_FORUM_LIKES.push({ postId: postId, userId: me.id });
    post.likeCount += 1;
    return Promise.resolve({ liked: true, likeCount: post.likeCount });
  }

  /* 3.12a / 3.12b 帖子审核（管理员）：通过 / 驳回
   * 必须放在「帖子详情」的正则之前判断，避免被吃掉。 */
  if (/^\/api\/forum\/admin\/posts\/\d+\/(approve|reject)$/.test(q) && method === "POST") {
    if (!mockIsAdmin()) return mockFail(2003, "无权限操作");
    const parts = q.split("/");
    const id = Number(parts[parts.length - 2]);
    const act = parts[parts.length - 1];
    const post = MOCK_FORUM_POSTS.find(function (x) { return x.id === id; });
    if (!post || post.status === -1) return mockFail(3001, "帖子不存在或已删除");
    if (post.status !== 0) return mockFail(3008, "该帖不在待审核状态");
    if (act === "approve") {
      post.status = 1;
      post.rejectReason = null;
    } else {
      post.status = 2;
      post.rejectReason = (body && body.reason && body.reason.trim()) || "内容不符合社区规范";
    }
    return Promise.resolve(null);
  }

  /* 3.4 / 3.5 / 3.2 帖子详情、编辑、删除 */
  if (/^\/api\/forum\/posts\/\d+$/.test(q)) {
    const id = Number(q.split("/").pop());
    const post = MOCK_FORUM_POSTS.find(function (x) { return x.id === id; });
    if (!post || post.status === -1) return mockFail(3001, "帖子不存在或已删除");
    const isOwner = post.userId === me.id;
    const isAdmin = mockIsAdmin();
    /* 待审核 / 已驳回的帖子：只有作者本人和管理员能看到（普通用户视为不存在） */
    if ((post.status === 0 || post.status === 2) && !isAdmin && !isOwner) return mockFail(3001, "帖子不存在或已删除");

    if (method === "GET") {
      if (post.status === 1) post.viewCount += 1;      // 浏览数原子自增
      return Promise.resolve(Object.assign(mockPostVo(post), {
        canEdit: isAdmin ? post.status !== -1
                         : (isOwner && post.status !== -1 && post.isLocked === 0),
        canDelete: isOwner || isAdmin,
        canReport: post.status === 1 && !isOwner && !isAdmin &&
          !MOCK_FORUM_REPORTS.some(function (r) { return r.targetType === "post" && r.targetId === id && r.reporterId === me.id; }),
        isAdmin: isAdmin
      }));
    }
    if (method === "PUT") {
      if (!isOwner && !isAdmin) return mockFail(3003, "只能操作自己的内容");
      if (post.isLocked === 1 && !isAdmin) return mockFail(2008, "帖子已锁定");
      if (body.title !== undefined) post.title = body.title;
      if (body.content !== undefined) post.content = body.content;
      if (body.tag !== undefined && MOCK_FORUM_TAGS.indexOf(body.tag) >= 0) post.tag = body.tag;
      if (body.images !== undefined) {
        if (body.images.length > 3) return mockFail(3006, "最多上传 3 张图片");
        post.images = body.images.slice(0, 3);
      }
      /* 作者改待审核 / 被驳回的帖 = 重新提交审核；管理员编辑不改状态 */
      if (isOwner && !isAdmin && (post.status === 0 || post.status === 2)) {
        post.status = 0;
        post.rejectReason = null;
      }
      return Promise.resolve(null);
    }
    if (method === "DELETE") {
      if (!isOwner && !isAdmin) return mockFail(3003, "只能操作自己的内容");
      post.status = -1;                                 // 软删
      return Promise.resolve(null);
    }
  }

  /* 3.8 删除评论 */
  if (/^\/api\/forum\/comments\/\d+$/.test(q) && method === "DELETE") {
    const id = Number(q.split("/").pop());
    const c = MOCK_FORUM_COMMENTS.find(function (x) { return x.id === id; });
    if (!c || c.status === -1) return mockFail(3002, "评论不存在");
    if (c.userId !== me.id && !mockIsAdmin()) return mockFail(3003, "只能操作自己的内容");
    const post = MOCK_FORUM_POSTS.find(function (x) { return x.id === c.postId; });
    const kids = MOCK_FORUM_COMMENTS.filter(function (x) { return x.parentId === c.id && x.status === 1; });
    c.status = -1;
    if (post) post.commentCount = Math.max(0, post.commentCount - 1 - kids.length);
    kids.forEach(function (x) { x.status = -1; });        // 一级评论删除 → 二级一并软删
    return Promise.resolve(null);
  }

  /* 3.11 举报 */
  if (q === "/api/forum/reports" && method === "POST") {
    const mu = mockMuted(me);
    if (mu) return mockFail(2007, "你已被禁言，不能举报");
    if (body.targetType !== "post" && body.targetType !== "comment") return mockFail(1004, "参数错误");
    const dup = MOCK_FORUM_REPORTS.some(function (r) {
      return r.reporterId === me.id && r.targetType === body.targetType && r.targetId === body.targetId;
    });
    if (dup) return mockFail(3005, "你已经举报过这条内容了");
    const own = body.targetType === "post"
      ? (MOCK_FORUM_POSTS.find(function (x) { return x.id === body.targetId; }) || {}).userId === me.id
      : (MOCK_FORUM_COMMENTS.find(function (x) { return x.id === body.targetId; }) || {}).userId === me.id;
    if (own) return mockFail(1004, "不能举报自己的内容");

    const r = {
      id: ++__mockReportId, targetType: body.targetType, targetId: body.targetId,
      reporterId: me.id, reasonType: body.reasonType || "other", reason: body.reason || "",
      status: 0, handleBy: null, handleTime: null, handleAction: null, handleRemark: null, createTime: nowStr()
    };
    MOCK_FORUM_REPORTS.push(r);
    return Promise.resolve({ id: r.id });
  }

  /* ---------- 管理端：论坛 ---------- */

  /* 3.12 置顶 / 加精 / 锁帖 */
  if (/^\/api\/admin\/forum\/posts\/\d+\/flags$/.test(q) && method === "PUT") {
    if (!mockIsAdmin()) return mockFail(403, "无权限");
    const id = Number(q.split("/")[5]);
    const post = MOCK_FORUM_POSTS.find(function (x) { return x.id === id; });
    if (!post) return mockFail(3001, "帖子不存在");
    ["isTop", "isEssence", "isLocked", "status"].forEach(function (k) {
      if (body[k] !== undefined && body[k] !== null) post[k] = body[k];
    });
    return Promise.resolve(null);
  }

  /* 3.13 举报列表 */
  if (q === "/api/admin/forum/reports" && method === "GET") {
    if (!mockIsAdmin()) return mockFail(403, "无权限");
    let list = MOCK_FORUM_REPORTS.slice();
    if (p.status !== undefined && p.status !== "") list = list.filter(function (r) { return r.status === Number(p.status); });
    if (p.targetType) list = list.filter(function (r) { return r.targetType === p.targetType; });
    list.sort(function (a, b) { return a.status - b.status || b.createTime.localeCompare(a.createTime); });
    list = list.map(mockReportVo);
    return Promise.resolve(mockPaginate(list, p, 10));
  }

  /* 3.14 处理举报 */
  if (/^\/api\/admin\/forum\/reports\/\d+$/.test(q) && method === "PUT") {
    if (!mockIsAdmin()) return mockFail(403, "无权限");
    const id = Number(q.split("/").pop());
    const r = MOCK_FORUM_REPORTS.find(function (x) { return x.id === id; });
    if (!r) return mockFail(3004, "举报不存在");
    if (r.status !== 0) return mockFail(3007, "该举报已处理过");

    const action = body.action || "reject";
    if (r.targetType === "post") {
      const post = MOCK_FORUM_POSTS.find(function (x) { return x.id === r.targetId; });
      if (post) {
        if (action === "hide" || action === "mute") post.status = 0;
        if (action === "delete") post.status = -1;
      }
    } else {
      const c = MOCK_FORUM_COMMENTS.find(function (x) { return x.id === r.targetId; });
      if (c) {
        if (action === "hide" || action === "mute") c.status = 0;
        if (action === "delete") c.status = -1;
      }
    }
    if (action === "mute" && body.muteDays != null) {
      const target = r.targetType === "post"
        ? (MOCK_FORUM_POSTS.find(function (x) { return x.id === r.targetId; }) || {}).userId
        : (MOCK_FORUM_COMMENTS.find(function (x) { return x.id === r.targetId; }) || {}).userId;
      const u = MOCK_USERS.find(function (x) { return x.id === target; });
      if (u) { u.status = 0; u.muteUntil = addDaysStr(body.muteDays); u.muteReason = body.remark || "违反社区规范"; }
    }
    r.status = action === "reject" ? 2 : 1;
    r.handleBy = me.id; r.handleTime = nowStr();
    r.handleAction = action; r.handleRemark = body.remark || "";
    return Promise.resolve(null);
  }

  /* 3.15 用户列表 */
  if (q === "/api/admin/users" && method === "GET") {
    if (!mockIsAdmin()) return mockFail(403, "无权限");
    let list = MOCK_USERS.map(function (u) {
      return Object.assign({}, u, {
        postCount: MOCK_FORUM_POSTS.filter(function (x) { return x.userId === u.id && x.status === 1; }).length,
        commentCount: MOCK_FORUM_COMMENTS.filter(function (c) { return c.userId === u.id && c.status === 1; }).length,
        borrowingCount: MOCK_BORROWS.filter(function (r) { return r.readerId === u.id && r.status === "borrowed"; }).length
      });
    });
    if (p.keyword) {
      const kw = p.keyword.toLowerCase();
      list = list.filter(function (u) {
        return u.username.toLowerCase().indexOf(kw) >= 0 || u.nickname.toLowerCase().indexOf(kw) >= 0;
      });
    }
    if (p.role) list = list.filter(function (u) { return u.role === p.role; });
    if (p.status !== undefined && p.status !== "") list = list.filter(function (u) { return u.status === Number(p.status); });
    list.sort(function (a, b) { return a.id - b.id; });
    return Promise.resolve(mockPaginate(list, p, 10));
  }

  /* 3.16 / 3.17 禁言 / 解禁 */
  if (/^\/api\/admin\/users\/\d+\/mute$/.test(q) && method === "PUT") {
    if (!mockIsAdmin()) return mockFail(403, "无权限");
    const id = Number(q.split("/")[4]);
    const u = MOCK_USERS.find(function (x) { return x.id === id; });
    if (!u) return mockFail(1003, "用户不存在");
    if (u.id === me.id || u.role === "admin") return mockFail(1004, "不能禁言自己或其他管理员");
    u.status = 0;
    u.muteUntil = body.days == null ? null : addDaysStr(body.days);
    u.muteReason = body.reason || "违反社区规范";
    return Promise.resolve({ muteUntil: u.muteUntil });
  }
  if (/^\/api\/admin\/users\/\d+\/unmute$/.test(q) && method === "PUT") {
    if (!mockIsAdmin()) return mockFail(403, "无权限");
    const id = Number(q.split("/")[3]);
    const u = MOCK_USERS.find(function (x) { return x.id === id; });
    if (!u) return mockFail(1003, "用户不存在");
    u.status = 1; u.muteUntil = null; u.muteReason = null;
    return Promise.resolve(null);
  }

  /* ==================== 公告 ==================== */

  /* 4.5 未读数（放在具体路径之前，避免被 /api/announcements 前缀吃掉） */
  if (q === "/api/announcements/unread-count") {
    const unread = MOCK_ANNOUNCEMENTS.filter(function (a) {
      return a.status === 1 && !MOCK_ANN_READ.some(function (r) { return r.announcementId === a.id && r.userId === me.id; });
    }).length;
    return Promise.resolve({ unread: unread });
  }

  /* 4.4 全部已读 */
  if (q === "/api/announcements/read-all" && method === "POST") {
    MOCK_ANNOUNCEMENTS.forEach(function (a) {
      if (a.status !== 1) return;
      if (!MOCK_ANN_READ.some(function (r) { return r.announcementId === a.id && r.userId === me.id; })) {
        MOCK_ANN_READ.push({ announcementId: a.id, userId: me.id });
      }
    });
    return Promise.resolve(null);
  }

  /* 4.1 公告列表 */
  if (q === "/api/announcements" && method === "GET") {
    let list = MOCK_ANNOUNCEMENTS.filter(function (a) { return a.status === 1; });
    if (p.keyword) {
      const kw = p.keyword.toLowerCase();
      list = list.filter(function (a) {
        return a.title.toLowerCase().indexOf(kw) >= 0 || a.content.toLowerCase().indexOf(kw) >= 0;
      });
    }
    if (p.type) list = list.filter(function (a) { return a.type === p.type; });

    list = list.map(function (a) {
      const u = mockUser(a.adminId);
      return Object.assign({}, a, {
        excerpt: a.content.slice(0, 80),
        adminName: u.nickname,
        isRead: MOCK_ANN_READ.some(function (r) { return r.announcementId === a.id && r.userId === me.id; }),
        readCount: MOCK_ANN_READ.filter(function (r) { return r.announcementId === a.id; }).length
      });
    });
    if (p.onlyUnread === "true") list = list.filter(function (a) { return !a.isRead; });

    /* 置顶优先 + 发布时间倒序 */
    list.sort(function (a, b) {
      if (a.isTop !== b.isTop) return b.isTop - a.isTop;
      return b.publishTime.localeCompare(a.publishTime);
    });
    return Promise.resolve(mockPaginate(list, p, 10));
  }

  /* 4.6 新增公告 */
  if (q === "/api/admin/announcements" && method === "POST") {
    if (!mockIsAdmin()) return mockFail(403, "无权限");
    if (!body.title || !body.content) return mockFail(1004, "标题和正文必填");
    const a = {
      id: ++__mockAnnId, adminId: me.id, title: body.title, content: body.content,
      type: ["notice", "rule", "event"].indexOf(body.type) >= 0 ? body.type : "notice",
      isTop: body.isTop ? 1 : 0, status: body.status === 0 ? 0 : 1,
      publishTime: nowStr(), updateTime: nowStr()
    };
    MOCK_ANNOUNCEMENTS.unshift(a);
    return Promise.resolve({ id: a.id });
  }

  /* 4.2 / 4.7 / 4.8 公告详情、编辑、删除 */
  if (/^\/api\/announcements\/\d+$/.test(q) && method === "GET") {
    const id = Number(q.split("/").pop());
    const a = MOCK_ANNOUNCEMENTS.find(function (x) { return x.id === id && x.status !== -1; });
    if (!a) return mockFail(3004, "公告不存在");
    const u = mockUser(a.adminId);
    return Promise.resolve(Object.assign({}, a, {
      adminName: u.nickname,
      isRead: MOCK_ANN_READ.some(function (r) { return r.announcementId === a.id && r.userId === me.id; }),
      readCount: MOCK_ANN_READ.filter(function (r) { return r.announcementId === a.id; }).length
    }));
  }

  /* 4.3 标记已读（幂等） */
  if (/^\/api\/announcements\/\d+\/read$/.test(q) && method === "POST") {
    const id = Number(q.split("/")[3]);
    if (!MOCK_ANNOUNCEMENTS.some(function (x) { return x.id === id; })) return mockFail(3004, "公告不存在");
    if (!MOCK_ANN_READ.some(function (r) { return r.announcementId === id && r.userId === me.id; })) {
      MOCK_ANN_READ.push({ announcementId: id, userId: me.id });
    }
    return Promise.resolve(null);
  }

  if (/^\/api\/admin\/announcements\/\d+$/.test(q)) {
    if (!mockIsAdmin()) return mockFail(403, "无权限");
    const id = Number(q.split("/").pop());
    const a = MOCK_ANNOUNCEMENTS.find(function (x) { return x.id === id; });
    if (!a) return mockFail(3004, "公告不存在");
    if (method === "PUT") {
      if (body.title !== undefined) a.title = body.title;
      if (body.content !== undefined) a.content = body.content;
      if (body.type !== undefined) a.type = body.type;
      if (body.isTop !== undefined) a.isTop = body.isTop;
      if (body.status !== undefined) a.status = body.status;
      a.updateTime = nowStr();
      return Promise.resolve(null);
    }
    if (method === "DELETE") { a.status = -1; return Promise.resolve(null); }
  }

  return mockFail(404, "Mock 未实现的接口: " + method + " " + path);
}

/* ==================== 8. 组装辅助 ==================== */

function mockBookVo(b) {
  const total = 4;
  const borrowedCopies = MOCK_BORROWS.filter(function (r) {
    return r.bookId === b.id && r.status === "borrowed";
  }).length;
  const cat = MOCK_CATEGORIES.find(function (c) { return c.id === b.categoryId; });
  const pub = MOCK_PUBLISHERS.find(function (p) { return p.id === b.publisherId; });
  return Object.assign({}, b, {
    categoryName: cat ? cat.name : "",
    publisherName: pub ? pub.name : "",
    totalCopies: total,
    availableCopies: Math.max(0, total - borrowedCopies),
    borrowCount: MOCK_BORROWS.filter(function (r) { return r.bookId === b.id; }).length * 7 + b.id * 3
  });
}

function mockDecorateBorrow(rec) {
  const now = new Date();
  const due = rec.dueDate ? new Date(rec.dueDate.replace(/-/g, "/")) : null;
  let overdue = false, overdueDays = 0;
  if (rec.status === "borrowed" && !rec.returnDate && due && now > due) {
    overdue = true;
    overdueDays = Math.floor((now - due) / 86400000);
  }
  return Object.assign({}, rec, { overdue: overdue, overdueDays: overdueDays });
}

function mockCommentVo(c) {
  const u = mockUser(c.userId);
  const me = mockCurrent();
  return {
    id: c.id, content: c.content, parentId: c.parentId,
    userId: u.id, userName: u.nickname,
    userAvatar: u.id === me.id ? MOCK_AVATAR : (u.avatar || null),
    userRole: u.role,
    replyToUserId: c.replyToUserId,
    replyToUserName: c.replyToUserId ? mockUser(c.replyToUserId).nickname : null,
    createTime: c.createTime,
    canDelete: c.userId === me.id || mockIsAdmin(),
    children: []
  };
}

function mockReportVo(r) {
  const reporter = mockUser(r.reporterId);
  let title = "", excerpt = "", authorId = null, authorName = "", targetStatus = null;
  if (r.targetType === "post") {
    const post = MOCK_FORUM_POSTS.find(function (x) { return x.id === r.targetId; });
    if (post) { title = post.title; excerpt = post.content.slice(0, 80); authorId = post.userId; targetStatus = post.status; }
  } else {
    const c = MOCK_FORUM_COMMENTS.find(function (x) { return x.id === r.targetId; });
    if (c) { excerpt = c.content.slice(0, 80); authorId = c.userId; targetStatus = c.status; }
  }
  if (authorId) authorName = mockUser(authorId).nickname;
  return Object.assign({}, r, {
    targetTitle: title, targetExcerpt: excerpt, targetStatus: targetStatus,
    reporterName: reporter.nickname, authorId: authorId, authorName: authorName
  });
}
