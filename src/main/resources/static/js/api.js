/* ==========================================================
 * Bookish · 前端核心层（api.js）
 * ---------------------------------------------------------
 * 职责（与页面逻辑分离，所有页面共用）：
 *   1. 全局配置 + 登录态（两层存储）
 *   2. 统一请求层 request() / upload()
 *   3. 通用工具（时间、金额、转义、高亮、防抖、相对时间）
 *   4. 通用组件（Toast / Modal / Drawer / 确认框 / 分页 / 骨架屏 / 空状态）
 *   5. 应用外壳 mountShell()：侧边栏 + 顶栏（按角色渲染导航、未读红点）
 *   6. 用户菜单 + 个人中心（资料 / 头像上传 / 改密码）
 *
 * 依赖：js/mock.js（仅当 USE_MOCK=true 时需要，它提供 mockRequest / mockUpload）
 * 页面自己的逻辑写在 js/home.js / borrows.js / admin.js / forum.js / announce.js
 * ========================================================== */

/* ==================== 1. 全局配置 ==================== */

const USE_MOCK = false;   /* ★ true = 用 js/mock.js 的假数据离线预览；false = 调真实后端 */
const BASE = "";          /* 同源部署留空；前后端分离时填 'http://localhost:8080/bookish' */

const API_VERSION = "20261014c";   /* 静态资源版本号，改前端后改这里（防浏览器缓存） */

/* ==================== 2. 登录态（两层隔离） ====================
 * 第一层：localStorage 按【角色】存 → 读者 / 管理员互不覆盖
 * 第二层：sessionStorage 按【浏览器标签页】天然隔离 → 多账号各占一个标签页
 * 读取顺序：sessionStorage → localStorage（读到就"继承"进本标签页）
 * ============================================================== */

const TOKEN_PREFIX = "bk_token_";
const USER_PREFIX  = "bk_user_";

function pageRole() { return window.PAGE_ROLE || ""; }

function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
function ssDel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }

/* 双角色页面（论坛 / 公告）用：本标签页登录的是谁就用谁 */
function detectRole() {
  const roles = ["reader", "admin"];
  for (let i = 0; i < roles.length; i++) {
    if (ssGet(TOKEN_PREFIX + roles[i])) return roles[i];
  }
  /* 本标签页没登录过 → 看本地存储里存在哪个角色（管理员优先，避免被读者的旧登录顶掉） */
  if (localStorage.getItem(TOKEN_PREFIX + "admin")) return "admin";
  if (localStorage.getItem(TOKEN_PREFIX + "reader")) return "reader";
  return "reader";
}

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

/* 页面守卫：未登录跳登录页；传了 role 则角色不符也跳 */
function requireLogin(role) {
  const me = getUser();
  if (!me || !getToken()) { location.href = "login.html"; return null; }
  if (role && me.role !== role) { location.href = "login.html"; return null; }
  return me;
}

function gotoHome(role) { location.href = role === "admin" ? "admin.html" : "index.html"; }

function doLogout() {
  /* 退出是低频但"不可逆感"很强的操作，加一道确认，顺便展示当前账号，
     防止多标签页场景下手滑退错号。 */
  const me = getUser() || {};
  confirmDialog({
    title: "退出登录",
    text: "确定要退出 <b>" + escapeHtml(me.nickname || me.username || "当前账号") + "</b> 吗？" +
          "<br><span style='color:var(--text-3)'>退出后将清除本页的登录状态，需要重新登录才能继续操作。</span>",
    okText: "退出登录",
    danger: true
  }).then(function (ok) {
    if (!ok) return;
    request("POST", "/api/logout").catch(function () {});
    clearLogin();
    showToast("已退出登录，正在跳转…", "ok");
    setTimeout(function () { location.href = "login.html"; }, 500);
  });
}

/* 从浏览器 bfcache 恢复页面时脚本不会重跑，这里重新校验一次登录态 */
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    const role = pageRole();
    if (!role) return;
    const me = getUser();
    if (!me || !getToken() || me.role !== role) location.href = "login.html";
  });
}

/* ==================== 3. 请求层 ==================== */

