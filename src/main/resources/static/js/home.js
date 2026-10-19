/* ==========================================================
 * 首页（图书检索）逻辑
 *   概览统计 / 热门 TOP10 轮播 / 即时检索（防抖+输入法+防竞态+URL 同步）/ 详情弹窗 / 借书
 * ========================================================== */

window.PAGE_ROLE = "reader";
var me = requireLogin("reader");

mountShell({
  active: "index",
  title: "图书检索",
  desc: "共 16 类馆藏 · 支持按书名、作者、分类、出版社组合筛选"
});

/* ---------- 筛选状态 ---------- */
var state = {
  keyword: "",
  categoryId: "",
  publisherId: "",
  onlyAvailable: false,
  sort: "newest",
  page: 1,
  size: 15          /* 宽屏下图书网格 5 列，3 行刚好铺满一屏 */
};

var currentBookId = null;   /* 详情弹窗里当前的书 */

/* 即时检索的三个前端专用状态（与后端字段无关） */
var reqSeq = 0;         /* 请求序号：只认最后发出的请求，防止旧结果覆盖新结果 */
var kwTimer = null;     /* 输入防抖定时器 */
var composing = false;  /* 中文输入法是否正在拼字 */

function safeInit() {
    applyHotMode();
    restoreFromUrl();             /* ① URL 上的检索条件 → state（刷新/分享链接能还原结果） */
    if (!me) return;
    syncControls();               /* ② state → 输入框/下拉框（分类 chips 要等 ajax 回来再补选中态） */
    loadSummary();
    loadHot();
    loadCategories();
    loadPublishers();
    loadBooks(state.page || 1);   /* ③ 再按还原出的条件发第一次 ajax */
}

/* ---------- 我的借阅概览 ---------- */
async function loadSummary() {
    try {
        var s = await request("GET", "/api/borrows/summary");
        /* 新读者没有借阅记录时后端 SUM 出来是 null → 兜底成 0，避免显示「null 本」 */
        document.getElementById("statBorrowing").textContent = (s.borrowing || 0) + " 本";
        document.getElementById("statOverdue").textContent = (s.overdue || 0) + " 本";
        document.getElementById("statReturned").textContent = (s.returned || 0) + " 本";
        document.getElementById("statMax").textContent = me.maxBorrow + " 本";
        document.getElementById("statFine").textContent = money(s.unpaidFine || 0);
    } catch (e) { /* 概览失败不阻塞主流程 */ }
}

/* ---------- 热门借阅 TOP10（轮换 / 平铺） ----------
 * 轮播引擎 v2：
 *   - 横向 flex 轨道（旧版 grid 会把多出的卡片换行叠起来，已修）
 *   - 支持鼠标 / 触屏拖拽换页，边缘有橡皮筋阻尼
 *   - 自动播放：进度条点可视化剩余时间；悬停 / 拖拽 / 切走标签页时暂停
 *   - 键盘 ← → 可换页（焦点在轮播上时）
 */
var hotCtl = { timer: null, idx: 0, total: 0, visible: 5, max: 0, step: 0, drag: null };
var hotResizeTimer = null;
var hotHovered = false;
var HOT_AUTO_MS = 3500;
var hotMode = "carousel";
try {
    if (localStorage.getItem("bk_hot_mode") === "grid") hotMode = "grid";
} catch (e) { /* 隐私模式下 localStorage 可能不可用 */ }

async function loadHot() {
    var track = document.getElementById("hotTrack");
    applyHotMode();
    bindHotGestures();
    try {
        var list = await request("GET", "/api/books/hot");
        if (!list || !list.length) {
            track.innerHTML = '<div class="hot-placeholder">还没有借阅记录</div>';
            return;
        }
        track.innerHTML = list.map(function (b, i) {
            return '<div class="hot-card' + (i < 3 ? " top3" : "") + '" onclick="openDetail(' + b.id + ')">' +
              '<span class="hot-rank">' + (i + 1) + "</span>" +
              '<div class="hot-title">' + escapeHtml(b.title) + "</div>" +
              '<div class="hot-sub">' + escapeHtml(b.author) +
                (b.categoryName ? " · " + escapeHtml(b.categoryName) : "") + "</div>" +
              '<div class="hot-count">借出 ' + b.borrowCount + " 次</div>" +
            "</div>";
        }).join("");
        hotCtl.idx = 0;
        hotApply(0);
        hotAuto();
    } catch (e) {
        /* 热门榜加载失败不阻塞检索主流程 */
        track.innerHTML = '<div class="hot-placeholder">热门榜加载失败：' + escapeHtml(e.message) + "</div>";
    }
}

