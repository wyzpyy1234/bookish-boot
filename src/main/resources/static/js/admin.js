/* ==========================================================
 * 管理后台逻辑
 *   统计看板 / 图书管理 / 借阅流水
 *   （社区管理已拆成独立页面 community.html，见 js/community.js）
 *
 * 接口：2.14~2.18
 * 注意：前端隐藏按钮 ≠ 后端安全 —— 每个管理接口后端都必须自己校验 role=admin
 * ========================================================== */

window.PAGE_ROLE = "admin";
var me = requireLogin("admin");

mountShell({
  active: "admin",
  title: "管理后台",
  desc: "馆藏 / 借阅 / 统计，一屏统管"
});

var editingId = null;      /* 图书：null=新增 */
var bookPage = 1;
var categories = [];
var publishers = [];

function safeInit() {
  if (!me) return;
  loadStats();
  loadMeta();
  loadBooks(1);
}

/* ==================== 顶部标签页 ==================== */

function switchPane(name, el) {
  const tabs = document.querySelectorAll(".tabs button");
  for (let i = 0; i < tabs.length; i++) tabs[i].classList.remove("active");
  if (el) el.classList.add("active");
  ["stats", "books", "records"].forEach(function (k) {
    const pane = document.getElementById("pane" + k.charAt(0).toUpperCase() + k.slice(1));
    if (pane) pane.classList.toggle("hidden", k !== name);
  });
  if (name === "stats") loadStats();
  if (name === "books") loadBooks(bookPage);
  if (name === "records") loadRecords(1);
}

/* ==================== 统计看板 ==================== */

async function loadStats() {
  try {
    const s = await request("GET", "/api/admin/stats");
    document.getElementById("stBooks").textContent = s.bookCount;
    document.getElementById("stCopies").textContent = s.copyCount;
    document.getElementById("stReaders").textContent = s.readerCount;
    document.getElementById("stBorrowing").textContent = s.borrowingCount;
    document.getElementById("stOverdue").textContent = s.overdueCount;
    document.getElementById("stToday").textContent = s.todayBorrowCount;
    document.getElementById("stFine").textContent = money(s.unpaidFineTotal);
    document.getElementById("stPosts").textContent = s.postCount != null ? s.postCount : "—";
    document.getElementById("stReports").textContent = s.pendingReports != null ? s.pendingReports : "—";

    renderBars("catChart", s.categoryStats || [], "categoryName", "borrowCount");
    renderBars("monthChart", s.monthlyStats || [], "month", "borrowCount");
  } catch (e) {
    showToast(e.message, "err");
  }
}

function renderBars(boxId, list, nameKey, valKey) {
  const box = document.getElementById(boxId);
  if (!box) return;
  if (!list.length) { box.innerHTML = '<div class="text-sub text-sm">暂无数据</div>'; return; }
  const max = Math.max.apply(null, list.map(function (x) { return x[valKey]; })) || 1;
  box.innerHTML = list.map(function (x) {
    const pct = Math.round(x[valKey] / max * 100);
    return '<div class="bar-row">' +
      '<span class="b-name" title="' + escapeHtml(x[nameKey]) + '">' + escapeHtml(x[nameKey]) + "</span>" +
      '<span class="b-track"><span class="b-fill" style="width:' + pct + '%"></span></span>' +
      '<span class="b-val">' + x[valKey] + "</span>" +
    "</div>";
  }).join("");
}

/* ==================== 基础数据 ==================== */

async function loadMeta() {
  try { categories = await request("GET", "/api/categories"); } catch (e) { categories = []; }
  try { publishers = await request("GET", "/api/publishers"); } catch (e) { publishers = []; }

  document.getElementById("fCategory").innerHTML = categories.map(function (c) {
    return '<option value="' + c.id + '">' + escapeHtml(c.name) + "</option>";
  }).join("");
  document.getElementById("fPublisher").innerHTML = publishers.map(function (p) {
    return '<option value="' + p.id + '">' + escapeHtml(p.name) + "</option>";
  }).join("");
}

/* ==================== 图书管理 ==================== */