/**
 * 统一请求方法
 * @returns {Promise<any>} resolve 后端的 data 字段
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
  }).catch(function () {
    /* fetch 本身失败：后端没启动 / 网络断开 / 请求被拦截，统一给用户看得懂的话 */
    throw new Error("服务器连接失败，请检查网络后重试");
  }).then(function (res) {
    return res.text().then(function (txt) {
      let json;
      try { json = JSON.parse(txt); }
      catch (e) {
        /* 后端未启动或出错时，可能返回 Tomcat 的 HTML 错误页 */
        throw new Error("服务器异常（HTTP " + res.status + "），请稍后重试");
      }
      if (json.code === 401) {
        clearLogin();
        if (!opts.silent) showToast("登录已失效，请重新登录", "warn");
        setTimeout(function () { location.href = "login.html"; }, 800);
        throw new Error(json.message || "未登录");
      }
      if (json.code !== 200) throw new Error(json.message || ("请求失败 (" + json.code + ")"));
      return json.data;
    });
  });
}

/* ==================== 3.5 文件上传 ====================
 * 为什么单独写一个，不复用 request()？
 *   ① 上传要发 multipart/form-data，绝不能自己设 Content-Type
 *      （必须让浏览器带 boundary，写死了后端解析不出来）
 *   ② fetch 拿不到上传进度，只有 XHR 的 upload.onprogress 能拿到
 * ===================================================== */

/**
 * @param path  接口路径，如 "/api/user/avatar"、"/api/upload?type=forum"
 * @param file  File 对象
 * @param onProgress (percent) => void
 * @param fields 额外的表单字段
 */
function upload(path, file, onProgress, fields) {
  return new Promise(function (resolve, reject) {
    if (USE_MOCK) return mockUpload(path, file, onProgress).then(resolve, reject);

    const fd = new FormData();
    fd.append("file", file);
    if (fields) Object.keys(fields).forEach(function (k) { fd.append(k, fields[k]); });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", BASE + path);

    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", token);
    /* ⚠️ 绝不 setRequestHeader("Content-Type", ...) —— 让浏览器自动加 boundary */

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = function () {
      let json = null;
      try { json = JSON.parse(xhr.responseText); } catch (e) { /* 下面统一处理 */ }
      if (!json) return reject(new Error("上传接口返回了非 JSON 内容（HTTP " + xhr.status + "），请检查后端日志"));
      if (json.code === 401) {
        clearLogin();
        showToast("登录已失效，请重新登录", "warn");
        setTimeout(function () { location.href = "login.html"; }, 800);
        return reject(new Error(json.message || "未登录"));
      }
      if (json.code !== 200) return reject(new Error(json.message || ("上传失败 (" + json.code + ")")));
      resolve(json.data);
    };
    xhr.onerror = function () { reject(new Error("网络错误，上传失败")); };
    xhr.onabort = function () { reject(new Error("上传已取消")); };

    xhr.send(fd);
  });
}

/* 上传前先在本地挡一道（别等传上去被后端拒） */
function checkImageFile(file) {
  if (!file) return "没有拿到文件";
  if (!/^image\//.test(file.type)) return "只能上传图片（当前类型：" + (file.type || "未知") + "）";
  if (file.size > 2 * 1024 * 1024) return "图片不能超过 2MB（当前 " + (file.size / 1024 / 1024).toFixed(2) + "MB）";
  return null;
}

/* ==================== 4. 工具函数 ==================== */

function money(n) {
  const v = Number(n || 0);
  return "¥" + v.toFixed(2);
}

/* 兼容 "2026-09-01 10:20:00" 与 Jackson 数组 [2026,9,1,10,20,0] */
function fmtTime(t) {
  if (!t) return "—";
  if (Array.isArray(t)) {
    function p(x) { return String(x).padStart(2, "0"); }
    return t[0] + "-" + p(t[1]) + "-" + p(t[2]) + " " + p(t[3] || 0) + ":" + p(t[4] || 0);
  }
  return String(t).replace("T", " ").slice(0, 16);
}

function fmtDate(t) {
  const s = fmtTime(t);
  return s === "—" ? s : s.slice(0, 10);
}

/* 相对时间：刚刚 / 5 分钟前 / 3 小时前 / 昨天 / 09-20 */
function relTime(t) {
  if (!t) return "—";
  const s = String(t).replace("T", " ").slice(0, 19).replace(/-/g, "/");
  const d = new Date(s);
  if (isNaN(d.getTime())) return fmtTime(t);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return min + " 分钟前";
  const h = Math.floor(min / 60);
  if (h < 24) return h + " 小时前";
  const day = Math.floor(h / 24);
  if (day === 1) return "昨天 " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  if (day < 7) return day + " 天前";
  const now = new Date();
  const md = String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  return d.getFullYear() === now.getFullYear() ? md : d.getFullYear() + "-" + md;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* 关键词高亮：必须先 escape 再包 <mark>，顺序反了就是 XSS */
function highlight(text, kw) {
  const safe = escapeHtml(text);
  if (!kw) return safe;
  const k = escapeHtml(kw).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try { return safe.replace(new RegExp("(" + k + ")", "gi"), '<mark class="hl">$1</mark>'); }
  catch (e) { return safe; }
}

function debounce(fn, wait) {
  let timer = null;
  return function () {
    const args = arguments, self = this;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(self, args); }, wait);
  };
}

