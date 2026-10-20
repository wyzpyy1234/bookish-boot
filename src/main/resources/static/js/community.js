/* ==========================================================
 * 社区管理（独立页面）
 *   举报处理 / 帖子审核 / 用户与禁言 / 公告管理
 *
 * 接口：3.12~3.17（举报/审核/用户禁言）+ 4.6~4.8（公告）
 * 注意：前端隐藏按钮 ≠ 后端安全 —— 每个管理接口后端都必须自己校验 role=admin
 * ========================================================== */

window.PAGE_ROLE = "admin";
var me = requireLogin("admin");

mountShell({
  active: "community",
  title: "社区管理",
  desc: "举报 / 审核 / 禁言 / 公告，社区事务集中在这里"
});

var commSub = "reports";   /* 当前子页 */
var dealId = null;         /* 正在处理的举报 id */
var auditPage = 1;         /* 审核列表当前页（轮询时保持不跳页） */
var reportPage = 1;        /* 举报列表当前页 */
var muteUserId = null;     /* 正在禁言的用户 id */
var admAnnId = null;       /* 公告弹窗编辑的 id */
var rejectId = null;       /* 正在驳回的帖子 id */

function safeInit() {
  if (!me) return;
  /* 支持 community.html#audits 这种直链 */
  const h = (location.hash || "").replace("#", "");
  if (h && ["reports", "audits", "users", "anns"].indexOf(h) >= 0) commSub = h;
  switchComm(commSub);
  loadCommunityBadge();
}

/* 静默换表格内容：内容没变就不动 DOM，轮询时表格不会闪一下 */
function tableSwap(table, html) {
  if (!table) return;
  if (table.getAttribute("data-html") === html) return;
  table.setAttribute("data-html", html);
  table.innerHTML = html;
}

/* ==================== 子页切换 ==================== */

function switchComm(sub) {
  commSub = sub;
  const btns = document.querySelectorAll("#cmSeg .seg-btn");
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.toggle("active", btns[i].getAttribute("data-sub") === sub);
  }
  document.getElementById("subAudits").classList.toggle("hidden", sub !== "audits");
  document.getElementById("subReports").classList.toggle("hidden", sub !== "reports");
  document.getElementById("subUsers").classList.toggle("hidden", sub !== "users");
  document.getElementById("subAnns").classList.toggle("hidden", sub !== "anns");

  if (sub === "audits") loadAudits(1);
  if (sub === "reports") loadReports(1);
  if (sub === "users") loadUsers(1);
  if (sub === "anns") loadAnns(1);
}

/* 待办数量显示在子页标签上（一进来就知道有活干没） */
async function loadCommunityBadge() {
  try {
    const s = await request("GET", "/api/forum/stats", null, { silent: true });
    setCnt("segReportCnt", (s && s.pendingReports) || 0);
    setCnt("segAuditCnt", (s && s.pendingPosts) || 0);
  } catch (e) { /* 静默失败 */ }
}

function setCnt(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = n;
  el.style.display = n > 0 ? "" : "none";
}

/* ---------- 帖子审核 ---------- */

const POST_STATUS_TAG = {
  0: '<span class="badge danger">待审核</span>',
  1: '<span class="badge success">已发布</span>',
  2: '<span class="badge">已驳回</span>'
};

