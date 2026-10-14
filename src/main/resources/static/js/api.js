/* ==========================================================
 * Bookish · 前端 API 层（统一请求 + 登录态 + 工具 + Mock）
 *
 * ★ 后端写好后，把下面的 USE_MOCK 改成 false 即可切到真实接口。
 *   接口定义见 docs/02-接口文档.md，前端调用与之一一对应。
 * ========================================================== */

/* ==================== 1. 全局配置 ==================== */

const USE_MOCK = false;    // ★ 改这里：true=用本地假数据预览，false=调真实后端
const BASE = "";            // 同源部署留空；若前后端分离填 'http://localhost:8080/bookish'

/* ==================== 2. 登录态（两层隔离） ====================
 * 第一层：localStorage 按【角色】存 → 读者 / 管理员互不覆盖
 * 第二层：sessionStorage 按【浏览器标签页】天然隔离 → 多个账号各占一个标签页
 * 读取顺序：sessionStorage → localStorage（读到就"继承"进本标签页）
 * ============================================================== */

const TOKEN_PREFIX = "bk_token_";
const USER_PREFIX  = "bk_user_";

function pageRole() { return window.PAGE_ROLE || ""; }

function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
function ssDel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }

function getToken() {
  const key = TOKEN_PREFIX + pageRole();
  return ssGet(key) || localStorage.getItem(key) || "";
}

function getUser() {
  const key = USER_PREFIX + pageRole();
  const raw = ssGet(key) || localStorage.getItem(key);
  try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

function setLogin(token, user) {
  const tk = TOKEN_PREFIX + user.role;
  const uk = USER_PREFIX + user.role;
  localStorage.setItem(tk, token);
  localStorage.setItem(uk, JSON.stringify(user));
  ssSet(tk, token);
  ssSet(uk, JSON.stringify(user));
}

function clearLogin() {
  const r = pageRole();
  localStorage.removeItem(TOKEN_PREFIX + r);
  localStorage.removeItem(USER_PREFIX + r);
  ssDel(TOKEN_PREFIX + r);
  ssDel(USER_PREFIX + r);
}

/* 页面守卫：未登录跳登录页；角色不符也跳登录页 */
function requireLogin(role) {
  const me = getUser();
  if (!me || !getToken()) { location.href = "login.html"; return null; }
  if (role && me.role !== role) { location.href = "login.html"; return null; }
  return me;
}

/* 登录成功后按角色跳转 */
function gotoHome(role) {
  location.href = role === "admin" ? "admin.html" : "index.html";
}

function doLogout() {
  request("POST", "/api/logout").catch(function () {});
  clearLogin();
  location.href = "login.html";
}

/* 从浏览器 bfcache 恢复页面时（按"返回/前进"键回来），脚本不会重跑：
   页面会停在离开时的旧快照，如果这期间已退出登录或换了账号，
   就会看到"已经失效的页面"。这里在恢复时重新校验一次登录态。 */
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;        // 首次加载/刷新，脚本已跑过守卫，不用管
    const role = pageRole();         // 登录页不设 PAGE_ROLE，天然跳过
    if (!role) return;
    const me = getUser();
    if (!me || !getToken() || me.role !== role) {
      location.href = "login.html";
    }
  });
}

/* ==================== 3. 请求层 ==================== */

/**
 * 统一请求方法
 * @returns {Promise<any>} 直接 resolve 后端的 data 字段
 */
function request(method, path, body, opts) {
  opts = opts || {};
  if (USE_MOCK) return mockRequest(method, path, body);

  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = token;

  return fetch(BASE + path, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined
  }).then(function (res) {
    return res.text().then(function (txt) {
      let json;
      try { json = JSON.parse(txt); }
      catch (e) { throw new Error("服务器返回了非 JSON 内容（可能是 500 错误页），请检查后端日志"); }

      if (json.code === 401) {
        clearLogin();
        if (!opts.silent) { showToast("登录已失效，请重新登录", "warn"); }
        setTimeout(function () { location.href = "login.html"; }, 800);
        throw new Error(json.message || "未登录");
      }
      if (json.code === 403) {
        throw new Error(json.message || "没有权限执行该操作");
      }
      if (json.code !== 200) {
        throw new Error(json.message || ("请求失败 (" + json.code + ")"));
      }
      return json.data;
    });
  });
}

/* ==================== 4. 工具函数 ==================== */

function money(n) {
  const v = Number(n || 0);
  return "¥" + v.toFixed(2);
}