function fmtMoney2(n) { return Number(n || 0).toFixed(2); }

function numOr(v, def) { const n = Number(v); return isNaN(n) ? def : n; }

/* 头像：昵称首字 + 按 id 取色 */
const AVATAR_COLORS = ["#4F46E5", "#7C3AED", "#0EA5E9", "#059669", "#D97706", "#DB2777"];

function avatarText(u) {
  const n = (u && u.nickname) || (u && u.username) || "?";
  return n.trim().charAt(0).toUpperCase();
}

function avatarColor(u) {
  const id = (u && u.id) || 0;
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

/* 头像 HTML：传过图就渲染真实图片，没传过回落到「首字 + 取色」圆块。
 * ★ 所有需要显示头像的地方都调它，不要自己拼 <img>，否则回落逻辑会漏。 */
function avatarHTML(u, cls) {
  const klass = cls || "avatar";
  const url = u && u.avatar;
  if (url) {
    return '<span class="' + klass + ' has-img"><img src="' + escapeHtml(url) + '" alt="头像" ' +
           'onerror="this.parentNode.classList.remove(\'has-img\');this.parentNode.removeChild(this);' +
           'this.parentNode.textContent=\'' + escapeHtml(avatarText(u)) + '\'"></span>';
  }
  return '<span class="' + klass + '" style="background:' + avatarColor(u) + '">' +
         escapeHtml(avatarText(u)) + "</span>";
}

/* 作者名 + 管理员小徽章 */
function nameWithRole(u) {
  const isAdmin = u && u.role === "admin";
  return '<span class="post-author">' + escapeHtml((u && (u.nickname || u.username)) || "已注销") + "</span>" +
         (isAdmin ? '<span class="badge brand">管理员</span>' : "");
}

/* 把服务端返回的最新用户字段合并进本地登录态（头像改完要立刻生效） */
function updateMyUser(patch) {
  const me = getUser();
  if (!me) return null;
  const next = Object.assign({}, me, patch || {});
  const uk = USER_PREFIX + me.role;
  try { localStorage.setItem(uk, JSON.stringify(next)); } catch (e) { /* mock 模式 base64 大图存不下，忽略 */ }
  ssSet(uk, JSON.stringify(next));
  if (document.getElementById("userBox")) renderUserChip("userBox", next);
  return next;
}

/* 当前登录人是否处于禁言中（后端写操作还会再校验一次） */
function isMuted(u) {
  u = u || getUser();
  if (!u || u.status !== 0) return null;
  if (u.muteUntil && new Date(String(u.muteUntil).replace(/-/g, "/")) < new Date()) return null;
  return { until: u.muteUntil, reason: u.muteReason };
}

/* ==================== 5. 通用组件 ==================== */

/* ---- Toast ---- */
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
  }, 2800);
}

/* ---- Modal ---- */
function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add("show"); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove("show"); }