async function loadAudits(page, opts) {
  const silent = !!(opts && opts.silent);
  auditPage = page;
  const table = document.getElementById("auditTable");
  if (!silent) table.innerHTML = '<tr><td class="table-empty">加载中…</td></tr>';

  try {
    let qs = "?page=" + page + "&size=10";
    const st = document.getElementById("auStatus").value;
    const kw = document.getElementById("auKeyword").value.trim();
    if (st !== "") qs += "&status=" + st;
    if (kw) qs += "&keyword=" + encodeURIComponent(kw);

    const res = await request("GET", "/api/forum/posts" + qs);
    const list = res.list || [];

    const html =
      '<tr><th>#</th><th>标题 / 摘要</th><th>作者</th><th class="t-center">标签</th>' +
      '<th class="t-center">发布时间</th><th class="t-center">状态</th><th class="t-center">操作</th></tr>' +
      (list.length ? list.map(function (p) {
        const ops = p.status === 0
          ? '<button class="btn btn-primary btn-sm" onclick="approveAudit(' + p.id + ')">通过</button> ' +
            '<button class="btn btn-soft-danger btn-sm" onclick="openReject(' + p.id + ',\'' +
              escapeHtml(p.title).replace(/'/g, "") + '\')">驳回</button>'
          : '<a class="btn btn-ghost btn-sm" href="forum.html#/p/' + p.id + '" target="_blank">查看</a>';
        const reason = (p.status === 2 && p.rejectReason)
          ? '<div class="text-sub text-sm">理由：' + escapeHtml(p.rejectReason) + "</div>" : "";
        return "<tr>" +
          "<td>" + p.id + "</td>" +
          '<td><div style="font-weight:600">' + escapeHtml(p.title || "（无标题）") + "</div>" +
            '<div class="text-sub text-sm">' + escapeHtml(p.excerpt || "") + "</div></td>" +
          "<td>" + escapeHtml(p.authorName || "—") + "</td>" +
          '<td class="t-center"><span class="tag">' + escapeHtml(p.tag || "—") + "</span></td>" +
          '<td class="t-center text-sm">' + fmtTime(p.createTime) + "</td>" +
          '<td class="t-center">' + (POST_STATUS_TAG[p.status] || "—") + reason + "</td>" +
          '<td class="t-center t-narrow">' + ops + "</td>" +
        "</tr>";
      }).join("") : '<tr><td colspan="7" class="table-empty">这一栏没有帖子 🎉</td></tr>');

    tableSwap(table, html);
    renderPager("auditPager", res, function (p) { loadAudits(p); });
  } catch (e) {
    if (!silent) table.innerHTML = '<tr><td class="table-empty">' + escapeHtml(e.message) + "</td></tr>";
  }
}

function resetAudits() {
  document.getElementById("auStatus").value = "0";
  document.getElementById("auKeyword").value = "";
  loadAudits(1);
}

async function approveAudit(id) {
  const ok = await confirmDialog({ title: "审核通过", text: "通过后所有读者都能看到这条帖子，确认吗？" });
  if (!ok) return;
  try {
    await request("POST", "/api/forum/admin/posts/" + id + "/approve");
    showToast("已通过", "ok");
    loadAudits(1);
    loadCommunityBadge();
    refreshBadges();
  } catch (e) { showToast(e.message, "err"); }
}

function openReject(id, title) {
  rejectId = id;
  document.getElementById("rejectTarget").innerHTML =
    "即将驳回：<b>" + escapeHtml(title) + "</b>";
  document.getElementById("rejectReason").value = "";
  openModal("rejectModal");
}

async function submitReject() {
  if (!rejectId) return;
  const btn = document.getElementById("rejectSubmit");
  btn.disabled = true;
  try {
    await request("POST", "/api/forum/admin/posts/" + rejectId + "/reject", {
      reason: document.getElementById("rejectReason").value.trim()
    });
    showToast("已驳回", "ok");
    closeModal("rejectModal");
    loadAudits(1);
    loadCommunityBadge();
    refreshBadges();
  } catch (e) {
    showToast(e.message, "err");
  } finally {
    btn.disabled = false;
    rejectId = null;
  }
}

/* ---------- 举报处理 ---------- */

const REASON_MAP = { spam: "广告/灌水", abuse: "辱骂", illegal: "违法违规", other: "其他" };

async function loadReports(page, opts) {
  const silent = !!(opts && opts.silent);
  reportPage = page;
  const table = document.getElementById("reportTable");
  if (!silent) table.innerHTML = '<tr><td class="table-empty">加载中…</td></tr>';

  try {
    let qs = "?page=" + page + "&size=10";
    const st = document.getElementById("rpStatus").value;
    const tt = document.getElementById("rpTargetType").value;
    if (st !== "") qs += "&status=" + st;
    if (tt) qs += "&targetType=" + tt;

    const res = await request("GET", "/api/admin/forum/reports" + qs);
    const list = res.list || [];

    const html =
      '<tr><th>#</th><th>类型</th><th>被举报内容</th><th>作者</th>' +
      '<th>举报人 / 原因</th><th>举报时间</th><th class="t-center">状态</th><th class="t-center">操作</th></tr>' +
      (list.length ? list.map(function (r) {
        const stTag = r.status === 0 ? '<span class="badge danger">待处理</span>'
                    : r.status === 1 ? '<span class="badge success">已处理</span>'
                    : '<span class="badge">已驳回</span>';
        const target = r.targetType === "post"
          ? '<b>' + escapeHtml(r.targetTitle || "（帖子已删除）") + "</b><div class=\"text-sub text-sm\">" +
            escapeHtml(r.targetExcerpt || "") + "</div>"
          : '<span class="text-sub">评论：</span>' + escapeHtml(r.targetExcerpt || "");
        return "<tr>" +
          "<td>" + r.id + "</td>" +
          '<td><span class="tag gray">' + (r.targetType === "post" ? "帖子" : "评论") + "</span></td>" +
          "<td>" + target + "</td>" +
          "<td>" + escapeHtml(r.authorName || "—") + "</td>" +
          '<td>' + escapeHtml(r.reporterName || "—") +
            '<div class="text-sub text-sm">' + escapeHtml(REASON_MAP[r.reasonType] || r.reasonType) +
            (r.reason ? "：" + escapeHtml(r.reason) : "") + "</div></td>" +
          '<td class="text-sm">' + fmtTime(r.createTime) + "</td>" +
          '<td class="t-center">' + stTag +
            (r.status !== 0 ? '<div class="text-sub text-sm">' + escapeHtml(r.handleAction || "") + "</div>" : "") +
          "</td>" +
          '<td class="t-center t-narrow">' +
            (r.status === 0
              ? '<button class="btn btn-primary btn-sm" onclick=\'openDeal(' + JSON.stringify({
                  id: r.id, type: r.targetType, title: r.targetTitle, excerpt: r.targetExcerpt, author: r.authorName
                }).replace(/'/g, "") + ')\'>处理</button>'
              : '<span class="text-light text-sm">' + (r.handleRemark ? escapeHtml(r.handleRemark) : "—") + "</span>") +
          "</td>" +
        "</tr>";
      }).join("") : '<tr><td colspan="8" class="table-empty">没有符合条件的举报 🎉</td></tr>');

    tableSwap(table, html);
    renderPager("reportPager", res, function (p) { loadReports(p); });
  } catch (e) {
    if (!silent) table.innerHTML = '<tr><td class="table-empty">' + escapeHtml(e.message) + "</td></tr>";
  }
}

let dealTargetData = null;
function openDeal(info) {
  dealTargetData = info;
  dealId = info.id;
  document.getElementById("dealTarget").innerHTML =
    "被举报" + (info.type === "post" ? "帖子" : "评论") + "：<b>" +
    escapeHtml(info.title || "") + "</b><br>" + escapeHtml(info.excerpt || "") +
    "<br>作者：" + escapeHtml(info.author || "—");
  document.getElementById("dealAction").value = "hide";
  document.getElementById("dealRemark").value = "";
  onDealActionChange();
  openModal("dealModal");
}

function onDealActionChange() {
  const act = document.getElementById("dealAction").value;
  document.getElementById("dealDaysField").style.display = act === "mute" ? "" : "none";
}

async function submitDeal() {
  if (!dealId) return;
  const action = document.getElementById("dealAction").value;
  const days = document.getElementById("dealDays").value;
  const body = { action: action, remark: document.getElementById("dealRemark").value.trim() };
  if (action === "mute") body.muteDays = days === "" ? null : Number(days);

  const btn = document.getElementById("dealSubmit");
  btn.disabled = true;
  try {
    await request("PUT", "/api/admin/forum/reports/" + dealId, body);
    showToast("已处理", "ok");
    closeModal("dealModal");
    loadReports(1);
    loadCommunityBadge();
    refreshBadges();
  } catch (e) {
    showToast(e.message, "err");
  } finally {
    btn.disabled = false;
    dealId = null;
  }
}

/* ---------- 用户与禁言 ---------- */

async function loadUsers(page) {
  const table = document.getElementById("userTable");
  table.innerHTML = '<tr><td class="table-empty">加载中…</td></tr>';

  try {
    let qs = "?page=" + page + "&size=10";
    const kw = document.getElementById("uKeyword").value.trim();
    const role = document.getElementById("uRole").value;
    const st = document.getElementById("uStatus").value;
    if (kw) qs += "&keyword=" + encodeURIComponent(kw);
    if (role) qs += "&role=" + role;
    if (st !== "") qs += "&status=" + st;

    const res = await request("GET", "/api/admin/users" + qs);

    table.innerHTML =
      '<tr><th>ID</th><th>用户</th><th>手机号</th><th class="t-center">角色</th>' +
      '<th class="t-center">发帖</th><th class="t-center">评论</th><th class="t-center">在借</th>' +
      '<th class="t-center">状态</th><th class="t-center">操作</th></tr>' +
      (res.list || []).map(function (u) {
        const muted = u.status === 0;
        const expired = muted && u.muteUntil &&
          new Date(String(u.muteUntil).replace(/-/g, "/")) < new Date();
        const reason = u.muteReason || "";
        const reasonShort = reason.length > 14 ? reason.slice(0, 14) + "…" : reason;
        const stTag = muted
          ? '<span class="badge ' + (expired ? "" : "danger") + '">' +
              (expired ? "禁言已到期" : "已禁言") + "</span>" +
            '<div class="text-sub text-sm">' + (u.muteUntil ? "至 " + fmtDate(u.muteUntil) : "永久") + "</div>" +
            (reason ? '<div class="text-sub text-sm" title="' + escapeHtml(reason) + '">理由：' +
                      escapeHtml(reasonShort) + "</div>" : "")
          : '<span class="badge success">正常</span>';
        const canMute = u.id !== me.id && u.role !== "admin";
        const nick = escapeHtml(u.nickname).replace(/'/g, "");
        const ops = muted
          ? '<button class="btn btn-ghost btn-sm" onclick="openMute(' + u.id + ',\'' + nick + '\',true)">改时长</button> ' +
            '<button class="btn btn-ghost btn-sm" onclick="unmuteUser(' + u.id + ',\'' + nick + '\')">解除禁言</button>'
          : (canMute
              ? '<button class="btn btn-soft-danger btn-sm" onclick="openMute(' + u.id + ',\'' + nick + '\',false)">禁言</button>'
              : '<span class="text-light text-sm">—</span>');
        return "<tr>" +
          "<td>" + u.id + "</td>" +
          '<td><div class="flex-center">' + avatarHTML(u, "avatar avatar-sm") +
            "<div><div style=\"font-weight:600\">" + escapeHtml(u.nickname) + "</div>" +
            '<div class="text-sub text-sm">@' + escapeHtml(u.username) + "</div></div></div></td>" +
          '<td class="text-sm">' + escapeHtml(u.phone || "—") + "</td>" +
          '<td class="t-center">' + (u.role === "admin"
            ? '<span class="badge brand">管理员</span>' : '<span class="badge">读者</span>') + "</td>" +
          '<td class="t-center">' + (u.postCount || 0) + "</td>" +
          '<td class="t-center">' + (u.commentCount || 0) + "</td>" +
          '<td class="t-center">' + (u.borrowingCount || 0) + "</td>" +
          '<td class="t-center">' + stTag + "</td>" +
          '<td class="t-center t-narrow">' + ops + "</td>" +
        "</tr>";
      }).join("");

    renderPager("userPager", res, function (p) { loadUsers(p); });
  } catch (e) {
    table.innerHTML = '<tr><td class="table-empty">' + escapeHtml(e.message) + "</td></tr>";
  }
}

function resetUsers() {
  document.getElementById("uKeyword").value = "";
  document.getElementById("uRole").value = "";
  document.getElementById("uStatus").value = "";
  loadUsers(1);
}

function openMute(id, nickname, isEdit) {
  muteUserId = id;
  document.getElementById("muteModalTitle").textContent = isEdit ? "修改禁言时长" : "禁言用户";
  document.getElementById("muteSubmit").textContent = isEdit ? "保存" : "确认禁言";
  document.getElementById("muteTarget").innerHTML = (isEdit ? "修改禁言：" : "即将禁言：") +
    "<b>" + escapeHtml(nickname) + "</b>";
  document.getElementById("muteReason").value = "";
  document.getElementById("muteDays").value = "3";
  openModal("muteModal");
}

async function submitMute() {
  if (!muteUserId) return;
  const days = document.getElementById("muteDays").value;
  const btn = document.getElementById("muteSubmit");
  btn.disabled = true;
  try {
    await request("PUT", "/api/admin/users/" + muteUserId + "/mute", {
      days: days === "" ? null : Number(days),
      reason: document.getElementById("muteReason").value.trim() || "违反社区规范"
    });
    showToast("已禁言", "ok");
    closeModal("muteModal");
    loadUsers(1);
  } catch (e) {
    showToast(e.message, "err");
  } finally {
    btn.disabled = false;
    muteUserId = null;
  }
}

async function unmuteUser(id, nickname) {
  const ok = await confirmDialog({ title: "解除禁言", text: "确认解除对 <b>" + escapeHtml(nickname) + "</b> 的禁言？" });
  if (!ok) return;
  try {
    await request("PUT", "/api/admin/users/" + id + "/unmute");
    showToast("已解除禁言", "ok");
    loadUsers(1);
  } catch (e) { showToast(e.message, "err"); }
}

/* ---------- 公告管理 ---------- */

const ANN_TYPE = { notice: "📌 通知", rule: "📜 规则", event: "🎉 活动" };

async function loadAnns(page) {
  const table = document.getElementById("annTable");
  table.innerHTML = '<tr><td class="table-empty">加载中…</td></tr>';

  try {
    const res = await request("GET", "/api/announcements?page=" + page + "&size=10");
    document.getElementById("annTotal").textContent = res.total;

    table.innerHTML =
      '<tr><th>ID</th><th>标题</th><th class="t-center">类型</th><th class="t-center">置顶</th>' +
      '<th>发布时间</th><th class="t-center">已读</th><th class="t-center">操作</th></tr>' +
      (res.list || []).map(function (a) {
        return "<tr>" +
          "<td>" + a.id + "</td>" +
          '<td><div style="font-weight:600">' + escapeHtml(a.title) + "</div>" +
            '<div class="text-sub text-sm">' + escapeHtml(a.excerpt || "") + "</div></td>" +
          '<td class="t-center"><span class="tag gray">' + (ANN_TYPE[a.type] || "📌 通知") + "</span></td>" +
          '<td class="t-center">' + (a.isTop ? '<span class="badge solid-danger">置顶</span>' : "—") + "</td>" +
          '<td class="text-sm">' + fmtTime(a.publishTime) + "</td>" +
          '<td class="t-center">' + (a.readCount || 0) + " 人</td>" +
          '<td class="t-center t-narrow">' +
            '<button class="btn btn-ghost btn-sm" onclick="admOpenAnn(' + a.id + ')">编辑</button> ' +
            '<button class="btn btn-soft-danger btn-sm" onclick="admDelAnn(' + a.id + ',\'' +
              escapeHtml(a.title).replace(/'/g, "") + '\')">删除</button>' +
          "</td>" +
        "</tr>";
      }).join("");

    renderPager("annPager", res, function (p) { loadAnns(p); });
  } catch (e) {
    table.innerHTML = '<tr><td class="table-empty">' + escapeHtml(e.message) + "</td></tr>";
  }
}

async function admOpenAnn(id) {
  admAnnId = id;
  document.getElementById("annModalTitle").textContent = id ? "编辑公告" : "发布公告";
  document.getElementById("anSubmit").textContent = id ? "保存修改" : "发布";

  if (!id) {
    document.getElementById("anTitle").value = "";
    document.getElementById("anContent").value = "";
    document.getElementById("anType").value = "notice";
    document.getElementById("anStatus").value = "1";
    document.getElementById("anTop").checked = false;
  } else {
    try {
      const a = await request("GET", "/api/announcements/" + id);
      document.getElementById("anTitle").value = a.title || "";
      document.getElementById("anContent").value = a.content || "";
      document.getElementById("anType").value = a.type || "notice";
      document.getElementById("anStatus").value = String(a.status === 0 ? 0 : 1);
      document.getElementById("anTop").checked = !!a.isTop;
    } catch (e) { showToast(e.message, "err"); return; }
  }
  openModal("annModal");
}

async function admSubmitAnn() {
  const body = {
    title: document.getElementById("anTitle").value.trim(),
    content: document.getElementById("anContent").value.trim(),
    type: document.getElementById("anType").value,
    status: Number(document.getElementById("anStatus").value),
    isTop: document.getElementById("anTop").checked ? 1 : 0
  };
  if (!body.title || !body.content) return showToast("标题和正文必填", "warn");

  const btn = document.getElementById("anSubmit");
  btn.disabled = true;
  try {
    if (admAnnId) {
      await request("PUT", "/api/admin/announcements/" + admAnnId, body);
      showToast("公告已更新", "ok");
    } else {
      await request("POST", "/api/admin/announcements", body);
      showToast("公告已发布", "ok");
    }
    closeModal("annModal");
    loadAnns(1);
  } catch (e) {
    showToast(e.message, "err");
  } finally {
    btn.disabled = false;
    admAnnId = null;
  }
}

async function admDelAnn(id, title) {
  const ok = await confirmDialog({
    title: "删除公告", danger: true, okText: "删除",
    text: "确认删除《" + escapeHtml(title) + "》吗？（后端软删，已读记录保留）"
  });
  if (!ok) return;
  try {
    await request("DELETE", "/api/admin/announcements/" + id);
    showToast("已删除", "ok");
    loadAnns(1);
  } catch (e) { showToast(e.message, "err"); }
}

/* 自动刷新：审核 / 举报这两栏每轮静默刷新 —— 新待审、新举报不用 F5 */
document.addEventListener("bk:poll", function () {
  loadCommunityBadge();
  if (document.visibilityState === "hidden") return;
  if (isUiBlocked()) return;
  if (commSub === "audits") loadAudits(auditPage, { silent: true });
  if (commSub === "reports") loadReports(reportPage, { silent: true });
});

window.addEventListener("pageshow", function (e) {
  if (!e.persisted) return;
  refreshBadges();
  loadCommunityBadge();
  if (commSub === "audits") loadAudits(auditPage, { silent: true });
  if (commSub === "reports") loadReports(reportPage, { silent: true });
});

safeInit();