function applyHotMode() {
    var carousel = document.getElementById("hotCarousel");
    var hint = document.querySelector(".hot-hint");
    var btns = document.querySelectorAll("#hotToggle .seg-btn");
    if (!carousel) return;

    carousel.classList.toggle("mode-grid", hotMode === "grid");
    if (hint) hint.style.display = hotMode === "grid" ? "none" : "";
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle("active", btns[i].getAttribute("data-mode") === hotMode);
    }
}

function setHotMode(mode) {
    if (mode === hotMode) return;
    hotMode = mode;
    try { localStorage.setItem("bk_hot_mode", mode); } catch (e) { /* 忽略 */ }
    hotCtl.idx = 0;
    applyHotMode();

    if (hotMode === "grid") {
        hotPause();
        var carousel = document.getElementById("hotCarousel");
        var track = document.getElementById("hotTrack");
        if (track) track.style.transform = "";
        var dots = document.getElementById("hotDots");
        if (dots) dots.innerHTML = "";
        if (carousel) carousel.classList.remove("autoplay", "paused");
    } else {
        hotApply(0);
        hotAuto();
    }
}

/* 读 CSS 变量算出当前可见张数，并据此推算可滑动的格数 */
function hotMeasure() {
    var carousel = document.getElementById("hotCarousel");
    var track = document.getElementById("hotTrack");
    if (!carousel || !track) return false;

    if (hotMode === "grid") { hotCtl.max = 0; hotCtl.step = 0; return false; }

    var v = parseFloat(getComputedStyle(carousel).getPropertyValue("--hot-visible"));
    if (!v || v < 1) v = 5;
    hotCtl.visible = v;

    var cards = track.querySelectorAll(".hot-card");
    hotCtl.total = cards.length;
    hotCtl.max = Math.max(0, Math.ceil(hotCtl.total - v));
    if (hotCtl.idx > hotCtl.max) hotCtl.idx = hotCtl.max;
    hotCtl.step = (cards.length > 1) ? (cards[1].offsetLeft - cards[0].offsetLeft) : 0;
    return true;
}

/* dur=0 表示"瞬移"（首次渲染 / 缩放时用，避免抖动） */
function hotApply(dur) {
    if (hotMode === "grid") return;
    if (!hotMeasure()) return;
    var carousel = document.getElementById("hotCarousel");
    var track = document.getElementById("hotTrack");
    if (dur === 0) {
        carousel.classList.add("no-anim");
        track.style.transform = "translateX(" + (-hotCtl.idx * hotCtl.step) + "px)";
        void track.offsetWidth;              /* 强制回流，让上面的 none 立刻生效 */
        carousel.classList.remove("no-anim");
    } else {
        track.style.transform = "translateX(" + (-hotCtl.idx * hotCtl.step) + "px)";
    }
    hotDots();
}

function hotDots() {
    var carousel = document.getElementById("hotCarousel");
    var dots = document.getElementById("hotDots");
    if (!dots || !carousel) return;
    var html = "";
    for (var i = 0; i <= hotCtl.max; i++) {
        html += '<i class="' + (i === hotCtl.idx ? "on" : "") + '" onclick="hotSeek(' + i + ')"></i>';
    }
    /* 重建 DOM 会重置动画，保证进度点与计时器同步从头走 */
    if (dots.innerHTML !== html) dots.innerHTML = html;
}

function hotGo(dir) {
    if (hotMode === "grid" || hotCtl.max <= 0) return;
    hotCtl.idx += dir;
    if (hotCtl.idx > hotCtl.max) hotCtl.idx = 0;
    if (hotCtl.idx < 0) hotCtl.idx = hotCtl.max;
    hotApply();
}

function hotSeek(i) { hotCtl.idx = i; hotApply(); hotAuto(); }

/* ---- 自动播放 ---- */

function hotCanAuto() {
    return hotMode === "carousel" && hotCtl.max > 0 && !hotHovered && !document.hidden && !hotCtl.drag;
}