/* ---- Drawer ---- */
function openDrawer(id) {
  const d = document.getElementById(id);
  const mask = document.getElementById(id + "Mask");
  if (mask) mask.classList.add("show");
  if (d) { d.classList.add("show"); void d.offsetWidth; }
}
function closeDrawer(id) {
  const d = document.getElementById(id);
  const mask = document.getElementById(id + "Mask");
  if (d) d.classList.remove("show");
  if (mask) mask.classList.remove("show");
}

/* ---- 图片灯箱（论坛配图查看） ---- */
function ensureLightbox() {
  if (document.getElementById("lightbox")) return;
  const box = document.createElement("div");
  box.className = "lightbox";
  box.id = "lightbox";
  box.setAttribute("onclick", "closeLightbox()");
  box.innerHTML = '<button class="lb-close" onclick="closeLightbox()">×</button><img id="lightboxImg" alt="">';
  document.body.appendChild(box);
}
function openLightbox(url) {
  ensureLightbox();
  document.getElementById("lightboxImg").src = url;
  document.getElementById("lightbox").classList.add("show");
}
function closeLightbox() {
  const b = document.getElementById("lightbox");
  if (b) b.classList.remove("show");
}

/* ---- 确认框（替代原生 confirm，样式统一、支持 Promise） ---- */
let __cfOnOk = null;
function ensureConfirmModal() {
  if (document.getElementById("cfModal")) return;
  const wrap = document.createElement("div");
  wrap.className = "modal-mask";
  wrap.id = "cfModal";
  /* 注意：故意不监听「点击遮罩关闭」——弹窗里有表单/重要操作时，
     误点弹窗外面就把内容全丢了，这个毛病已全面整改：
     只能通过 × 按钮 / 取消 / 确认 关闭。 */
  wrap.innerHTML =
    '<div class="modal" style="max-width:420px">' +
      '<div class="modal-head"><h3 id="cfTitle">确认操作</h3>' +
        '<button class="modal-close" onclick="closeConfirm(false)">×</button></div>' +
      '<div class="modal-body"><div id="cfText" style="font-size:13.5px;line-height:1.8;color:var(--text-2)"></div></div>' +
      '<div class="modal-foot">' +
        '<button class="btn btn-ghost" onclick="closeConfirm(false)">取消</button>' +
        '<button class="btn btn-primary" id="cfOk">确认</button>' +
      "</div>" +
    "</div>";
  document.body.appendChild(wrap);
  wrap.querySelector("#cfOk").addEventListener("click", function () { closeConfirm(true); });
}

/**
 * @param opts {title, text, okText, danger}
 * @returns {Promise<boolean>}
 */
function confirmDialog(opts) {
  opts = opts || {};
  ensureConfirmModal();
  document.getElementById("cfTitle").textContent = opts.title || "确认操作";
  document.getElementById("cfText").innerHTML = opts.text || "确定要执行该操作吗？";
  const ok = document.getElementById("cfOk");
  ok.textContent = opts.okText || "确认";
  ok.className = "btn " + (opts.danger ? "btn-danger" : "btn-primary");
  openModal("cfModal");
  return new Promise(function (resolve) { __cfOnOk = resolve; });
}
function closeConfirm(val) {
  closeModal("cfModal");
  if (__cfOnOk) { __cfOnOk(!!val); __cfOnOk = null; }
}

/* ---- 输入框弹窗（如：驳回理由）----
 * 和 confirmDialog 一样点遮罩不关，只能取消 / 提交。
 * @returns Promise<string|null>  取消返回 null，提交返回文本 */
