/* ============================================================
 * profile.js —— 个人中心（独立页面版）
 *   基本资料 / 头像上传（点击 + 拖拽 + 进度条）/ 修改密码（含强度提示）
 *   双角色页：reader 和 admin 都能进，角色跟随当前标签页登录态
 * ============================================================ */

window.PAGE_ROLE = typeof detectRole === "function" ? detectRole() : "reader";

let __pfUser = null;          /* 服务端返回的最新资料 */
let __pfHashDone = false;     /* #password 锚点只滚一次 */

init();

async function init() {
  const me = requireLogin();                    /* 未登录会被踢回 login.html */
  if (!me) return;

  mountShell({
    active: location.hash.indexOf("password") >= 0 ? "password" : "profile",
    title: "个人中心",
    desc: "维护你的头像、昵称等基础信息与登录密码"
  });

  fillFromCache(me);                            /* 先用本地缓存渲染，秒出 */
  try {
    const u = await request("GET", "/api/user/profile");
    __pfUser = u;
    updateMyUser(u);
    fillAll(u);
  } catch (e) {
    showToast("资料加载失败：" + e.message, "err");
  }

  bindPwdStrength();
  window.addEventListener("hashchange", scrollToAnchor);
  scrollToAnchor();
}

function scrollToAnchor() {
  if (location.hash.indexOf("password") >= 0 && !__pfHashDone) {
    __pfHashDone = true;
    const el = document.getElementById("password");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* ---------- 渲染 ---------- */

function fillFromCache(me) {
  fillHero(me);
  fillForm(me);
}

function fillAll(u) {
  fillHero(u);
  fillForm(u);
  const reset = document.getElementById("pfResetAvatar");
  if (reset) reset.style.display = u.avatar ? "" : "none";
}

function fillHero(u) {
  const av = document.getElementById("pfAvatar");
  if (av) {
    av.innerHTML = u.avatar
      ? '<img src="' + escapeHtml(u.avatar) + '" alt="头像">'
      : '<span style="background:' + avatarColor(u) + '">' + escapeHtml(avatarText(u)) + "</span>";
  }
  const nick = document.getElementById("phNickname");
  if (nick) nick.textContent = u.nickname || u.username || "—";
  const sub = document.getElementById("phSub");
  if (sub) sub.textContent = "@" + (u.username || "") + " · ID " + (u.id != null ? u.id : "—");
  const badges = document.getElementById("phBadges");
  if (badges) {
    const mute = isMuted(u);
    badges.innerHTML =
      '<span class="badge ' + (u.role === "admin" ? "badge-brand" : "") + '">' +
        (u.role === "admin" ? "管理员" : "读者") + "</span>" +
      (mute
        ? '<span class="badge badge-danger">已禁言' + (mute.until ? "至 " + fmtDate(mute.until) : "（永久）") + "</span>"
        : '<span class="badge badge-success">账号正常</span>');
  }
}

function fillForm(u) {
  const set = function (id, v) { const el = document.getElementById(id); if (el) el.value = v == null ? "" : v; };
  set("piId", u.id);
  set("piUsername", u.username);
  set("piNickname", u.nickname);
  set("piPhone", u.phone);
  set("piRole", u.role === "admin" ? "管理员" : (u.role === "reader" ? "读者" : "—"));
  set("piMaxBorrow", u.maxBorrow != null ? u.maxBorrow + " 本" : "");
  set("piCreateTime", u.createTime ? fmtTime(u.createTime) : "");

  const mute = isMuted(u);
  const tip = document.getElementById("pfMuteTip");
  if (tip) {
    tip.style.display = mute ? "" : "none";
    if (mute) {
      tip.innerHTML = "🚫 该账号处于禁言状态" +
        (mute.until ? "（至 " + fmtDate(mute.until) + "）" : "（永久）") +
        "，期间不能发帖、评论和举报。" + (mute.reason ? "原因：" + escapeHtml(mute.reason) : "");
    }
  }
  const saveBtn = document.getElementById("pfSaveBtn");
  if (saveBtn) saveBtn.disabled = !!mute;   /* 禁言只限制社区行为，资料其实可改——但保守起见提示在前 */
}

/* ---------- 换头像 ---------- */

function pfPickAvatar() {
  const input = document.getElementById("pfFile");
  if (input) { input.value = ""; input.click(); }   /* 清空 value，同一张图重选也能触发 change */
}

function pfFileChosen(input) {
  const f = input.files && input.files[0];
  if (f) pfUpload(f);
}

function pfUpload(file) {
  const bad = checkImageFile(file);
  if (bad) { showToast(bad, "err"); return; }

  const prog = document.getElementById("pfProgress");
  const bar = document.getElementById("pfProgressBar");
  const drop = document.getElementById("pfDrop");
  if (prog) prog.style.display = "";
  if (bar) bar.style.width = "0%";
  if (drop) drop.style.display = "none";

  /* 先本地预览（base64 直接显示）：用户感觉"瞬间就换好了"，上传完再换服务端 URL */
  const reader = new FileReader();
  reader.onload = function () {
    fillHero(Object.assign({}, __pfUser || getUser(), { avatar: reader.result }));
  };
  reader.readAsDataURL(file);

  upload("/api/user/avatar", file, function (p) { if (bar) bar.style.width = p + "%"; })
    .then(function (data) {
      const url = (data && data.avatar) || null;
      __pfUser = updateMyUser({ avatar: url }) || __pfUser;
      fillAll(__pfUser || getUser());
      showToast("头像已更新", "ok");
    })
    .catch(function (e) {
      fillHero(__pfUser || getUser());            /* 回滚预览 */
      showToast(e.message, "err");
    })
    .then(function () {
      if (prog) prog.style.display = "none";
      if (drop) drop.style.display = "";
    });
}

function pfRemoveAvatar() {
  const me = getUser();
  if (!me || !me.avatar) return;
  request("DELETE", "/api/user/avatar").then(function () {
    __pfUser = updateMyUser({ avatar: null }) || __pfUser;
    fillAll(__pfUser || getUser());
    showToast("已恢复默认头像", "ok");
  }).catch(function (e) { showToast(e.message, "err"); });
}

/* 拖拽上传：dragover 必须 preventDefault，否则浏览器会直接打开这张图 */
(function bindDrop() {
  const drop = document.getElementById("pfDrop");
  if (!drop) return;
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
  });
  drop.addEventListener("drop", function (e) {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) pfUpload(f);
  });
})();