function hotAuto() {
    clearInterval(hotCtl.timer);
    hotCtl.timer = null;
    var carousel = document.getElementById("hotCarousel");
    if (!carousel) return;
    carousel.classList.remove("paused");
    if (!hotCanAuto()) { carousel.classList.remove("autoplay"); return; }
    carousel.classList.add("autoplay");
    hotDots();                               /* 重绘进度点，与计时器同步 */
    hotCtl.timer = setInterval(function () { hotGo(1); }, HOT_AUTO_MS);
}

function hotPause(byHover) {
    clearInterval(hotCtl.timer);
    hotCtl.timer = null;
    var carousel = document.getElementById("hotCarousel");
    if (!carousel) return;
    carousel.classList.remove("autoplay");
    if (byHover) carousel.classList.add("paused");
}

/* ---- 拖拽换页（Pointer Events，鼠标 / 触屏通吃） ---- */

function bindHotGestures() {
    var vp = document.getElementById("hotViewport");
    if (!vp || vp.dataset.gestures) return;   /* 只绑一次 */
    vp.dataset.gestures = "1";

    /* 悬停暂停：走出去立刻恢复一轮新的计时 */
    vp.addEventListener("mouseenter", function () { hotHovered = true; hotPause(true); });
    vp.addEventListener("mouseleave", function () { hotHovered = false; hotAuto(); });

    /* 键盘 ← → */
    vp.setAttribute("tabindex", "0");
    vp.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); hotGo(-1); hotAuto(); }
        if (e.key === "ArrowRight") { e.preventDefault(); hotGo(1); hotAuto(); }
    });

    var track = document.getElementById("hotTrack");
    vp.addEventListener("pointerdown", function (e) {
        if (hotMode === "grid" || hotCtl.max <= 0 || e.button !== 0) return;
        hotCtl.drag = { startX: e.clientX, dx: 0, moved: false, id: e.pointerId };
        track.classList.add("no-anim");
    });
    window.addEventListener("pointermove", function (e) {
        var d = hotCtl.drag;
        if (!d || e.pointerId !== d.id) return;
        d.dx = e.clientX - d.startX;
        if (Math.abs(d.dx) > 6) {
            d.moved = true;
            vp.classList.add("dragging");
        }
        if (!d.moved) return;
        /* 边缘橡皮筋：超出范围的位移按 35% 衰减 */
        var pos = -hotCtl.idx * hotCtl.step + d.dx;
        if ((hotCtl.idx === 0 && d.dx > 0) || (hotCtl.idx === hotCtl.max && d.dx < 0)) {
            pos = -hotCtl.idx * hotCtl.step + d.dx * 0.35;
        }
        document.getElementById("hotTrack").style.transform = "translateX(" + pos + "px)";
    });
    window.addEventListener("pointerup", function (e) {
        var d = hotCtl.drag;
        if (!d || e.pointerId !== d.id) return;
        hotCtl.drag = null;
        var track = document.getElementById("hotTrack");
        track.classList.remove("no-anim");
        vp.classList.remove("dragging");
        if (d.moved) {
            /* 拖完抑制误触点击（不弹图书详情） */
            window.__hotDragged = true;
            setTimeout(function () { window.__hotDragged = false; }, 50);
            if (d.dx <= -hotCtl.step * 0.25) hotGo(1);
            else if (d.dx >= hotCtl.step * 0.25) hotGo(-1);
            else hotApply();
        }
        hotAuto();
    });

    /* 切到别的标签页时暂停计时，回来重新起一轮（避免后台狂翻 + 进度点错位） */
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) hotPause();
        else hotAuto();
    });

    /* 点按卡片时若刚拖拽过则拦截 */
    var carousel = document.getElementById("hotCarousel");
    if (carousel) {
        carousel.addEventListener("click", function (e) {
            if (window.__hotDragged) { e.stopPropagation(); e.preventDefault(); }
        }, true);
    }
}

window.addEventListener("resize", function () {
    if (hotMode === "grid" || !document.getElementById("hotTrack")) return;
    hotApply(0);
    clearTimeout(hotResizeTimer);
    hotResizeTimer = setTimeout(function () { hotAuto(); }, 240);
});

/* ---------- 分类 / 出版社 ---------- */
async function loadCategories() {
    try {
        var list = await request("GET", "/api/categories");
        var html = '<span class="chip-label">分类</span>';
        html += '<span class="chip active" data-cid="" onclick="pickCategory(this, \'\')">全部</span>';
        list.forEach(function (c) {
            html += '<span class="chip" data-cid="' + c.id + '" onclick="pickCategory(this, ' + c.id + ')">' +
                  escapeHtml(c.name) + "</span>";
        });
        document.getElementById("categoryChips").innerHTML = html;
        markActiveCategory();     /* chips 是 ajax 回来才渲染的，选中态得在这里补 */
    } catch (e) { showToast(e.message, "err"); }
}