let __pdOnOk = null;
function ensurePromptModal() {
  if (document.getElementById("pdModal")) return;
  const wrap = document.createElement("div");
  wrap.className = "modal-mask";
  wrap.id = "pdModal";
  wrap.innerHTML =
    '<div class="modal" style="max-width:460px">' +
      '<div class="modal-head"><h3 id="pdTitle">请输入</h3>' +
        '<button class="modal-close" onclick="closePrompt(null)">×</button></div>' +
      '<div class="modal-body">' +
        '<div id="pdText" style="font-size:13px;line-height:1.8;color:var(--text-2);margin-bottom:12px"></div>' +
        '<textarea id="pdInput" maxlength="200" style="min-height:84px" placeholder="填写理由（作者会看到）"></textarea>' +
      "</div>" +
      '<div class="modal-foot">' +
        '<button class="btn btn-ghost" onclick="closePrompt(null)">取消</button>' +
        '<button class="btn btn-primary" id="pdOk">确定</button>' +
      "</div>" +
    "</div>";
  document.body.appendChild(wrap);
  wrap.querySelector("#pdOk").addEventListener("click", function () {
    closePrompt(document.getElementById("pdInput").value.trim());
  });
}
function promptDialog(opts) {
  opts = opts || {};
  ensurePromptModal();
  document.getElementById("pdTitle").textContent = opts.title || "请输入";
  document.getElementById("pdText").innerHTML = opts.text || "";
  document.getElementById("pdInput").value = opts.value || "";
  document.getElementById("pdOk").textContent = opts.okText || "确定";
  openModal("pdModal");
  const input = document.getElementById("pdInput");
  setTimeout(function () { input.focus(); }, 60);
  return new Promise(function (resolve) { __pdOnOk = resolve; });
}
function closePrompt(val) {
  closeModal("pdModal");
  if (__pdOnOk) { __pdOnOk(val === undefined ? null : val); __pdOnOk = null; }
}

/* ---- 分页 ---- */
function renderPager(boxId, pageData, onGo) {
  const box = document.getElementById(boxId);
  if (!box) return;
  window.__pagerCallbacks = window.__pagerCallbacks || {};
  window.__pagerCallbacks[boxId] = onGo;

  const total = pageData.total || 0;
  const size = pageData.size || 10;
  const page = pageData.page || 1;
  const pages = Math.max(1, Math.ceil(total / size));

  if (total === 0) { box.innerHTML = ""; return; }

  function btn(p, text, disabled, active) {
    return "<button " + (disabled ? "disabled" : "") + ' class="' + (active ? "active" : "") + '" ' +
           "onclick=\"__pagerGo('" + boxId + "', " + p + ')\">' + text + "</button>";
  }

  let html = btn(1, "首页", page <= 1);
  html += btn(page - 1, "上一页", page <= 1);
  let from = Math.max(1, page - 2);
  let to = Math.min(pages, from + 4);
  from = Math.max(1, to - 4);
  for (let p = from; p <= to; p++) html += btn(p, String(p), false, p === page);
  html += btn(page + 1, "下一页", page >= pages);
  html += btn(pages, "末页", page >= pages);
  html += '<span class="pager-info">共 ' + total + ' 条 / ' + pages + ' 页</span>';
  box.innerHTML = html;
}
function __pagerGo(boxId, p) {
  const cb = window.__pagerCallbacks && window.__pagerCallbacks[boxId];
  if (typeof cb === "function") cb(p);
}

/* ---- 骨架屏 ---- */
function skeletonBooks(n) {
  const one = '<div class="sk-card"><div class="sk-cover"></div><div class="sk-body">' +
                '<div class="sk-line w80"></div><div class="sk-line w50"></div>' +
                '<div class="sk-line w60"></div><div class="sk-line w40"></div>' +
              "</div></div>";
  let out = "";
  for (let i = 0; i < (n || 10); i++) out += one;
  return out;
}

function skeletonRows(n) {
  let out = "";
  for (let i = 0; i < (n || 5); i++) {
    out += '<div class="sk-row"><div class="sk-circle"></div><div class="sk-body">' +
             '<div class="sk-line w40 tall"></div><div class="sk-line w80"></div><div class="sk-line w60"></div>' +
           "</div></div>";
  }
  return out;
}

/* ---- 空状态 ---- */
function emptyState(icon, title, desc, actionHtml) {
  return '<div class="empty-state">' +
    '<div class="es-ico">' + (icon || "📭") + "</div>" +
    "<b>" + escapeHtml(title || "暂无数据") + "</b>" +
    (desc ? "<p>" + desc + "</p>" : "") +
    (actionHtml ? '<div class="mt-16">' + actionHtml + "</div>" : "") +
  "</div>";
}

/* ==================== 6. 应用外壳（侧边栏 + 顶栏） ==================== */

