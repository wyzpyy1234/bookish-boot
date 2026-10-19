/* ==========================================================
 * 交流论坛页逻辑
 *   列表（标签/排序/搜索/我的/精华/分页） → 详情（正文+配图+点赞+两级评论）
 *   发帖（文字 + 最多 3 图） → 举报 → 管理员操作（置顶/加精/锁定/删除）
 *
 * 接口对应《03-论坛与公告-接口文档》第 3 节。
 * 路由用 location.hash：#/p/12 = 帖子 12 的详情，便于分享与刷新还原。
 * ========================================================== */

window.PAGE_ROLE = detectRole();
var me = requireLogin();

/* 标签是固定枚举（后端存字符串即可，不用建字典表） */
const TAGS = [
  { key: "general",    label: "综合",  icon: "💬" },
  { key: "discussion", label: "讨论",  icon: "🗣️" },
  { key: "review",     label: "书评",  icon: "📚" },
  { key: "ask",        label: "求助",  icon: "❓" },
  { key: "share",      label: "分享",  icon: "🎁" }
];
const TAG_MAP = {};
TAGS.forEach(function (t) { TAG_MAP[t.key] = t; });

const isAdmin = me.role === "admin";
const muted = isMuted(me);          /* 禁言中则禁用所有发言入口 */

var state = { keyword: "", tag: "", sort: "newest", mine: false, essenceOnly: false, pending: false, page: 1, size: 10 };
var reqSeq = 0, kwTimer = null, composing = false;

/* 详情页状态 */
var current = { post: null, comments: [], commentPage: 1, replyTo: null };
/* 发帖弹窗状态 */
var compose = { id: null, images: [], saving: false };

mountShell({
  active: "forum",
  title: "交流论坛",
  desc: isAdmin ? "管理员视角：可置顶 / 加精 / 锁定 / 删除任意帖子" : "分享书评、交流技术、互帮互助",
  actions: '<button class="btn btn-primary btn-sm" id="btnCompose" onclick="openCompose()">✏️ 发帖</button>'
});

/* ==================== 启动 ==================== */

function forumInit() {
  renderTagChips();
  renderSideTags();
  renderMuteTip();
  buildTagSelect();
  loadStats();

  /* 审核入口只给管理员 */
  if (isAdmin) {
    const chip = document.getElementById("chipPending");
    if (chip) chip.style.display = "";
  }

  var kw = document.getElementById("fKeyword");
  if (kw) {
    kw.addEventListener("compositionstart", function () { composing = true; });
    kw.addEventListener("compositionend", function () { composing = false; onKeywordInput(); });
  }
  window.addEventListener("hashchange", route);
  route();
}

/* 被禁言时给用户明确提示，并隐藏发帖按钮（后端仍会拦，前端只是别让人白点） */
function renderMuteTip() {
  const tip = document.getElementById("muteTip");
  const btn = document.getElementById("btnCompose");
  if (!muted) {
    if (tip) tip.style.display = "none";
    if (btn) btn.style.display = "";
    return;
  }
  const when = muted.until ? "解除时间 " + fmtDate(muted.until) : "永久";
  if (tip) {
    tip.style.display = "";
    tip.innerHTML = "🚫 你已被禁言（" + when + "），暂时不能发帖、评论和举报。" +
      (muted.reason ? "原因：" + escapeHtml(muted.reason) : "");
  }
  if (btn) btn.style.display = "none";
}

/* ==================== 路由 ==================== */

function route() {
  const m = /^#\/p\/(\d+)$/.exec(location.hash || "");
  if (m) openDetail(Number(m[1]), true);
  else showList();
}

function showList() {
  document.getElementById("viewList").classList.remove("hidden");
  document.getElementById("viewDetail").classList.add("hidden");
  loadPosts(state.page);
}