/* ---------- 保存资料 ---------- */

function pfSaveInfo(e) {
  e.preventDefault();
  const nickname = document.getElementById("piNickname").value.trim();
  const phone = document.getElementById("piPhone").value.trim();

  if (!nickname) return showToast("昵称不能为空", "warn");
  if (phone && !/^1\d{10}$/.test(phone)) return showToast("手机号格式不对（11 位数字）", "warn");

  const btn = document.getElementById("pfSaveBtn");
  btn.disabled = true;
  btn.textContent = "保存中…";

  request("PUT", "/api/user/profile", { nickname: nickname, phone: phone })
    .then(function (u) {
      if (u) { __pfUser = u; updateMyUser(u); fillAll(u); }
      showToast("资料已保存", "ok");
    })
    .catch(function (err) { showToast(err.message, "err"); })
    .then(function () {
      btn.disabled = false;
      btn.textContent = "保存资料";
    });
}

/* ---------- 修改密码 ---------- */

function bindPwdStrength() {
  const input = document.getElementById("pfNewPwd");
  if (!input) return;
  input.addEventListener("input", function () {
    const v = input.value;
    const box = document.getElementById("pwdStrength");
    const fill = document.getElementById("psBarFill");
    const text = document.getElementById("psText");
    if (!box) return;
    if (!v) { box.style.display = "none"; return; }
    box.style.display = "";
    /* 简易强度：长度 + 字符种类（真正的高强度校验和加密在服务端） */
    let score = 0;
    if (v.length >= 6) score++;
    if (v.length >= 10) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    const level = score <= 2 ? 0 : (score <= 3 ? 1 : 2);
    const conf = [
      { w: "33%", c: "var(--danger)",  t: "弱：再加点长度或符号" },
      { w: "66%", c: "var(--warning)", t: "中：还可以更强" },
      { w: "100%", c: "var(--success)", t: "强：这个密码不错" }
    ][level];
    fill.style.width = conf.w;
    fill.style.background = conf.c;
    text.textContent = conf.t;
  });
}

function pfChangePassword(e) {
  e.preventDefault();
  const oldP = document.getElementById("pfOldPwd").value;
  const newP = document.getElementById("pfNewPwd").value;
  const newP2 = document.getElementById("pfNewPwd2").value;

  /* 前端先挡一道省一次请求；真正的校验必须在后端做（前端可绕过） */
  if (!oldP || !newP || !newP2) return showToast("请把三个密码框都填上", "warn");
  if (newP.length < 6) return showToast("新密码至少 6 位", "warn");
  if (newP !== newP2) return showToast("两次输入的新密码不一致", "warn");
  if (newP === oldP) return showToast("新密码不能和原密码相同", "warn");

  const btn = document.getElementById("pfPwdBtn");
  btn.disabled = true;
  btn.textContent = "提交中…";

  request("PUT", "/api/user/password", { oldPassword: oldP, newPassword: newP })
    .then(function () {
      showToast("密码已修改，请重新登录", "ok");
      setTimeout(function () {
        clearLogin();
        location.href = "login.html";
      }, 1200);
    })
    .catch(function (err) { showToast(err.message, "err"); })
    .then(function () {
      if (btn) { btn.disabled = false; btn.textContent = "确认修改"; }
    });
}