const NAV_ITEMS = {
  reader: [
    { key: "index",         href: "index.html",         icon: "🔍", text: "图书检索" },
    { key: "borrows",       href: "borrows.html",       icon: "📖", text: "我的借阅" },
    { key: "forum",         href: "forum.html",         icon: "💬", text: "交流论坛" },
    { key: "announcements", href: "announcements.html", icon: "📢", text: "通知公告", badge: "ann" }
  ],
  admin: [
    { key: "admin",         href: "admin.html",         icon: "📊", text: "管理后台" },
    { key: "forum",         href: "forum.html",         icon: "💬", text: "交流论坛", badge: "report" },
    { key: "announcements", href: "announcements.html", icon: "📢", text: "通知公告", badge: "ann" }
  ]
};

/**
 * 注入侧边栏与顶栏
 * @param meta {active, title, desc, actions}
 */
function mountShell(meta) {
  meta = meta || {};
  const me = getUser();
  if (!me) return;
  const role = me.role || "reader";
  const items = NAV_ITEMS[role] || NAV_ITEMS.reader;

  /* ---- 侧边栏 ---- */
  const sb = document.getElementById("sidebar");
  if (sb) {
    sb.innerHTML =
      '<div class="sb-brand">' +
        '<div class="sb-logo">📚</div>' +
        '<div class="sb-brand-text"><b>Bookish</b><span>图书借阅管理</span></div>' +
      "</div>" +
      '<div class="sb-scroll">' +
        '<div class="sb-group">' +
          '<div class="sb-group-title">导航</div>' +
          items.map(function (it) {
            return '<a class="sb-item' + (it.key === meta.active ? " active" : "") + '" href="' + it.href + '">' +
              '<span class="sb-ico">' + it.icon + "</span>" +
              '<span class="sb-txt">' + it.text + "</span>" +
              (it.badge ? '<span class="sb-badge" id="badge' + it.badge + '" style="display:none">0</span>' : "") +
            "</a>";
          }).join("") +
        "</div>" +
        '<div class="sb-group">' +
          '<div class="sb-group-title">账号</div>' +
          '<a class="sb-item' + (meta.active === "profile" ? " active" : "") + '" href="profile.html">' +
            '<span class="sb-ico">👤</span><span class="sb-txt">个人中心</span></a>' +
          '<a class="sb-item' + (meta.active === "password" ? " active" : "") + '" href="profile.html#password">' +
            '<span class="sb-ico">🔑</span><span class="sb-txt">修改密码</span></a>' +
          '<a class="sb-item" href="javascript:void(0)" onclick="doLogout()">' +
            '<span class="sb-ico">🚪</span><span class="sb-txt">退出登录</span></a>' +
        "</div>" +
      "</div>" +
      '<div class="sb-foot">' +
        '<div class="sb-user" onclick="location.href=\'profile.html\'" title="进入个人中心">' +
          avatarHTML(me, "avatar avatar-sm") +
          '<div class="sb-user-info">' +
            "<b>" + escapeHtml(me.nickname || me.username) + "</b>" +
            "<span>" + (role === "admin" ? "管理员" : "读者") + " · @" + escapeHtml(me.username) + "</span>" +
          "</div>" +
        "</div>" +
      "</div>";
    if (!document.getElementById("sidebarMask")) {
      const mk = document.createElement("div");
      mk.className = "sidebar-mask";
      mk.id = "sidebarMask";
      mk.setAttribute("onclick", "toggleSidebar(false)");
      document.body.appendChild(mk);
    }
  }

  /* ---- 顶栏 ---- */
  const tb = document.getElementById("topbar");
  if (tb) {
    tb.innerHTML =
      '<button class="icon-btn menu-btn" onclick="toggleSidebar()" aria-label="菜单">☰</button>' +
      '<div class="tb-title">' +
        "<h1>" + escapeHtml(meta.title || "") + "</h1>" +
        (meta.desc ? "<p>" + escapeHtml(meta.desc) + "</p>" : "") +
      "</div>" +
      '<div class="tb-actions">' + (meta.actions || "") + "</div>" +
      '<button class="icon-btn" title="通知公告" onclick="location.href=\'announcements.html\'" id="bellBtn">🔔</button>' +
      '<div class="nav-user" id="userBox"></div>';
    renderUserChip("userBox", me);
  }

  refreshBadges();
  startPolling();
}