function markActiveCategory() {
    var chips = document.querySelectorAll("#categoryChips .chip");
    for (var i = 0; i < chips.length; i++) {
        var cid = chips[i].getAttribute("data-cid") || "";
        chips[i].classList.toggle("active", cid === String(state.categoryId));
    }
}

async function loadPublishers() {
    try {
        var list = await request("GET", "/api/publishers");
        var sel = document.getElementById("pubSel");
        list.forEach(function (p) {
            var o = document.createElement("option");
            o.value = p.id;
            o.textContent = p.name;
            sel.appendChild(o);
        });
        sel.value = state.publisherId || "";    /* 还原 URL 里的出版社条件 */
    } catch (e) { /* 忽略 */ }
}

function syncControls() {
    document.getElementById("keyword").value = state.keyword;
    document.getElementById("kwClear").style.display = state.keyword ? "flex" : "none";
    document.getElementById("sortSel").value = state.sort;
    document.getElementById("pubSel").value = state.publisherId;
    document.getElementById("chipAvailable").classList.toggle("active", state.onlyAvailable);
}

function pickCategory(el, cid) {
    state.categoryId = cid === "" ? "" : cid;
    var chips = document.querySelectorAll("#categoryChips .chip");
    for (var i = 0; i < chips.length; i++) chips[i].classList.remove("active");
    el.classList.add("active");
    applyFilter();
}

function toggleAvailable() {
    state.onlyAvailable = !state.onlyAvailable;
    document.getElementById("chipAvailable").classList.toggle("active", state.onlyAvailable);
    applyFilter();
}

function resetFilter() {
    clearTimeout(kwTimer);
    state.keyword = "";
    state.categoryId = "";
    state.publisherId = "";
    state.onlyAvailable = false;
    state.sort = "newest";
    syncControls();
    var chips = document.querySelectorAll("#categoryChips .chip");
    for (var i = 0; i < chips.length; i++) chips[i].classList.remove("active");
    if (chips[0]) chips[0].classList.add("active");
    loadBooks(1);
}

/* ============ 即时检索：防抖 + 输入法 + 防竞态 + URL 同步 ============
 *   ① 每敲一个字就发请求 → 打字快时一次检索打十几个 ajax（防抖 300ms 收口）
 *   ② 中文输入法"拼字"阶段 input 也会连续触发（用 composition 状态挡住）
 *   ③ 请求返回顺序不保证，先发的可能后到（用 reqSeq 只认最后一次的结果）
 */
(function bindKeyword() {
    var kw = document.getElementById("keyword");
    if (!kw || !kw.addEventListener) return;
    kw.addEventListener("compositionstart", function () { composing = true; });
    kw.addEventListener("compositionend", function () { composing = false; onKeywordInput(); });
})();

function onKeywordInput() {
    if (composing) return;                       /* 拼字中不发请求 */
    var v = document.getElementById("keyword").value.trim();
    document.getElementById("kwClear").style.display = v ? "flex" : "none";
    clearTimeout(kwTimer);
    kwTimer = setTimeout(function () {
        if (v === state.keyword) return;           /* 值没变就别白跑一次 ajax */
        state.keyword = v;
        loadBooks(1);
    }, 300);
}

function onKeywordKey(e) {
    if (e.key === "Enter") { clearTimeout(kwTimer); applyFilter(); }
    else if (e.key === "Escape") { clearKeyword(); }
}

function clearKeyword() {
    clearTimeout(kwTimer);
    document.getElementById("keyword").value = "";
    document.getElementById("kwClear").style.display = "none";
    if (state.keyword !== "") { state.keyword = ""; loadBooks(1); }
    document.getElementById("keyword").focus();
}

function applyFilter() {
    clearTimeout(kwTimer);
    state.keyword = document.getElementById("keyword").value.trim();
    state.sort = document.getElementById("sortSel").value;
    state.publisherId = document.getElementById("pubSel").value;
    loadBooks(1);
}

