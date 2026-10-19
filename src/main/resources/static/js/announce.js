/* ==========================================================
 * 通知公告页逻辑
 *   列表（类型筛选 / 搜索 / 只看未读 / 置顶优先） → 详情抽屉（打开即标记已读）
 *   全部标为已读 → 管理员发布 / 编辑 / 删除 / 上下架
 *
 * 接口对应《03-论坛与公告-接口文档》第 4 节。
 * ========================================================== */

window.PAGE_ROLE = detectRole();
var me = requireLogin();
const isAdmin = me.role === "admin";

var state = { keyword: "", type: "", onlyUnread: false, page: 1, size: 10 };
var reqSeq = 0, kwTimer = null, composing = false;
var annModalId = null;      /* 公告弹窗当前编辑的 id（null = 新增） */
var currentAnn = null;

const ANN_META = {
  notice: { icon: "📌", label: "通知", cls: "" },
  rule:   { icon: "📜", label: "规则", cls: "rule" },
  event:  { icon: "🎉", label: "活动", cls: "event" }
};

mountShell({
  active: "announcements",
  title: "通知公告",
  desc: isAdmin ? "管理员可发布 / 编辑 / 下架公告，并查看已读统计" : "图书馆的最新通知、规则与活动",
  actions: isAdmin
    ? '<button class="btn btn-primary btn-sm" onclick="openAnnModal(null)">＋ 发布公告</button>'
    : ""
});

function annInit() {
  const kw = document.getElementById("aKeyword");
  if (kw) {
    kw.addEventListener("compositionstart", function () { composing = true; });
    kw.addEventListener("compositionend", function () { composing = false; onKeywordInput(); });
  }
  loadUnread();
  loadList(1);
}

/* ==================== 未读数 ==================== */

async function loadUnread() {
  try {
    const res = await request("GET", "/api/announcements/unread-count");
    const n = (res && res.unread) || 0;
    document.getElementById("unreadNum").textContent = n;
    document.getElementById("unreadNum").style.color = n > 0 ? "var(--danger)" : "inherit";
    refreshBadges();
  } catch (e) { /* 忽略 */ }
}

/* ==================== 列表 ==================== */

function pickType(el, type) {
  state.type = type;
  const tabs = document.querySelectorAll("#typeTabs button");
  for (let i = 0; i < tabs.length; i++) tabs[i].classList.remove("active");
  if (el) el.classList.add("active");
  loadList(1);
}

function toggleUnread() {
  state.onlyUnread = !state.onlyUnread;
  document.getElementById("chipUnread").classList.toggle("active", state.onlyUnread);
  loadList(1);
}

function onKeywordInput() {
  if (composing) return;
  const v = document.getElementById("aKeyword").value.trim();
  document.getElementById("aClear").style.display = v ? "flex" : "none";
  clearTimeout(kwTimer);
  kwTimer = setTimeout(function () {
    if (v === state.keyword) return;
    state.keyword = v;
    loadList(1);
  }, 300);
}

function onKeywordKey(e) {
  if (e.key === "Enter") {
    clearTimeout(kwTimer);
    state.keyword = document.getElementById("aKeyword").value.trim();
    loadList(1);
  } else if (e.key === "Escape") clearKeyword();
}

function clearKeyword() {
  clearTimeout(kwTimer);
  document.getElementById("aKeyword").value = "";
  document.getElementById("aClear").style.display = "none";
  if (state.keyword !== "") { state.keyword = ""; loadList(1); }
  document.getElementById("aKeyword").focus();
}

async function loadList(page) {
  state.page = page;
  const box = document.getElementById("annList");
  const seq = ++reqSeq;
  if (box.querySelector(".ann-item")) box.classList.add("is-busy");
  else box.innerHTML = skeletonRows(4);

  try {
    const qs = "?page=" + page + "&size=" + state.size +
      (state.keyword ? "&keyword=" + encodeURIComponent(state.keyword) : "") +
      (state.type ? "&type=" + state.type : "") +
      (state.onlyUnread ? "&onlyUnread=true" : "");

    const res = await request("GET", "/api/announcements" + qs);
    if (seq !== reqSeq) return;
    box.classList.remove("is-busy");
    renderList(res.list || []);
    renderPager("pager", res, function (p) { loadList(p); });
  } catch (e) {
    if (seq !== reqSeq) return;
    box.classList.remove("is-busy");
    box.innerHTML = failState(e);
  }
}

