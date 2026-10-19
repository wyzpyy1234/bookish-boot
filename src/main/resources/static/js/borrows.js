/* ==========================================================
 * 我的借阅页逻辑：概览统计 / 状态筛选 / 归还 / 续借
 * ========================================================== */

window.PAGE_ROLE = "reader";
var me = requireLogin("reader");

mountShell({
  active: "borrows",
  title: "我的借阅",
  desc: "借期 30 天 · 可续借 1 次 · 逾期 0.5 元/天"
});

var state = { status: "", page: 1, size: 10 };

function safeInit() {
  if (!me) return;
  loadSummary();
  loadBorrows(1);
}

async function loadSummary() {
  try {
    var s = await request("GET", "/api/borrows/summary");
    document.getElementById("statBorrowing").textContent = (s.borrowing || 0) + " 本";
    document.getElementById("statOverdue").textContent = (s.overdue || 0) + " 本";
    document.getElementById("statReturned").textContent = (s.returned || 0) + " 本";
    document.getElementById("statFine").textContent = money(s.unpaidFine || 0);
  } catch (e) { /* 忽略 */ }
}

function pickStatus(el, st) {
  state.status = st;
  var tabs = document.querySelectorAll("#statusTabs button");
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove("active");
  el.classList.add("active");
  loadBorrows(1);
}

async function loadBorrows(page) {
  state.page = page;
  var box = document.getElementById("borrowList");
  if (!box.querySelector(".borrow-card")) box.innerHTML = skeletonRows(4);
  else box.classList.add("is-busy");

  try {
    var qs = "?page=" + page + "&size=" + state.size;
    if (state.status) qs += "&status=" + state.status;

    var res = await request("GET", "/api/borrows" + qs);
    box.classList.remove("is-busy");
    renderBorrows(res.list || []);
    renderPager("pager", res, function (p) { loadBorrows(p); });
  } catch (e) {
    box.classList.remove("is-busy");
    box.innerHTML = emptyState("⚠️", "加载失败", escapeHtml(e.message));
  }
}

function statusTag(r) {
  if (r.status === "returned") return '<span class="status-tag returned">已归还</span>';
  if (r.overdue) return '<span class="status-tag overdue">逾期 ' + r.overdueDays + " 天</span>";
  return '<span class="status-tag borrowed">在借中</span>';
}

function renderBorrows(list) {
  var box = document.getElementById("borrowList");
  if (!list.length) {
    box.innerHTML = emptyState("📖", "暂无借阅记录",
      "去图书检索挑一本，开始你的阅读计划",
      '<a class="btn btn-primary btn-sm" href="index.html">去借书</a>');
    return;
  }

  box.innerHTML = list.map(function (r) {
    var cls = r.overdue ? "overdue" : (r.status === "returned" ? "returned" : "");
    var canReturn = r.status === "borrowed";
    var canRenew = r.status === "borrowed" && !r.overdue && r.renewCount < 2;

    return '<div class="borrow-card fade-up ' + cls + '">' +
      '<div class="borrow-head">' +
        '<span class="b-title">' + escapeHtml(r.bookTitle) + "</span>" +
        statusTag(r) +
        '<span class="tag gray">' + escapeHtml(r.categoryName || "未分类") + "</span>" +
        '<span class="spacer"></span>' +
        (canRenew ? '<button class="btn btn-ghost btn-sm" onclick="doRenew(' + r.id + ', this)">续借</button>' : "") +
        (canReturn ? '<button class="btn btn-success btn-sm" onclick="doReturn(' + r.id + ', this)">归还</button>' : "") +
      "</div>" +
      '<div class="text-sub text-sm mb-8">' +
        escapeHtml(r.bookAuthor || "") + ' · 条码 <span class="mono">' + escapeHtml(r.barcode || "—") + "</span>" +
      "</div>" +
      '<div class="borrow-meta">' +
        "<div>借出：<b>" + fmtTime(r.borrowDate) + "</b></div>" +
        "<div>应还：<b style=\"" + (r.overdue ? "color:var(--danger)" : "") + "\">" + fmtTime(r.dueDate) + "</b></div>" +
        "<div>归还：" + (r.returnDate ? "<b>" + fmtTime(r.returnDate) + "</b>" : "—") + "</div>" +
        "<div>续借：<b>" + (r.renewCount || 0) + " / 2 次</b></div>" +
        "<div>记录号：<b>#" + r.id + "</b></div>" +
      "</div>" +
    "</div>";
  }).join("");
}

async function doReturn(id, btn) {
  const ok = await confirmDialog({
    title: "确认归还",
    text: "归还后该副本将重新变为「在架」状态。若有逾期，系统会按 0.5 元/天自动计算罚款。",
    okText: "确认归还"
  });
  if (!ok) return;

  btn.disabled = true;
  try {
    var res = await request("PUT", "/api/borrows/" + id + "/return");
    if (res && res.overdueDays > 0) {
      showToast("已归还，逾期 " + res.overdueDays + " 天，罚款 " + money(res.fineAmount), "warn");
    } else {
      showToast("归还成功，感谢按时还书！", "ok");
    }
    loadBorrows(state.page);
    loadSummary();
  } catch (e) {
    showToast(e.message, "err");
    btn.disabled = false;
  }
}

async function doRenew(id, btn) {
  btn.disabled = true;
  try {
    var res = await request("PUT", "/api/borrows/" + id + "/renew");
    showToast("续借成功，新应还日期 " + fmtDate(res.newDueDate), "ok");
    loadBorrows(state.page);
    loadSummary();
  } catch (e) {
    showToast(e.message, "err");
    btn.disabled = false;
  }
}

window.addEventListener("pageshow", function (e) { if (e.persisted) refreshBadges(); });

safeInit();