/* 检索条件同步到地址栏（replaceState 不产生历史记录）→ 刷新/分享链接结果一致 */
function syncUrl() {
    var parts = [];
    if (state.keyword) parts.push("keyword=" + encodeURIComponent(state.keyword));
    if (state.categoryId !== "") parts.push("categoryId=" + state.categoryId);
    if (state.publisherId) parts.push("publisherId=" + state.publisherId);
    if (state.onlyAvailable) parts.push("onlyAvailable=true");
    if (state.sort !== "newest") parts.push("sort=" + state.sort);
    if (state.page > 1) parts.push("page=" + state.page);
    try {
        history.replaceState(null, "", location.pathname + (parts.length ? "?" + parts.join("&") : ""));
    } catch (e) { /* file:// 直接打开时会抛错，忽略 */ }
}

function restoreFromUrl() {
    var p = null;
    try { p = new URLSearchParams(location.search); } catch (e) { return; }
    if (!p) return;
    if (p.get("keyword")) state.keyword = p.get("keyword");
    if (p.get("categoryId")) state.categoryId = p.get("categoryId");
    if (p.get("publisherId")) state.publisherId = p.get("publisherId");
    if (p.get("onlyAvailable") === "true") state.onlyAvailable = true;
    if (p.get("sort")) state.sort = p.get("sort");
    var pg = parseInt(p.get("page"), 10);
    if (pg > 0) state.page = pg;
}

/* ---------- 图书列表 ---------- */
async function loadBooks(page) {
    state.page = page;
    var grid = document.getElementById("bookGrid");
    var seq = ++reqSeq;

    /* 已有结果时保留旧卡片只做半透明，首次/空态才铺骨架屏 */
    if (grid.querySelector(".book-card")) grid.classList.add("is-busy");
    else grid.innerHTML = skeletonBooks(state.size);
    setSearchStatus("搜索中…");

    try {
        var filter = buildQuery();
        var qs = "?page=" + page + "&size=" + state.size + (filter ? "&" + filter : "");

        var res = await request("GET", "/api/books" + qs);
        if (seq !== reqSeq) return;            /* 已有更新的请求在路上 → 丢弃这次结果 */
        renderBooks(res.list || []);
        renderPager("pager", res, function (p) { loadBooks(p); });
        setSearchStatus("");
        syncUrl();
    } catch (e) {
        if (seq !== reqSeq) return;
        grid.classList.remove("is-busy");
        grid.innerHTML = '<div style="grid-column:1/-1">' +
            emptyState("⚠️", "加载失败", escapeHtml(e.message)) + "</div>";
        setSearchStatus("");
    }
}

function buildQuery() {
    var parts = [];
    if (state.keyword) parts.push("keyword=" + encodeURIComponent(state.keyword));
    if (state.categoryId !== "") parts.push("categoryId=" + state.categoryId);
    if (state.publisherId) parts.push("publisherId=" + state.publisherId);
    if (state.onlyAvailable) parts.push("onlyAvailable=true");
    if (state.sort !== "newest") parts.push("sort=" + state.sort);
    return parts.join("&");
}

function setSearchStatus(txt) {
    var el = document.getElementById("searchStatus");
    if (el) el.textContent = txt || "";
}

function coverHTML(b) {
    if (b.cover) return '<img src="' + escapeHtml(b.cover) + '" alt="" onerror="this.style.display=\'none\'">';
    return '<div class="spine">' + escapeHtml(b.title) + "</div>";
}

function renderBooks(list) {
    var grid = document.getElementById("bookGrid");
    grid.classList.remove("is-busy");
    if (!list.length) {
        var desc = state.keyword
            ? "没有找到含「" + escapeHtml(state.keyword) + "」的图书，换个词试试"
            : "没有找到符合条件的图书，换个条件试试";
        grid.innerHTML = '<div style="grid-column:1/-1">' +
            emptyState("🔍", "没有匹配的图书", desc,
                '<button class="btn btn-ghost btn-sm" onclick="resetFilter()">重置筛选条件</button>') +
            "</div>";
        return;
    }
    grid.innerHTML = list.map(function (b) {
        var out = b.availableCopies <= 0;
        return '<div class="book-card fade-up" onclick="openDetail(' + b.id + ')">' +
          '<div class="book-cover">' + coverHTML(b) + "</div>" +
          '<div class="book-body">' +
            '<div class="book-title">' + highlight(b.title, state.keyword) + "</div>" +
            '<div class="book-author">' + highlight(b.author, state.keyword) + "</div>" +
            '<div class="book-tags">' +
              '<span class="tag">' + escapeHtml(b.categoryName || "未分类") + "</span>" +
              '<span class="tag gray">借出 ' + b.borrowCount + " 次</span>" +
            "</div>" +
            '<div class="book-foot">' +
              '<span class="book-price">' + money(b.price) + "</span>" +
              '<span class="book-stock ' + (out ? "out" : "") + '">' +
                (out ? "暂无可借" : "可借 " + b.availableCopies + "/" + b.totalCopies) +
              "</span>" +
            "</div>" +
          "</div>" +
        "</div>";
    }).join("");
}