function failState(e) {
  const mockHint = USE_MOCK ? "" :
    "<p style=\"margin-top:8px\">后端 4.x 接口还没写？把 <b>js/api.js</b> 顶部的 " +
    "<b>USE_MOCK</b> 改成 <b>true</b> 即可用假数据预览本页。</p>";
  return emptyState("🔌", "公告加载失败", escapeHtml(e && e.message || "加载失败") + mockHint);
}

function renderList(list) {
  const box = document.getElementById("annList");
  if (!list.length) {
    box.innerHTML = emptyState("📭", state.onlyUnread ? "没有未读公告" : "暂无公告",
      state.onlyUnread ? "所有公告都已读完，很棒 👏" : "管理员还没有发布公告");
    return;
  }

  box.innerHTML = list.map(function (a) {
    const meta = ANN_META[a.type] || ANN_META.notice;
    return '<div class="ann-item fade-up' + (a.isRead ? "" : " unread") + '" onclick="openAnn(' + a.id + ')">' +
      '<div class="ann-ico ' + meta.cls + '">' + meta.icon + "</div>" +
      '<div class="ann-main">' +
        '<div class="ann-title">' +
          (a.isRead ? "" : '<span class="ann-dot"></span>') +
          escapeHtml(a.title) +
          (a.isTop ? '<span class="badge solid-danger">置顶</span>' : "") +
          '<span class="tag gray">' + meta.label + "</span>" +
        "</div>" +
        (a.excerpt ? '<div class="ann-excerpt">' + highlight(a.excerpt, state.keyword) + "</div>" : "") +
        '<div class="ann-meta">' +
          "<span>发布人 " + escapeHtml(a.adminName || "管理员") + "</span>" +
          "<span>发布时间 " + fmtTime(a.publishTime) + "</span>" +
          "<span>已读 " + (a.readCount || 0) + " 人</span>" +
          (a.isRead ? "<span>· 已读</span>" : '<span style="color:var(--brand);font-weight:600">· 未读</span>') +
        "</div>" +
      "</div>" +
    "</div>";
  }).join("");
}

/* ==================== 详情抽屉 ==================== */

async function openAnn(id) {
  openDrawer("annDrawer");
  document.getElementById("annDrawerTitle").textContent = "加载中…";
  document.getElementById("annDrawerContent").innerHTML = '<div class="loading-tip">加载中…</div>';
  document.getElementById("annDrawerBadges").innerHTML = "";
  document.getElementById("annDrawerMeta").textContent = "";
  document.getElementById("annDrawerFoot").querySelector("#annAdminBtns").innerHTML = "";

  try {
    const a = await request("GET", "/api/announcements/" + id);
    currentAnn = a;
    const meta = ANN_META[a.type] || ANN_META.notice;

    document.getElementById("annDrawerBadges").innerHTML =
      '<span class="tag">' + meta.icon + " " + meta.label + "</span>" +
      (a.isTop ? '<span class="badge solid-danger">置顶</span>' : "") +
      (a.status === 0 ? '<span class="badge">已下架</span>' : "");
    document.getElementById("annDrawerTitle").textContent = a.title;
    document.getElementById("annDrawerMeta").innerHTML =
      "发布人 " + escapeHtml(a.adminName || "管理员") + " · 发布于 " + fmtTime(a.publishTime) +
      (a.updateTime && a.updateTime !== a.publishTime ? " · 更新于 " + fmtTime(a.updateTime) : "");
    document.getElementById("annDrawerContent").textContent = a.content || "";
    document.getElementById("annDrawerSign").textContent = "—— " +
      (a.adminName || "图书馆") + " · " + fmtDate(a.publishTime);
    document.getElementById("annReadInfo").textContent = "共 " + (a.readCount || 0) + " 人已读";

    if (isAdmin) {
      document.getElementById("annAdminBtns").innerHTML =
        '<button class="btn btn-ghost btn-sm" onclick="openAnnModal(' + a.id + ')">编辑</button> ' +
        '<button class="btn btn-ghost btn-sm" onclick="toggleAnnStatus(' + a.id + ',' + (a.status === 1 ? 0 : 1) + ')">' +
          (a.status === 1 ? "下架" : "重新上架") + "</button> " +
        '<button class="btn btn-soft-danger btn-sm" onclick="deleteAnn(' + a.id + ')">删除</button>';
    }

    /* 打开即标记已读（幂等接口，反复打开不会报错）。
       ⚠️ 用 POST 显式标记，而不是让 GET 详情顺手改数据 —— GET 应当是无副作用的。 */
    if (!a.isRead) {
      request("POST", "/api/announcements/" + id + "/read", null, { silent: true })
        .then(function () {
          loadUnread();
          loadList(state.page);
        })
        .catch(function () { /* 接口未实现时不打扰用户 */ });
    }
  } catch (e) {
    document.getElementById("annDrawerTitle").textContent = "加载失败";
    document.getElementById("annDrawerContent").innerHTML = failState(e);
  }
}