function backToList() {
  location.hash = "";
  /* hash 为空时 hashchange 不一定触发（比如本来就是空），这里兜一层 */
  if (!/^#\/p\//.test(location.hash || "")) showList();
}

/* ==================== 列表 ==================== */

function renderTagChips() {
  const box = document.getElementById("tagChips");
  if (!box) return;
  box.innerHTML = '<span class="chip-label">话题</span>' +
    '<span class="chip active" data-tag="" onclick="pickTag(this, \'\')">全部</span>' +
    TAGS.map(function (t) {
      return '<span class="chip" data-tag="' + t.key + '" onclick="pickTag(this, \'' + t.key + '\')">' +
             t.icon + " " + t.label + "</span>";
    }).join("");
}

function renderSideTags() {
  const box = document.getElementById("sideTags");
  if (!box) return;
  box.innerHTML = TAGS.map(function (t) {
    return '<span class="chip" onclick="pickTagByKey(\'' + t.key + '\')">' + t.icon + " " + t.label + "</span>";
  }).join("");
}

function pickTag(el, tag) {
  state.tag = tag;
  const chips = document.querySelectorAll("#tagChips .chip");
  for (let i = 0; i < chips.length; i++) chips[i].classList.remove("active");
  if (el) el.classList.add("active");
  loadPosts(1);
}

function pickTagByKey(key) {
  const chips = document.querySelectorAll("#tagChips .chip");
  for (let i = 0; i < chips.length; i++) {
    chips[i].classList.toggle("active", (chips[i].getAttribute("data-tag") || "") === key);
  }
  state.tag = key;
  loadPosts(1);
}

function setSort(sort) {
  state.sort = sort;
  const btns = document.querySelectorAll("#sortSeg .seg-btn");
  for (let i = 0; i < btns.length; i++) btns[i].classList.toggle("active", btns[i].getAttribute("data-sort") === sort);
  loadPosts(1);
}

function toggleMine() {
  state.mine = !state.mine;
  document.getElementById("chipMine").classList.toggle("active", state.mine);
  loadPosts(1);
}

function toggleEssence() {
  state.essenceOnly = !state.essenceOnly;
  document.getElementById("chipEssence").classList.toggle("active", state.essenceOnly);
  loadPosts(1);
}

/* 管理员：只看待审核帖 */
function togglePending() {
  state.pending = !state.pending;
  document.getElementById("chipPending").classList.toggle("active", state.pending);
  loadPosts(1);
}

function resetForumFilter() {
  clearTimeout(kwTimer);
  state.keyword = ""; state.tag = ""; state.sort = "newest"; state.mine = false; state.essenceOnly = false; state.pending = false;
  document.getElementById("fKeyword").value = "";
  document.getElementById("fClear").style.display = "none";
  pickTagByKey("");
  setSort("newest");
  document.getElementById("chipMine").classList.remove("active");
  document.getElementById("chipEssence").classList.remove("active");
  document.getElementById("chipPending").classList.remove("active");
  loadPosts(1);
}

function onKeywordInput() {
  if (composing) return;
  const v = document.getElementById("fKeyword").value.trim();
  document.getElementById("fClear").style.display = v ? "flex" : "none";
  clearTimeout(kwTimer);
  kwTimer = setTimeout(function () {
    if (v === state.keyword) return;
    state.keyword = v;
    loadPosts(1);
  }, 300);
}

function onKeywordKey(e) {
  if (e.key === "Enter") { clearTimeout(kwTimer); state.keyword = document.getElementById("fKeyword").value.trim(); loadPosts(1); }
  else if (e.key === "Escape") clearKeyword();
}

function clearKeyword() {
  clearTimeout(kwTimer);
  document.getElementById("fKeyword").value = "";
  document.getElementById("fClear").style.display = "none";
  if (state.keyword !== "") { state.keyword = ""; loadPosts(1); }
  document.getElementById("fKeyword").focus();
}

async function loadPosts(page) {
  state.page = page;
  const box = document.getElementById("postList");
  const seq = ++reqSeq;
  if (box.querySelector(".post-item")) box.classList.add("is-busy");
  else box.innerHTML = skeletonRows(4);

  try {
    const qs = "?page=" + page + "&size=" + state.size +
      (state.keyword ? "&keyword=" + encodeURIComponent(state.keyword) : "") +
      (state.tag ? "&tag=" + state.tag : "") +
      (state.sort !== "newest" ? "&sort=" + state.sort : "") +
      (state.mine ? "&mine=true" : "") +
      (state.essenceOnly ? "&essenceOnly=true" : "") +
      (state.pending ? "&status=0" : "");

    const res = await request("GET", "/api/forum/posts" + qs);
    if (seq !== reqSeq) return;
    box.classList.remove("is-busy");
    renderPosts(res.list || []);
    renderPager("pager", res, function (p) { loadPosts(p); });
  } catch (e) {
    if (seq !== reqSeq) return;
    box.classList.remove("is-busy");
    box.innerHTML = failState(e, "帖子列表");
  }
}

/* 接口没实现时给出可操作提示（不是白屏） */
function failState(e, what) {
  const msg = escapeHtml(e && e.message || "加载失败");
  const mockHint = USE_MOCK ? "" :
    "<p style=\"margin-top:8px\">想让界面先跑起来？把 <b>js/api.js</b> 顶部的 " +
    "<b>USE_MOCK</b> 改成 <b>true</b>，即可用内置假数据预览全部功能。</p>";
  return emptyState("🔌", (what || "") + "加载失败", msg + mockHint,
    '<button class="btn btn-ghost btn-sm" onclick="location.reload()">重新加载</button>');
}

function postBadges(p) {
  let out = "";
  if (p.isTop) out += '<span class="badge solid-danger">置顶</span>';
  if (p.isEssence) out += '<span class="badge warn">精华</span>';
  if (p.isLocked) out += '<span class="badge">🔒 已锁定</span>';
  if (Number(p.status) === 0) out += '<span class="badge info">⏳ 待审核</span>';
  if (Number(p.status) === 2) out += '<span class="badge danger">未通过审核</span>';
  const t = TAG_MAP[p.tag];
  if (t) out += '<span class="tag">' + t.icon + " " + t.label + "</span>";
  return out;
}

function renderPosts(list) {
  const box = document.getElementById("postList");
  if (!list.length) {
    const desc = state.mine ? "你还没有发过帖子" :
                 (state.essenceOnly ? "还没有精华帖" : "还没有符合条件的帖子");
    box.innerHTML = emptyState("💬", "这里还没有帖子", desc,
      muted ? "" : '<button class="btn btn-primary btn-sm" onclick="openCompose()">✏️ 发第一帖</button>');
    return;
  }

  box.innerHTML = list.map(function (p) {
    const author = { id: p.authorId, nickname: p.authorName, avatar: p.authorAvatar, role: p.authorRole };
    const thumbs = (p.images || []).slice(0, 3).map(function (u) {
      return '<img src="' + escapeHtml(u) + '" alt="" onclick="event.stopPropagation();openLightbox(\'' +
             escapeHtml(u).replace(/'/g, "") + '\')">';
    }).join("");

    return '<div class="post-item fade-up' + (p.isTop ? " is-top" : "") + (p.isEssence ? " is-essence" : "") +
        '" onclick="goDetail(' + p.id + ')">' +
      '<div class="post-head">' +
        avatarHTML(author, "avatar avatar-sm") +
        nameWithRole(author) +
        '<span class="post-time">' + relTime(p.createTime) + "</span>" +
        '<span class="spacer"></span>' +
        postBadges(p) +
      "</div>" +
      '<div class="post-title-row"><span class="post-title">' +
        highlight(p.title, state.keyword) + "</span></div>" +
      (p.excerpt ? '<div class="post-excerpt">' + highlight(p.excerpt, state.keyword) + "</div>" : "") +
      (thumbs ? '<div class="post-thumbs">' + thumbs + "</div>" : "") +
      '<div class="post-foot">' +
        '<span class="post-stat">👁 ' + (p.viewCount || 0) + "</span>" +
        '<span class="post-stat' + (p.liked ? " liked" : "") + '">♥ ' + (p.likeCount || 0) + "</span>" +
        '<span class="post-stat">💬 ' + (p.commentCount || 0) + "</span>" +
        (p.lastReplyTime ? '<span class="post-stat">最后回复 ' + relTime(p.lastReplyTime) + "</span>" : "") +
        '<span class="spacer"></span>' +
        adminActions(p) +
        ownerActions(p) +
      "</div>" +
    "</div>";
  }).join("");
}

/* 管理员操作（前端只是入口，后端 3.12 会再校验一次角色） */
function adminActions(p) {
  if (!isAdmin) return "";
  /* 待审核帖先给「通过 / 驳回」 */
  if (Number(p.status) === 0) {
    return '<button class="post-act" style="color:var(--success);font-weight:600" ' +
             'onclick="event.stopPropagation();approvePost(' + p.id + ')">通过审核</button>' +
           '<button class="post-act danger" onclick="event.stopPropagation();rejectPost(' + p.id + ')">驳回</button>';
  }
  return '<button class="post-act" onclick="event.stopPropagation();setFlag(' + p.id + ',\'isTop\',' +
           (p.isTop ? 0 : 1) + ')" title="置顶">' + (p.isTop ? "取消置顶" : "置顶") + "</button>" +
         '<button class="post-act" onclick="event.stopPropagation();setFlag(' + p.id + ',\'isEssence\',' +
           (p.isEssence ? 0 : 1) + ')" title="加精">' + (p.isEssence ? "取消精华" : "加精") + "</button>" +
         '<button class="post-act" onclick="event.stopPropagation();setFlag(' + p.id + ',\'isLocked\',' +
           (p.isLocked ? 0 : 1) + ')" title="锁定">' + (p.isLocked ? "解锁" : "锁定") + "</button>" +
         '<button class="post-act danger" onclick="event.stopPropagation();deletePost(' + p.id + ')">删除</button>';
}

/* ---- 审核动作 ---- */

async function approvePost(id) {
  const ok = await confirmDialog({
    title: "通过审核",
    text: "通过后该帖将<b>立即对所有人可见</b>，确定吗？",
    okText: "通过"
  });
  if (!ok) return;
  try {
    await request("POST", "/api/forum/admin/posts/" + id + "/approve");
    showToast("已通过审核", "ok");
    loadPosts(state.page); loadStats();
  } catch (e) { showToast(e.message, "err"); }
}

async function rejectPost(id) {
  const reason = await promptDialog({
    title: "驳回帖子",
    text: "驳回后仅作者本人可见，作者会看到驳回理由，修改后可重新提交审核。",
    okText: "驳回",
    value: "内容不符合社区规范"
  });
  if (reason === null) return;                 /* 取消 */
  try {
    await request("POST", "/api/forum/admin/posts/" + id + "/reject", { reason: reason });
    showToast("已驳回", "ok");
    loadPosts(state.page); loadStats();
  } catch (e) { showToast(e.message, "err"); }
}

function ownerActions(p) {
  if (isAdmin) return "";
  if (p.authorId !== me.id) return "";
  return '<button class="post-act" onclick="event.stopPropagation();editPost(' + p.id + ')">编辑</button>' +
         '<button class="post-act danger" onclick="event.stopPropagation();deletePost(' + p.id + ')">删除</button>';
}

/* ==================== 详情 ==================== */

function goDetail(id) { location.hash = "#/p/" + id; }

async function openDetail(id, fromRoute) {
  document.getElementById("viewList").classList.add("hidden");
  document.getElementById("viewDetail").classList.remove("hidden");
  const wrap = document.getElementById("detailWrap");
  wrap.innerHTML = '<div class="loading-tip">加载中…</div>';
  window.scrollTo({ top: 0, behavior: "smooth" });

  try {
    const p = await request("GET", "/api/forum/posts/" + id);
    current.post = p;
    current.commentPage = 1;
    current.replyTo = null;
    wrap.innerHTML = detailHTML(p);
    loadComments(1);
  } catch (e) {
    wrap.innerHTML = failState(e, "帖子详情");
  }
}

function detailHTML(p) {
  const author = { id: p.authorId, nickname: p.authorName, avatar: p.authorAvatar, role: p.authorRole };
  const imgs = (p.images || []).map(function (u) {
    return '<img src="' + escapeHtml(u) + '" alt="" onclick="openLightbox(\'' +
           escapeHtml(u).replace(/'/g, "") + '\')">';
  }).join("");

  /* 审核状态横幅：待审核 / 被驳回（只有作者本人和管理员能看到这种帖子） */
  let reviewBanner = "";
  if (Number(p.status) === 0) {
    reviewBanner = '<div class="review-banner pending">⏳ 该帖正在等待管理员审核，审核通过后才会对其他人展示。</div>';
  } else if (Number(p.status) === 2) {
    reviewBanner = '<div class="review-banner rejected">⛔ 该帖未通过审核' +
      (p.rejectReason ? "，理由：<b>" + escapeHtml(p.rejectReason) + "</b>" : "") +
      "。点击「编辑」修改内容后可重新提交审核。</div>";
  }
  return '<div class="post-detail fade-up">' +
    reviewBanner +
    '<div class="post-detail-head">' +
      '<h2 class="post-detail-title">' + escapeHtml(p.title) + "</h2>" +
      '<div class="post-detail-meta">' +
        avatarHTML(author, "avatar avatar-sm") +
        nameWithRole(author) +
        "<span>发布于 " + fmtTime(p.createTime) + "</span>" +
        "<span>· 👁 " + (p.viewCount || 0) + " 次浏览</span>" +
        "<span>· 💬 " + (p.commentCount || 0) + " 条评论</span>" +
        '<span class="spacer"></span>' +
        postBadges(p) +
      "</div>" +
    "</div>" +
    '<div class="post-body">' + escapeHtml(p.content) + "</div>" +
    (imgs ? '<div class="post-images">' + imgs + "</div>" : "") +
    '<div class="post-actions">' +
      '<button class="btn ' + (p.liked ? "btn-soft-danger" : "btn-ghost") + ' btn-sm" id="likeBtn" onclick="toggleLike()">' +
        "♥ " + (p.liked ? "已赞" : "点赞") + " " + (p.likeCount || 0) + "</button>" +
      (p.canReport ? '<button class="btn btn-ghost btn-sm" onclick="openReport(\'post\',' + p.id + ')">🚩 举报</button>' : "") +
      '<span class="spacer"></span>' +
      (isAdmin ? adminActions(p) : "") +
      (p.canEdit ? '<button class="btn btn-ghost btn-sm" onclick="editPost(' + p.id + ')">编辑</button>' : "") +
      (p.canDelete ? '<button class="btn btn-soft-danger btn-sm" onclick="deletePost(' + p.id + ')">删除</button>' : "") +
    "</div>" +
    '<div class="comment-section">' +
      '<div class="comment-head">💬 全部评论 <span class="badge">' + (p.commentCount || 0) + "</span></div>" +
      '<div id="commentComposer"></div>' +
      '<div class="comment-list" id="commentList"><div class="loading-tip">评论加载中…</div></div>' +
      '<div class="pager" id="commentPager" style="padding:0 24px 20px"></div>' +
    "</div>" +
  "</div>";
}

/* ---------- 评论 ---------- */

function renderComposer() {
  const box = document.getElementById("commentComposer");
  if (!box) return;
  const p = current.post;

  if (p.isLocked) {
    box.innerHTML = '<div class="locked-tip">🔒 该帖已被管理员锁定，不再接受新回复</div>';
    return;
  }
  /* 待审核 / 被驳回的帖还没公开，不能评论（通过后开放） */
  if (Number(p.status) === 0 || Number(p.status) === 2) {
    box.innerHTML = '<div class="locked-tip">⏳ 该帖还未通过审核，通过后才能评论</div>';
    return;
  }
  if (muted) {
    box.innerHTML = '<div class="locked-tip" style="background:var(--danger-50);color:var(--danger);border-color:var(--danger-100)">' +
      "🚫 你已被禁言，暂时不能评论</div>";
    return;
  }
  box.innerHTML =
    '<div class="comment-composer">' +
      '<textarea id="cmContent" maxlength="1000" style="min-height:78px" ' +
        'placeholder="友善发言，理性讨论…"></textarea>' +
      '<div class="cc-foot">' +
        '<span class="text-xs text-light" id="cmCount">0 / 1000</span>' +
        '<span class="spacer"></span>' +
        '<span id="cmReplyHint"></span>' +
        '<button class="btn btn-primary btn-sm" id="cmSubmit" onclick="submitComment()">发表评论</button>' +
      "</div>" +
    "</div>";

  const ta = document.getElementById("cmContent");
  ta.addEventListener("input", function () {
    document.getElementById("cmCount").textContent = ta.value.length + " / 1000";
  });
  /* Ctrl/Cmd + Enter 快捷发送 */
  ta.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submitComment();
  });
  renderReplyHint();
}

function renderReplyHint() {
  const el = document.getElementById("cmReplyHint");
  if (!el) return;
  el.innerHTML = current.replyTo
    ? '<span class="tag">回复 @' + escapeHtml(current.replyTo.userName) +
      ' <a href="javascript:void(0)" onclick="cancelReply()" style="margin-left:4px">✕</a></span>'
    : "";
}

function setReply(commentId, userName) {
  current.replyTo = { id: commentId, userName: userName };
  renderReplyHint();
  const ta = document.getElementById("cmContent");
  if (ta) { ta.focus(); ta.placeholder = "回复 @" + userName + "…"; }
}

function cancelReply() {
  current.replyTo = null;
  const ta = document.getElementById("cmContent");
  if (ta) ta.placeholder = "友善发言，理性讨论…";
  renderReplyHint();
}

async function loadComments(page) {
  const box = document.getElementById("commentList");
  if (!box) return;
  current.commentPage = page || 1;
  if (!box.querySelector(".comment-item")) box.innerHTML = '<div class="loading-tip">评论加载中…</div>';

  try {
    const res = await request("GET", "/api/forum/posts/" + current.post.id +
      "/comments?page=" + current.commentPage + "&size=15");
    current.comments = res.list || [];
    renderComments();
    renderPager("commentPager", res, function (p) { loadComments(p); });
    renderComposer();
  } catch (e) {
    box.innerHTML = '<div style="padding:16px 24px">' + failState(e, "评论") + "</div>";
  }
}

function commentHTML(c, isReply) {
  const author = { id: c.userId, nickname: c.userName, avatar: c.userAvatar, role: c.userRole };
  const canReport = !isAdmin && c.userId !== me.id && !muted;
  return '<div class="' + (isReply ? "comment-reply-item" : "comment-item") + '">' +
    avatarHTML(author, "avatar " + (isReply ? "avatar-xs" : "avatar-sm")) +
    '<div class="comment-main">' +
      '<div class="comment-meta">' +
        '<span class="comment-name">' + escapeHtml(c.userName) + "</span>" +
        (c.userRole === "admin" ? '<span class="badge brand">管理员</span>' : "") +
        (isReply && c.replyToUserName
          ? '<span class="comment-time">回复 <span class="reply-target">@' + escapeHtml(c.replyToUserName) + "</span></span>"
          : "") +
        '<span class="comment-time">' + relTime(c.createTime) + "</span>" +
      "</div>" +
      '<div class="comment-text">' + escapeHtml(c.content) + "</div>" +
      '<div class="comment-tools">' +
        (current.post.isLocked || muted ? "" :
          '<button class="post-act" onclick="setReply(' + (isReply ? c.parentId : c.id) + ', \'' +
            escapeHtml(c.userName).replace(/'/g, "") + '\')">回复</button>') +
        (c.canDelete ? '<button class="post-act danger" onclick="deleteComment(' + c.id + ')">删除</button>' : "") +
        (canReport ? '<button class="post-act" onclick="openReport(\'comment\',' + c.id + ')">举报</button>' : "") +
      "</div>" +
    "</div>" +
  "</div>";
}

function renderComments() {
  const box = document.getElementById("commentList");
  if (!box) return;
  if (!current.comments.length) {
    box.innerHTML = emptyState("💭", "还没有评论", "来抢个沙发吧");
    return;
  }
  box.innerHTML = current.comments.map(function (c) {
    const kids = (c.children || []).map(function (r) { return commentHTML(r, true); }).join("");
    return commentHTML(c, false) +
      (kids ? '<div class="comment-replies">' + kids + "</div>" : "");
  }).join("");
}

async function submitComment() {
  const ta = document.getElementById("cmContent");
  if (!ta) return;
  const content = ta.value.trim();
  if (!content) return showToast("先写点内容吧", "warn");

  const btn = document.getElementById("cmSubmit");
  btn.disabled = true;
  btn.textContent = "发表中…";
  try {
    const body = { content: content };
    if (current.replyTo) body.parentId = current.replyTo.id;
    await request("POST", "/api/forum/posts/" + current.post.id + "/comments", body);
    ta.value = "";
    document.getElementById("cmCount").textContent = "0 / 1000";
    cancelReply();
    showToast("评论已发布", "ok");
    /* 重新拉一次帖子拿到最新评论数 + 重新拉评论列表 */
    const p = await request("GET", "/api/forum/posts/" + current.post.id);
    current.post = p;
    document.querySelector(".comment-head .badge").textContent = p.commentCount || 0;
    loadComments(current.commentPage);
  } catch (e) {
    showToast(e.message, "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "发表评论";
  }
}

async function deleteComment(id) {
  const ok = await confirmDialog({
    title: "删除评论", danger: true, okText: "删除",
    text: "删除后该评论（及其下的回复）将不再显示，此操作不可恢复。"
  });
  if (!ok) return;
  try {
    await request("DELETE", "/api/forum/comments/" + id);
    showToast("评论已删除", "ok");
    const p = await request("GET", "/api/forum/posts/" + current.post.id);
    current.post = p;
    document.querySelector(".comment-head .badge").textContent = p.commentCount || 0;
    loadComments(current.commentPage);
  } catch (e) { showToast(e.message, "err"); }
}

/* ---------- 点赞 ---------- */

async function toggleLike() {
  const btn = document.getElementById("likeBtn");
  if (!btn || !current.post) return;
  btn.disabled = true;
  try {
    const res = await request("POST", "/api/forum/posts/" + current.post.id + "/like");
    current.post.liked = res.liked;
    current.post.likeCount = res.likeCount;
    btn.className = "btn btn-sm " + (res.liked ? "btn-soft-danger" : "btn-ghost");
    btn.textContent = "♥ " + (res.liked ? "已赞" : "点赞") + " " + res.likeCount;
  } catch (e) { showToast(e.message, "err"); }
  btn.disabled = false;
}

/* ---------- 帖子管理操作 ---------- */

async function setFlag(id, field, value) {
  const body = {};
  body[field] = value;
  try {
    await request("PUT", "/api/admin/forum/posts/" + id + "/flags", body);
    showToast(field === "isTop" ? (value ? "已置顶" : "已取消置顶")
            : field === "isEssence" ? (value ? "已加精" : "已取消精华")
            : (value ? "已锁定，无法再回复" : "已解锁"), "ok");
    if (current.post && current.post.id === id) openDetail(id);
    else loadPosts(state.page);
    refreshBadges();
  } catch (e) { showToast(e.message, "err"); }
}

async function deletePost(id) {
  const ok = await confirmDialog({
    title: "删除帖子", danger: true, okText: "删除",
    text: "帖子将被删除（后端是软删，数据库里仍保留记录）。评论会一并不可见。"
  });
  if (!ok) return;
  try {
    await request("DELETE", "/api/forum/posts/" + id);
    showToast("帖子已删除", "ok");
    if (location.hash) backToList(); else loadPosts(state.page);
  } catch (e) { showToast(e.message, "err"); }
}

/* ---------- 举报 ---------- */

var reportTarget = null;
function openReport(targetType, targetId) {
  if (muted) return showToast("你已被禁言，不能举报", "warn");
  reportTarget = { type: targetType, id: targetId };
  document.getElementById("rpReason").value = "";
  openModal("reportModal");
}

async function submitReport() {
  if (!reportTarget) return;
  const btn = document.getElementById("rpSubmit");
  btn.disabled = true;
  try {
    await request("POST", "/api/forum/reports", {
      targetType: reportTarget.type,
      targetId: reportTarget.id,
      reasonType: document.getElementById("rpType").value,
      reason: document.getElementById("rpReason").value.trim()
    });
    closeModal("reportModal");
    showToast("举报已提交，管理员会尽快处理", "ok");
    if (current.post && reportTarget.type === "post" && current.post.id === reportTarget.id) {
      current.post.canReport = false;
      openDetail(current.post.id);
    }
  } catch (e) {
    showToast(e.message, "err");
  } finally {
    btn.disabled = false;
    reportTarget = null;
  }
}

/* ==================== 发帖 / 编辑 ==================== */

function buildTagSelect() {
  const sel = document.getElementById("cpTag");
  if (!sel) return;
  sel.innerHTML = TAGS.map(function (t) {
    return '<option value="' + t.key + '">' + t.icon + " " + t.label + "</option>";
  }).join("");
}

function openCompose() {
  if (muted) return showToast("你已被禁言，不能发帖", "warn");
  compose = { id: null, images: [], saving: false };
  document.getElementById("composeTitle").textContent = "发布新帖";
  document.getElementById("cpTitle").value = "";
  document.getElementById("cpContent").value = "";
  document.getElementById("cpTag").value = "general";
  document.getElementById("cpCount").textContent = "0";
  document.getElementById("cpSubmit").textContent = "发布";
  renderComposeImgs();
  openModal("composeModal");
}

async function editPost(id) {
  try {
    const p = current.post && current.post.id === id ? current.post : await request("GET", "/api/forum/posts/" + id);
    compose = { id: id, images: (p.images || []).slice(0, 3), saving: false };
    document.getElementById("composeTitle").textContent = "编辑帖子";
    document.getElementById("cpTitle").value = p.title || "";
    document.getElementById("cpContent").value = p.content || "";
    document.getElementById("cpTag").value = TAG_MAP[p.tag] ? p.tag : "general";
    document.getElementById("cpCount").textContent = (p.content || "").length;
    document.getElementById("cpSubmit").textContent = "保存修改";
    renderComposeImgs();
    openModal("composeModal");
  } catch (e) { showToast(e.message, "err"); }
}

function renderComposeImgs() {
  const box = document.getElementById("cpImgs");
  if (!box) return;
  box.innerHTML = compose.images.map(function (u, i) {
    return '<div class="compose-img"><img src="' + escapeHtml(u) + '" alt="">' +
      '<button class="del" title="移除" onclick="removeComposeImg(' + i + ')">×</button></div>';
  }).join("") +
  (compose.images.length < 3
    ? '<button type="button" class="compose-add" onclick="cpPickFile()">＋<small>添加图片</small></button>'
    : "");
}

function cpPickFile() {
  const input = document.getElementById("cpFile");
  if (input) { input.value = ""; input.click(); }
}

function cpFileChosen(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  const bad = checkImageFile(f);
  if (bad) return showToast(bad, "err");

  const prog = document.getElementById("cpProgress");
  const bar = document.getElementById("cpProgressBar");
  if (prog) prog.style.display = "";
  if (bar) bar.style.width = "0%";

  /* 两张图都用同一个接口：/api/upload?type=forum */
  upload("/api/upload?type=forum", f, function (p) { if (bar) bar.style.width = p + "%"; })
    .then(function (data) {
      const url = (data && data.url) || null;
      if (!url) throw new Error("上传成功但没返回图片地址");
      compose.images.push(url);
      renderComposeImgs();
      showToast("图片已上传", "ok");
    })
    .catch(function (e) { showToast(e.message, "err"); })
    .then(function () { if (prog) prog.style.display = "none"; });
}

function removeComposeImg(i) {
  compose.images.splice(i, 1);
  renderComposeImgs();
}

async function submitPost() {
  if (compose.saving) return;
  const title = document.getElementById("cpTitle").value.trim();
  const content = document.getElementById("cpContent").value.trim();
  const tag = document.getElementById("cpTag").value;

  if (!title) return showToast("标题不能为空", "warn");
  if (!content) return showToast("正文不能为空", "warn");
  if (compose.images.length > 3) return showToast("最多 3 张图片", "warn");

  const btn = document.getElementById("cpSubmit");
  compose.saving = true;
  btn.disabled = true;
  btn.textContent = "提交中…";

  try {
    const body = { title: title, content: content, tag: tag, images: compose.images };
    if (compose.id) {
      await request("PUT", "/api/forum/posts/" + compose.id, body);
      showToast("已保存并重新提交审核", "ok");
      closeModal("composeModal");
      openDetail(compose.id);
    } else {
      const res = await request("POST", "/api/forum/posts", body);
      showToast("提交成功，管理员审核通过后会展示", "ok");
      closeModal("composeModal");
      goDetail(res.id);
    }
    loadStats();
  } catch (e) {
    showToast(e.message, "err");
  } finally {
    compose.saving = false;
    btn.disabled = false;
    btn.textContent = compose.id ? "保存修改" : "发布";
  }
}

/* ==================== 侧边统计 ==================== */

async function loadStats() {
  const box = document.getElementById("forumStats");
  if (!box) return;
  try {
    const s = await request("GET", "/api/forum/stats");
    box.innerHTML =
      '<div class="side-stat"><span class="text-sub">帖子总数</span><b>' + (s.totalPosts || 0) + "</b></div>" +
      '<div class="side-stat"><span class="text-sub">今日新帖</span><b>' + (s.todayPosts || 0) + "</b></div>" +
      '<div class="side-stat"><span class="text-sub">评论总数</span><b>' + (s.totalComments || 0) + "</b></div>" +
      '<div class="side-stat"><span class="text-sub">我的帖子</span><b>' + (s.myPosts || 0) + "</b></div>" +
      '<div class="side-stat"><span class="text-sub">我收到的赞</span><b>' + (s.likeReceived || 0) + "</b></div>" +
      (isAdmin ? '<div class="side-stat"><span class="text-sub">待审核帖子</span>' +
        '<b style="color:' + (s.pendingPosts ? "var(--warn)" : "inherit") + '">' +
        (s.pendingPosts || 0) + "</b></div>" : "") +
      (isAdmin ? '<div class="side-stat"><span class="text-sub">待处理举报</span>' +
        '<b style="color:' + (s.pendingReports ? "var(--danger)" : "inherit") + '">' +
        (s.pendingReports || 0) + "</b></div>" : "");
  } catch (e) {
    box.innerHTML = '<div class="text-xs text-light" style="padding:6px 0">概览接口未实现（' +
      escapeHtml(e.message).slice(0, 40) + "…）</div>";
  }
}

window.addEventListener("pageshow", function (e) { if (e.persisted) refreshBadges(); });

forumInit();