/* ---------- 详情 ---------- */
async function openDetail(id) {
    currentBookId = id;
    var body = document.getElementById("detailBody");
    body.innerHTML = '<div class="loading-tip">加载中…</div>';
    openModal("detailModal");

    try {
        var b = await request("GET", "/api/books/" + id);
        var copies = (b.copies || []).map(function (c) {
            return '<span class="copy-item ' + c.status + '" title="' + escapeHtml(c.location || "") + '">' +
                   escapeHtml(c.barcode) + "</span>";
        }).join("");

        body.innerHTML =
          '<div style="display:flex;gap:18px;margin-bottom:18px">' +
            '<div style="width:104px;height:140px;border-radius:10px;overflow:hidden;flex-shrink:0;background:var(--brand-50)">' +
              coverHTML(b) + "</div>" +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:17px;font-weight:650;line-height:1.45;margin-bottom:5px">' + escapeHtml(b.title) + "</div>" +
              '<div class="text-sub text-sm mb-8">' + escapeHtml(b.author) + "</div>" +
              '<div class="book-tags mb-8">' +
                '<span class="tag">' + escapeHtml(b.categoryName || "未分类") + "</span>" +
                '<span class="tag gray">' + escapeHtml(b.publisherName || "未知出版社") + "</span>" +
              "</div>" +
              '<div style="font-size:20px;font-weight:700;color:var(--brand-700)">' + money(b.price) + "</div>" +
            "</div>" +
          "</div>" +
          '<div class="info-row"><span class="k">ISBN</span><span class="v mono">' + escapeHtml(b.isbn) + "</span></div>" +
          '<div class="info-row"><span class="k">出版日期</span><span class="v">' + fmtDate(b.publishDate) + "</span></div>" +
          '<div class="info-row"><span class="k">馆藏</span><span class="v">共 ' + b.totalCopies + " 册，可借 " +
            '<b style="color:' + (b.availableCopies > 0 ? "var(--success)" : "var(--danger)") + '">' + b.availableCopies + "</b> 册</span></div>" +
          '<div class="info-row"><span class="k">被借次数</span><span class="v">' + b.borrowCount + " 次</span></div>" +
          '<div class="info-row"><span class="k">副本条码</span><span class="v"><div class="copy-list">' + (copies || "—") + "</div></span></div>" +
          '<div class="info-row"><span class="k">简介</span><span class="v text-sub">' + escapeHtml(b.intro || "暂无简介") + "</span></div>";

        var btn = document.getElementById("btnBorrow");
        btn.disabled = b.availableCopies <= 0;
        btn.textContent = b.availableCopies <= 0 ? "暂无可借副本" : "借这本书";
    } catch (e) {
        body.innerHTML = emptyState("⚠️", "加载失败", escapeHtml(e.message));
        document.getElementById("btnBorrow").disabled = true;
    }
}

async function doBorrow() {
    if (!currentBookId) return;
    var btn = document.getElementById("btnBorrow");
    btn.disabled = true;
    btn.textContent = "借阅中…";
    try {
        var res = await request("POST", "/api/borrows", { bookId: currentBookId });
        showToast("借阅成功！应还日期 " + fmtDate(res.dueDate), "ok");
        closeModal("detailModal");
        loadBooks(state.page);
        loadSummary();
    } catch (e) {
        showToast(e.message, "err");
        btn.disabled = false;
        btn.textContent = "借这本书";
    }
}

/* 从借阅页返回（bfcache 恢复）时重新量一次，避免残留旧宽度 */
window.addEventListener("pageshow", function (e) {
    if (e.persisted) { applyHotMode(); hotCtl.idx = 0; hotApply(0); hotAuto(); refreshBadges(); }
});

safeInit();