async function markAllRead() {
  const ok = await confirmDialog({
    title: "全部标为已读",
    text: "确定把当前所有已发布的公告都标记为已读吗？侧边栏的未读红点会清空。",
    okText: "全部已读"
  });
  if (!ok) return;
  try {
    await request("POST", "/api/announcements/read-all");
    showToast("已全部标为已读", "ok");
    loadUnread();
    loadList(state.page);
  } catch (e) { showToast(e.message, "err"); }
}

/* ==================== 管理员：增删改 ==================== */

function openAnnModal(id) {
  annModalId = id;
  document.getElementById("annModalTitle").textContent = id ? "编辑公告" : "发布公告";
  document.getElementById("anSubmit").textContent = id ? "保存修改" : "发布";

  if (!id) {
    document.getElementById("anTitle").value = "";
    document.getElementById("anContent").value = "";
    document.getElementById("anType").value = "notice";
    document.getElementById("anStatus").value = "1";
    document.getElementById("anTop").checked = false;
  } else if (currentAnn && currentAnn.id === id) {
    fillAnnForm(currentAnn);
  } else {
    request("GET", "/api/announcements/" + id).then(fillAnnForm).catch(function (e) { showToast(e.message, "err"); });
  }
  openModal("annModal");
}

function fillAnnForm(a) {
  document.getElementById("anTitle").value = a.title || "";
  document.getElementById("anContent").value = a.content || "";
  document.getElementById("anType").value = a.type || "notice";
  document.getElementById("anStatus").value = String(a.status === 0 ? 0 : 1);
  document.getElementById("anTop").checked = !!a.isTop;
}

async function submitAnn() {
  const body = {
    title: document.getElementById("anTitle").value.trim(),
    content: document.getElementById("anContent").value.trim(),
    type: document.getElementById("anType").value,
    status: Number(document.getElementById("anStatus").value),
    isTop: document.getElementById("anTop").checked ? 1 : 0
  };
  if (!body.title) return showToast("标题不能为空", "warn");
  if (!body.content) return showToast("正文不能为空", "warn");

  const btn = document.getElementById("anSubmit");
  btn.disabled = true;
  try {
    if (annModalId) {
      await request("PUT", "/api/admin/announcements/" + annModalId, body);
      showToast("公告已更新", "ok");
    } else {
      await request("POST", "/api/admin/announcements", body);
      showToast("公告已发布", "ok");
    }
    closeModal("annModal");
    loadList(state.page);
    loadUnread();
  } catch (e) {
    showToast(e.message, "err");
  } finally {
    btn.disabled = false;
  }
}

async function toggleAnnStatus(id, status) {
  try {
    await request("PUT", "/api/admin/announcements/" + id, { status: status });
    showToast(status === 1 ? "已重新上架" : "已下架", "ok");
    closeDrawer("annDrawer");
    loadList(state.page);
    loadUnread();
  } catch (e) { showToast(e.message, "err"); }
}

async function deleteAnn(id) {
  const ok = await confirmDialog({
    title: "删除公告", danger: true, okText: "删除",
    text: "删除后读者将看不到这条公告（后端为软删，已读记录会保留）。"
  });
  if (!ok) return;
  try {
    await request("DELETE", "/api/admin/announcements/" + id);
    showToast("公告已删除", "ok");
    closeDrawer("annDrawer");
    loadList(state.page);
    loadUnread();
  } catch (e) { showToast(e.message, "err"); }
}

window.addEventListener("pageshow", function (e) {
  if (e.persisted) { loadUnread(); loadList(state.page); }
});

annInit();