async function loadBooks(page) {
  bookPage = page;
  const table = document.getElementById("bookTable");
  table.innerHTML = '<tr><td class="table-empty">加载中…</td></tr>';

  try {
    const res = await request("GET", "/api/books?page=" + page + "&size=10&sort=newest");
    document.getElementById("bookTotal").textContent = res.total;

    table.innerHTML =
      "<tr><th>ID</th><th>书名 / 作者</th><th>分类</th><th>出版社</th>" +
      '<th class="t-right">价格</th><th class="t-center">馆藏</th><th class="t-center">被借</th>' +
      '<th class="t-center">操作</th></tr>' +
      (res.list || []).map(function (b) {
        return "<tr>" +
          "<td>" + b.id + "</td>" +
          '<td><div style="font-weight:600">' + escapeHtml(b.title) + "</div>" +
            '<div class="text-sub text-sm">' + escapeHtml(b.author) + "</div></td>" +
          '<td><span class="tag">' + escapeHtml(b.categoryName || "—") + "</span></td>" +
          '<td class="text-sm">' + escapeHtml(b.publisherName || "—") + "</td>" +
          '<td class="t-right">' + money(b.price) + "</td>" +
          '<td class="t-center">' +
            '<span style="color:' + (b.availableCopies > 0 ? "var(--success)" : "var(--danger)") + ';font-weight:600">' +
            b.availableCopies + "</span> / " + b.totalCopies +
          "</td>" +
          '<td class="t-center">' + b.borrowCount + "</td>" +
          '<td class="t-center t-narrow">' +
            '<button class="btn btn-ghost btn-sm" onclick="editBook(' + b.id + ')">编辑</button> ' +
            '<button class="btn btn-soft-danger btn-sm" onclick="delBook(' + b.id + ',\'' +
              escapeHtml(b.title).replace(/'/g, "") + '\')">删除</button>' +
          "</td>" +
        "</tr>";
      }).join("");

    renderPager("bookPager", res, function (p) { loadBooks(p); });
  } catch (e) {
    table.innerHTML = '<tr><td class="table-empty">' + escapeHtml(e.message) + "</td></tr>";
  }
}

function openBookForm(id) {
  editingId = id;
  document.getElementById("bookModalTitle").textContent = id ? "编辑图书" : "新增图书";
  document.getElementById("copyCountField").classList.toggle("hidden", !!id);
  document.getElementById("btnSaveBook").textContent = id ? "保存修改" : "确认新增";

  if (!id) {
    ["fTitle", "fAuthor", "fIsbn", "fPrice", "fDate", "fIntro"].forEach(function (k) {
      document.getElementById(k).value = "";
    });
    document.getElementById("fCopyCount").value = 3;
    if (categories[0]) document.getElementById("fCategory").value = categories[0].id;
    if (publishers[0]) document.getElementById("fPublisher").value = publishers[0].id;
  }
  openModal("bookModal");
}

async function editBook(id) {
  try {
    const b = await request("GET", "/api/books/" + id);
    openBookForm(id);
    document.getElementById("fTitle").value = b.title || "";
    document.getElementById("fAuthor").value = b.author || "";
    document.getElementById("fIsbn").value = b.isbn || "";
    document.getElementById("fPrice").value = b.price || "";
    document.getElementById("fDate").value = (b.publishDate || "").slice(0, 10);
    document.getElementById("fIntro").value = b.intro || "";
    if (b.categoryId) document.getElementById("fCategory").value = b.categoryId;
    if (b.publisherId) document.getElementById("fPublisher").value = b.publisherId;
  } catch (e) { showToast(e.message, "err"); }
}

async function saveBook() {
  const body = {
    title: document.getElementById("fTitle").value.trim(),
    author: document.getElementById("fAuthor").value.trim(),
    isbn: document.getElementById("fIsbn").value.trim(),
    categoryId: Number(document.getElementById("fCategory").value),
    publisherId: Number(document.getElementById("fPublisher").value),
    price: Number(document.getElementById("fPrice").value),
    publishDate: document.getElementById("fDate").value || null,
    intro: document.getElementById("fIntro").value.trim()
  };

  if (!body.title || !body.author || !body.isbn) { showToast("书名、作者、ISBN 必填", "warn"); return; }
  if (!(body.price > 0)) { showToast("价格必须大于 0", "warn"); return; }
  if (!body.categoryId || !body.publisherId) { showToast("请选择分类和出版社", "warn"); return; }

  const btn = document.getElementById("btnSaveBook");
  btn.disabled = true;
  try {
    if (editingId) {
      await request("PUT", "/api/admin/books/" + editingId, body);
      showToast("修改成功", "ok");
    } else {
      body.copyCount = Number(document.getElementById("fCopyCount").value);
      if (!(body.copyCount >= 1 && body.copyCount <= 20)) {
        showToast("副本数需在 1~20 之间", "warn");
        btn.disabled = false;
        return;
      }
      const res = await request("POST", "/api/admin/books", body);
      showToast("新增成功，已生成 " + res.copyCount + " 个副本", "ok");
    }
    closeModal("bookModal");
    loadBooks(bookPage);
  } catch (e) {
    showToast(e.message, "err");
  } finally {
    btn.disabled = false;
  }
}

async function delBook(id, title) {
  const ok = await confirmDialog({
    title: "删除图书", danger: true, okText: "删除",
    text: "确认删除《" + escapeHtml(title) + "》吗？<br>注意：<b>有借阅记录的图书不允许删除</b>（后端会返回 2006）。"
  });
  if (!ok) return;
  try {
    await request("DELETE", "/api/admin/books/" + id);
    showToast("已删除", "ok");
    loadBooks(bookPage);
  } catch (e) { showToast(e.message, "err"); }
}

/* ==================== 借阅流水 ==================== */

async function loadRecords(page) {
  const table = document.getElementById("recTable");
  table.innerHTML = '<tr><td class="table-empty">加载中…</td></tr>';

  try {
    let qs = "?page=" + page + "&size=10";
    const kw = document.getElementById("recKeyword").value.trim();
    const st = document.getElementById("recStatus").value;
    if (kw) qs += "&keyword=" + encodeURIComponent(kw);
    if (st) qs += "&status=" + st;

    const res = await request("GET", "/api/admin/borrows" + qs);

    table.innerHTML =
      '<tr><th>记录号</th><th>读者</th><th>书名</th><th>分类</th><th>条码</th>' +
      "<th>借出时间</th><th>应还时间</th><th>归还时间</th><th class=\"t-center\">状态</th></tr>" +
      (res.list || []).map(function (r) {
        const tag = r.status === "returned"
          ? '<span class="status-tag returned">已归还</span>'
          : (r.overdue ? '<span class="status-tag overdue">逾期 ' + r.overdueDays + " 天</span>"
                       : '<span class="status-tag borrowed">在借中</span>');
        return "<tr>" +
          "<td>#" + r.id + "</td>" +
          "<td>" + escapeHtml(r.readerName || "—") + "</td>" +
          '<td><div style="font-weight:600">' + escapeHtml(r.bookTitle || "—") + "</div>" +
            '<div class="text-sub text-sm">' + escapeHtml(r.bookAuthor || "") + "</div></td>" +
          '<td><span class="tag">' + escapeHtml(r.categoryName || "—") + "</span></td>" +
          '<td class="mono">' + escapeHtml(r.barcode || "—") + "</td>" +
          '<td class="text-sm">' + fmtTime(r.borrowDate) + "</td>" +
          '<td class="text-sm">' + fmtTime(r.dueDate) + "</td>" +
          '<td class="text-sm">' + (r.returnDate ? fmtTime(r.returnDate) : "—") + "</td>" +
          '<td class="t-center">' + tag + "</td>" +
        "</tr>";
      }).join("");

    renderPager("recPager", res, function (p) { loadRecords(p); });
  } catch (e) {
    table.innerHTML = '<tr><td class="table-empty">' + escapeHtml(e.message) + "</td></tr>";
  }
}

function resetRecords() {
  document.getElementById("recKeyword").value = "";
  document.getElementById("recStatus").value = "";
  loadRecords(1);
}

/* 自动刷新：停在统计看板时每轮静默刷一次数字、不闪屏 */
document.addEventListener("bk:poll", function () {
  if (document.visibilityState === "hidden") return;
  const paneStats = document.getElementById("paneStats");
  if (paneStats && !paneStats.classList.contains("hidden")) loadStats();
});

window.addEventListener("pageshow", function (e) {
  if (e.persisted) refreshBadges();
});

safeInit();