/* 兼容后端返回 "2026-09-01 10:20:00" 或 Jackson 数组 [2026,9,1,10,20,0] */
function fmtTime(t) {
  if (!t) return "—";
  if (Array.isArray(t)) {
    function p(x) { return String(x).padStart(2, "0"); }
    return t[0] + "-" + p(t[1]) + "-" + p(t[2]) + " " + p(t[3] || 0) + ":" + p(t[4] || 0);
  }
  return String(t).replace("T", " ").slice(0, 16);
}

/* 只取日期部分 */
function fmtDate(t) {
  const s = fmtTime(t);
  return s === "—" ? s : s.slice(0, 10);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* 头像：昵称首字 + 按 id 取色 */
const AVATAR_COLORS = ["#2F6F5E", "#A9764B", "#3A6EA5", "#7B5EA7", "#B5563F", "#4A7C59"];

function avatarText(u) {
  const n = (u && u.nickname) || (u && u.username) || "?";
  return n.trim().charAt(0).toUpperCase();
}

function avatarColor(u) {
  const id = (u && u.id) || 0;
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

/* Toast 提示 */
function showToast(msg, type) {
  let box = document.getElementById("toastBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "toastBox";
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = "toast " + (type || "");
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(function () {
    el.style.opacity = "0";
    el.style.transition = "opacity .3s";
    setTimeout(function () { el.remove(); }, 320);
  }, 2600);
}

/* 导航栏用户区渲染 */
function renderUserChip(containerId, me) {
  const box = document.getElementById(containerId);
  if (!box) return;
  const roleText = me.role === "admin" ? "管理员" : "读者";
  box.innerHTML =
    '<div class="user-chip" onclick="toggleUserMenu(event)">' +
      '<span class="avatar" style="background:' + avatarColor(me) + '">' + escapeHtml(avatarText(me)) + "</span>" +
      '<span class="uname">' + escapeHtml(me.nickname) + "</span>" +
      '<span class="urole">' + roleText + "</span>" +
    "</div>" +
    '<div class="user-menu" id="userMenu">' +
      '<div style="padding:9px 12px;font-size:12.5px;color:var(--text-sub);border-bottom:1px solid var(--border);margin-bottom:4px">' +
        "ID " + me.id + " · @" + escapeHtml(me.username) +
      "</div>" +
      '<button onclick="doLogout()">退出登录</button>' +
    "</div>";
}

function toggleUserMenu(e) {
  if (e) e.stopPropagation();
  const m = document.getElementById("userMenu");
  if (m) m.classList.toggle("show");
}

document.addEventListener("click", function () {
  const m = document.getElementById("userMenu");
  if (m) m.classList.remove("show");
});

/* 通用分页渲染
 * @param boxId  容器 id（同时作为回调的注册键，同一页面可以有多个分页器）
 * @param pageData  { total, page, size }
 * @param onGo    点击页码的回调 (page) => void
 */
function renderPager(boxId, pageData, onGo) {
  const box = document.getElementById(boxId);
  if (!box) return;

  /* 按容器 id 分别注册回调 —— 页面上同时存在两个分页器时不会互相覆盖 */
  window.__pagerCallbacks = window.__pagerCallbacks || {};
  window.__pagerCallbacks[boxId] = onGo;

  const total = pageData.total || 0;
  const size = pageData.size || 10;
  const page = pageData.page || 1;
  const pages = Math.max(1, Math.ceil(total / size));

  if (total === 0) { box.innerHTML = ""; return; }

  function btn(p, text, disabled, active) {
    return '<button ' + (disabled ? "disabled" : "") +
           ' class="' + (active ? "active" : "") + '" ' +
           "onclick=\"__pagerGo('" + boxId + "', " + p + ')\">' + text + "</button>";
  }

  let html = btn(1, "首页", page <= 1);
  html += btn(page - 1, "上一页", page <= 1);

  let from = Math.max(1, page - 2);
  let to = Math.min(pages, from + 4);
  from = Math.max(1, to - 4);

  for (let p = from; p <= to; p++) {
    html += btn(p, String(p), false, p === page);
  }

  html += btn(page + 1, "下一页", page >= pages);
  html += btn(pages, "末页", page >= pages);
  html += '<span class="pager-info">共 ' + total + ' 条 / ' + pages + ' 页</span>';

  box.innerHTML = html;
}

/* 分页按钮的统一入口（HTML 里 onclick 调用） */
function __pagerGo(boxId, p) {
  const cb = window.__pagerCallbacks && window.__pagerCallbacks[boxId];
  if (typeof cb === "function") cb(p);
}

/* 弹窗开关 */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("show");
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("show");
}

/* ==================== 5. Mock 数据（后端写好后可整段删除） ==================== */
/*
 * ⚠️ 注意：Mock 必须【如实】模拟后端的筛选/分页行为。
 *    不要为了让页面好看而在 Mock 里偷偷补字段或过滤数据 ——
 *    delicious 项目就踩过这个坑：Mock 自己过滤了 merchantId，
 *    导致真实接口缺失该逻辑时前端看不出问题。
 *    所以下面每个 mock 方法都严格按接口文档实现同样的逻辑。
 */

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

/* 借阅记录（readerId=2 是张三，即 mock 登录的读者） */
const MOCK_BORROWS = [
  { id: 101, readerId: 2, readerName: "张三", copyId: 1,  barcode: "BC000101", bookId: 1,  bookTitle: "Java核心技术 卷I",  bookAuthor: "Cay S. Horstmann", categoryName: "计算机",   borrowDate: "2026-09-20 10:20:00", dueDate: "2026-10-20 10:20:00", returnDate: null,                  status: "borrowed", renewCount: 0 },
  { id: 102, readerId: 2, readerName: "张三", copyId: 9,  barcode: "BC000301", bookId: 3,  bookTitle: "深入理解Java虚拟机", bookAuthor: "周志明",          categoryName: "计算机",   borrowDate: "2026-08-01 09:00:00", dueDate: "2026-08-31 09:00:00", returnDate: null,                  status: "borrowed", renewCount: 1 },
  { id: 103, readerId: 2, readerName: "张三", copyId: 25, barcode: "BC000701", bookId: 7,  bookTitle: "红楼梦",            bookAuthor: "曹雪芹",           categoryName: "文学小说", borrowDate: "2026-09-25 14:30:00", dueDate: "2026-10-25 14:30:00", returnDate: null,                  status: "borrowed", renewCount: 0 },
  { id: 104, readerId: 2, readerName: "张三", copyId: 33, barcode: "BC000901", bookId: 9,  bookTitle: "百年孤独",          bookAuthor: "加西亚·马尔克斯",  categoryName: "文学小说", borrowDate: "2026-06-10 11:00:00", dueDate: "2026-07-10 11:00:00", returnDate: "2026-07-05 16:20:00", status: "returned", renewCount: 0 },
  { id: 105, readerId: 2, readerName: "张三", copyId: 41, barcode: "BC001101", bookId: 11, bookTitle: "万历十五年",        bookAuthor: "黄仁宇",           categoryName: "历史",     borrowDate: "2026-05-02 09:40:00", dueDate: "2026-06-01 09:40:00", returnDate: "2026-06-12 10:00:00", status: "returned", renewCount: 0 },
  { id: 106, readerId: 3, readerName: "李四", copyId: 5,  barcode: "BC000201", bookId: 2,  bookTitle: "Effective Java",   bookAuthor: "Joshua Bloch",     categoryName: "计算机",   borrowDate: "2026-09-22 15:10:00", dueDate: "2026-10-22 15:10:00", returnDate: null,                  status: "borrowed", renewCount: 0 },
  { id: 107, readerId: 4, readerName: "王五", copyId: 49, barcode: "BC001301", bookId: 13, bookTitle: "原则",             bookAuthor: "瑞·达利欧",       categoryName: "经济管理", borrowDate: "2026-09-26 08:30:00", dueDate: "2026-10-26 08:30:00", returnDate: null,                  status: "borrowed", renewCount: 0 },
  { id: 108, readerId: 5, readerName: "赵六", copyId: 57, barcode: "BC001501", bookId: 15, bookTitle: "时间简史",          bookAuthor: "史蒂芬·霍金",     categoryName: "科普",     borrowDate: "2026-07-15 13:00:00", dueDate: "2026-08-14 13:00:00", returnDate: "2026-08-20 09:15:00", status: "returned", renewCount: 0 }
];

const MOCK_USERS = {
  reader: { id: 2, username: "zhangsan", nickname: "张三", phone: "13800000001", role: "reader", maxBorrow: 5 },
  admin:  { id: 1, username: "admin",    nickname: "图书馆管理员", phone: "13800000000", role: "admin",  maxBorrow: 99 }
};

/* 计算派生字段（和后端 Service 里做的事一致） */
function decorateBorrow(rec) {
  const now = new Date();
  const due = rec.dueDate ? new Date(rec.dueDate.replace(/-/g, "/")) : null;
  let overdue = false, overdueDays = 0;
  if (rec.status === "borrowed" && !rec.returnDate && due && now > due) {
    overdue = true;
    overdueDays = Math.floor((now - due) / 86400000);
  }
  return Object.assign({}, rec, { overdue: overdue, overdueDays: overdueDays });
}

/* 计算一本书的统计（总副本/可借副本/借阅次数） */
function withBookStats(b) {
  const total = 4;
  /* 从 mock 借阅记录里算"当前被借走的副本数" */
  const borrowedCopies = MOCK_BORROWS.filter(function (r) {
    return r.bookId === b.id && r.status === "borrowed";
  }).length;
  const available = Math.max(0, total - borrowedCopies);
  const borrowCount = MOCK_BORROWS.filter(function (r) { return r.bookId === b.id; }).length * 7 + b.id * 3;
  const cat = MOCK_CATEGORIES.find(function (c) { return c.id === b.categoryId; });
  const pub = MOCK_PUBLISHERS.find(function (p) { return p.id === b.publisherId; });
  return Object.assign({}, b, {
    categoryName: cat ? cat.name : "",
    publisherName: pub ? pub.name : "",
    totalCopies: total,
    availableCopies: available,
    borrowCount: borrowCount
  });
}

function mockFail(code, msg) {
  const e = new Error(msg);
  e.code = code;
  return Promise.reject(e);
}

function mockRequest(method, path, body) {
  const q = path.split("?")[0];

  /* ---------- 认证 ---------- */
  if (q === "/api/login" && method === "POST") {
    const u = body.username === "admin" ? MOCK_USERS.admin
            : body.username === "zhangsan" ? MOCK_USERS.reader : null;
    if (!u) return mockFail(1001, "用户不存在");
    if (body.password !== "123456") return mockFail(1002, "密码错误");
    return Promise.resolve({ token: "mock-token-" + u.role, user: u });
  }
  if (q === "/api/register" && method === "POST") {
    return Promise.resolve(null);
  }
  if (q === "/api/logout") return Promise.resolve(null);

  /* ---------- 基础数据 ---------- */
  if (q === "/api/categories") return Promise.resolve(MOCK_CATEGORIES);
  if (q === "/api/publishers") return Promise.resolve(MOCK_PUBLISHERS);

  /* ---------- 图书 ---------- */
  if (q === "/api/books" && method === "GET") {
    const p = parseQuery(path);
    let list = MOCK_BOOKS.map(withBookStats);

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

    const total = list.length;
    const page = Number(p.page || 1);
    const size = Number(p.size || 12);
    return Promise.resolve({ total: total, page: page, size: size, list: list.slice((page - 1) * size, page * size) });
  }

  /* /api/books/hot 必须在 /api/books/{id} 之前判断 */
  if (q === "/api/books/hot") {
    const list = MOCK_BOOKS.map(withBookStats)
      .sort(function (a, b) { return b.borrowCount - a.borrowCount; })
      .slice(0, 10);
    return Promise.resolve(list);
  }

  if (q.indexOf("/api/books/") === 0) {
    const id = Number(q.split("/").pop());
    const b = MOCK_BOOKS.find(function (x) { return x.id === id; });
    if (!b) return mockFail(1003, "图书不存在");
    const vo = withBookStats(b);
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
    const me = getUser() || MOCK_USERS.reader;
    const mine = MOCK_BORROWS.filter(function (r) { return r.readerId === me.id; }).map(decorateBorrow);
    return Promise.resolve({
      borrowing: mine.filter(function (r) { return r.status === "borrowed"; }).length,
      overdue: mine.filter(function (r) { return r.overdue; }).length,
      returned: mine.filter(function (r) { return r.status === "returned"; }).length,
      unpaidFine: 2.5
    });
  }

  if (q === "/api/borrows" && method === "GET") {
    const p = parseQuery(path);
    const me = getUser() || MOCK_USERS.reader;
    let list = MOCK_BORROWS.filter(function (r) {
      /* 读者只能看自己的 —— 后端由 token 决定 readerId，这里如实模拟 */
      return me.role === "admin" ? true : r.readerId === me.id;
    }).map(decorateBorrow);

    /* 口径与接口文档 2.10 一致：borrowed = 未归还（逾期记录也算在内），overdue 才是「已逾期」 */
    if (p.status === "borrowed") list = list.filter(function (r) { return r.status === "borrowed" && !r.returnDate; });
    else if (p.status === "returned") list = list.filter(function (r) { return r.status === "returned"; });
    else if (p.status === "overdue") list = list.filter(function (r) { return r.overdue; });

    list.sort(function (a, b) { return b.id - a.id; });
    const total = list.length;
    const page = Number(p.page || 1);
    const size = Number(p.size || 10);
    return Promise.resolve({ total: total, page: page, size: size, list: list.slice((page - 1) * size, page * size) });
  }

  if (q === "/api/borrows" && method === "POST") {
    const me = getUser() || MOCK_USERS.reader;
    const bookId = body.bookId;
    const b = MOCK_BOOKS.find(function (x) { return x.id === bookId; });
    if (!b) return mockFail(1003, "图书不存在");
    const vo = withBookStats(b);
    if (vo.availableCopies <= 0) return mockFail(2001, "该图书暂无可借副本");
    const mine = MOCK_BORROWS.filter(function (r) { return r.readerId === me.id && r.status === "borrowed"; });
    if (mine.length >= me.maxBorrow) return mockFail(2002, "超出可借上限");
    if (mine.some(function (r) { return decorateBorrow(r).overdue; })) return mockFail(2003, "有逾期未还，请先归还");

    const newRec = {
      id: 200 + MOCK_BORROWS.length,
      readerId: me.id, readerName: me.nickname,
      copyId: BookishMockNextCopy(b.id), barcode: "BC" + String(b.id).padStart(4, "0") + "99",
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
    const d = decorateBorrow(rec);
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
    if (decorateBorrow(rec).overdue) return mockFail(2003, "已逾期，不能续借");
    if (rec.renewCount >= 2) return mockFail(2005, "超过最大续借次数");
    rec.renewCount += 1;
    rec.dueDate = addDaysStrTo(rec.dueDate, 30);
    return Promise.resolve({ newDueDate: rec.dueDate, renewCount: rec.renewCount });
  }

  /* ---------- 管理端 ---------- */
  if (q === "/api/admin/borrows") {
    const p = parseQuery(path);
    let list = MOCK_BORROWS.map(decorateBorrow);

    if (p.keyword) {
      const kw = p.keyword.toLowerCase();
      list = list.filter(function (r) {
        return (r.readerName || "").toLowerCase().indexOf(kw) >= 0
            || (r.bookTitle || "").toLowerCase().indexOf(kw) >= 0
            || (r.barcode || "").toLowerCase().indexOf(kw) >= 0;
      });
    }
    /* 口径与接口文档一致：borrowed = 未归还（含逾期） */
    if (p.status === "borrowed") list = list.filter(function (r) { return r.status === "borrowed" && !r.returnDate; });
    else if (p.status === "returned") list = list.filter(function (r) { return r.status === "returned"; });
    else if (p.status === "overdue") list = list.filter(function (r) { return r.overdue; });

    list.sort(function (a, b) { return b.id - a.id; });

    const total = list.length;
    const page = Number(p.page || 1);
    const size = Number(p.size || 10);
    return Promise.resolve({ total: total, page: page, size: size, list: list.slice((page - 1) * size, page * size) });
  }

  if (q === "/api/admin/stats") {
    const all = MOCK_BORROWS.map(decorateBorrow);
    const catMap = {};
    all.forEach(function (r) { catMap[r.categoryName] = (catMap[r.categoryName] || 0) + 1; });
    return Promise.resolve({
      bookCount: MOCK_BOOKS.length,
      copyCount: MOCK_BOOKS.length * 4,
      readerCount: 10,
      borrowingCount: all.filter(function (r) { return r.status === "borrowed"; }).length,
      overdueCount: all.filter(function (r) { return r.overdue; }).length,
      todayBorrowCount: 2,
      unpaidFineTotal: 2.5,
      categoryStats: Object.keys(catMap).map(function (k) { return { categoryName: k, borrowCount: catMap[k] }; })
        .sort(function (a, b) { return b.borrowCount - a.borrowCount; }),
      monthlyStats: [
        { month: "2026-05", borrowCount: 1 },
        { month: "2026-06", borrowCount: 1 },
        { month: "2026-07", borrowCount: 1 },
        { month: "2026-08", borrowCount: 1 },
        { month: "2026-09", borrowCount: 4 }
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
      const used = MOCK_BORROWS.some(function (r) { return r.bookId === id; });
      if (used) return mockFail(2006, "图书有借阅记录，不能删除");
      MOCK_BOOKS.splice(MOCK_BOOKS.indexOf(b), 1);
      return Promise.resolve(null);
    }
  }

  return mockFail(404, "Mock 未实现的接口: " + method + " " + path);
}

/* mock 辅助 */
let __mockCopySeed = 500;
function BookishMockNextCopy(bookId) { return ++__mockCopySeed; }

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