/* ==================== 自动刷新（轮询） ====================
 * 作用：不用手动 F5 也能看到新消息 / 新的待处理举报
 *   - 每 POLL_INTERVAL 毫秒刷新一次侧边栏红点
 *   - 同时广播 bk:poll 事件，当前页面可以自己决定刷新哪块内容
 *   - 标签页切到后台时不发请求（省流量、省额度）；切回来立刻补一次
 * ========================================================== */
var POLL_INTERVAL = 60000;   /* 免费容器 CPU 弱，60 秒一次足够；静默刷新不闪屏，拉长间隔也不影响体验 */
var _pollTimer = null;

function startPolling() {
  if (_pollTimer) return;    /* 一个页面只开一个定时器 */
  _pollTimer = setInterval(function () {
    if (document.visibilityState === "hidden") return;
    refreshBadges();
    document.dispatchEvent(new CustomEvent("bk:poll"));
  }, POLL_INTERVAL);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") return;
    refreshBadges();
    document.dispatchEvent(new CustomEvent("bk:poll"));
  });
}

/* 弹窗 / 抽屉开着时（正在看详情、填写表单），轮询只更新红点，不重渲染列表 */
function isUiBlocked() {
  return !!document.querySelector(".modal.show, .drawer.show");
}

function toggleSidebar(force) {
  const sb = document.getElementById("sidebar");
  const mk = document.getElementById("sidebarMask");
  if (!sb) return;
  /* 宽屏时侧边栏常驻，汉堡按钮无意义：直接复位，不弹遮罩（避免整页变模糊） */
  if (window.innerWidth > 960) {
    sb.classList.remove("open");
    if (mk) mk.classList.remove("show");
    return;
  }
  const open = typeof force === "boolean" ? force : !sb.classList.contains("open");
  sb.classList.toggle("open", open);
  if (mk) mk.classList.toggle("show", open);
}

/* 侧边栏红点：未读公告数 + （管理员）待处理举报数 */
function refreshBadges() {
  request("GET", "/api/announcements/unread-count", null, { silent: true })
    .then(function (res) {
      const n = (res && res.unread) || 0;
      setBadge("badgeann", n);
      const bell = document.getElementById("bellBtn");
      if (bell) {
        let dot = bell.querySelector(".dot");
        if (n > 0 && !dot) { dot = document.createElement("span"); dot.className = "dot"; bell.appendChild(dot); }
        if (n === 0 && dot) dot.remove();
      }
    })
    .catch(function () { /* 后端还没实现时不打扰用户 */ });

  if ((getUser() || {}).role === "admin") {
    request("GET", "/api/forum/stats", null, { silent: true })
      .then(function (s) { setBadge("badgereport", (s && s.pendingReports) || 0); })
      .catch(function () {});
  }
}

function setBadge(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = n > 99 ? "99+" : String(n);
  el.style.display = n > 0 ? "" : "none";
}

/* ==================== 7. 用户菜单 ==================== */

function renderUserChip(containerId, me) {
  const box = document.getElementById(containerId);
  if (!box) return;
  const roleText = me.role === "admin" ? "管理员" : "读者";
  box.innerHTML =
    '<div class="user-chip" onclick="toggleUserMenu(event)">' +
      avatarHTML(me) +
      '<span class="uname">' + escapeHtml(me.nickname || me.username) + "</span>" +
      '<span class="urole">' + roleText + "</span>" +
      '<span class="caret">▾</span>' +
    "</div>" +
    '<div class="user-menu" id="userMenu">' +
      '<div class="um-head"><b>' + escapeHtml(me.nickname || me.username) + "</b>" +
        "<span>ID " + me.id + " · @" + escapeHtml(me.username) + "</span></div>" +
      '<button onclick="location.href=\'profile.html\'"><span>👤</span>基本资料与头像</button>' +
      '<button onclick="location.href=\'profile.html#password\'"><span>🔑</span>修改密码</button>' +
      '<div class="um-sep"></div>' +
      '<button class="um-danger" onclick="doLogout()"><span>🚪</span>退出登录</button>' +
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

