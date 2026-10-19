/* ==========================================================
 * 登录页逻辑
 * ★ 本页故意不设 window.PAGE_ROLE —— 这样 getUser() 恒为 null，
 *   无论之前登录过谁，进登录页都显示表单，方便在新标签页换账号。
 * ========================================================== */

function switchTab(which) {
  const isLogin = which === "login";
  document.getElementById("tabLogin").classList.toggle("active", isLogin);
  document.getElementById("tabReg").classList.toggle("active", !isLogin);
  document.getElementById("loginForm").classList.toggle("hidden", !isLogin);
  document.getElementById("regForm").classList.toggle("hidden", isLogin);
  document.getElementById("pageTitle").textContent = isLogin ? "欢迎回来" : "创建账号";
  document.getElementById("pageSub").textContent = isLogin
    ? "登录后即可检索馆藏、借阅图书"
    : "注册后即可借阅图书，并参与论坛交流";
}

/* 演示账号一键填充（只是省得手打，走的还是真实的登录接口） */
function fillDemo(username) {
  switchTab("login");
  document.getElementById("loginUsername").value = username;
  document.getElementById("loginPassword").value = "123456";
  document.getElementById("loginUsername").focus();
}

async function doLogin(e) {
  e.preventDefault();
  const btn = document.getElementById("btnLogin");
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!username || !password) { showToast("请填写账号和密码", "warn"); return; }

  btn.disabled = true;
  btn.textContent = "登录中…";
  try {
    const res = await request("POST", "/api/login", { username: username, password: password });
    setLogin(res.token, res.user);
    showToast("登录成功，欢迎回来 " + res.user.nickname, "ok");
    /* 跳转前不禁用按钮的还原交给下面的 pageshow 兜底（bfcache 恢复时脚本不重跑） */
    setTimeout(function () { gotoHome(res.user.role); }, 500);
  } catch (err) {
    showToast(err.message, "err");
    btn.disabled = false;
    btn.textContent = "登 录";
  }
}

async function doRegister(e) {
  e.preventDefault();
  const btn = document.getElementById("btnReg");
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value;
  const nickname = document.getElementById("regNickname").value.trim();
  const phone = document.getElementById("regPhone").value.trim();

  if (!username || !password || !nickname) { showToast("请填写完整信息", "warn"); return; }
  if (password.length < 6) { showToast("密码至少 6 位", "warn"); return; }
  if (phone && !/^\d{11}$/.test(phone)) { showToast("手机号格式不对", "warn"); return; }

  btn.disabled = true;
  btn.textContent = "注册中…";
  try {
    await request("POST", "/api/register", {
      username: username, password: password, nickname: nickname, phone: phone
    });
    showToast("注册成功，请登录", "ok");
    document.getElementById("loginUsername").value = username;
    document.getElementById("loginPassword").value = "";
    switchTab("login");
  } catch (err) {
    showToast(err.message, "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "注 册";
  }
}

function resetBtns() {
  const b1 = document.getElementById("btnLogin");
  if (b1) { b1.disabled = false; b1.textContent = "登 录"; }
  const b2 = document.getElementById("btnReg");
  if (b2) { b2.disabled = false; b2.textContent = "注 册"; }
}

/* bfcache 恢复：脚本不会重跑，手动把表单/按钮复位 */
window.addEventListener("pageshow", function (e) {
  if (!e.persisted) return;
  resetBtns();
  document.getElementById("loginPassword").value = "";
  switchTab("login");
});
