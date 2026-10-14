/* ============================================================
   Huzni's Family — Shared Auth + UI Helper
   File: auth.js
   Include this in EVERY page via: <script src="auth.js"></script>
   ============================================================ */

/* ---------------- SUPABASE CLIENT ---------------- */
const SUPABASE_URL = 'https://ziwqlcheflkjnswnqxcr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fenXy1YUuiY7B3HOObcHfQ_YIXDC5Ja';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- GLOBAL STATE ---------------- */
let currentUser    = null;
let currentProfile = null;
let currentWallet  = null;
let authReady      = false;

/* ---------------- INIT ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  applyLanguage(localStorage.getItem('az_lang') || 'en');

  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session?.user || null;
  if (currentUser) await loadUserData();

  authReady = true;
  renderHeader();
  renderFooter();
  updateAuthUI();

  // Fire event so notification system and page scripts can init
  document.dispatchEvent(new CustomEvent('auth-ready'));

  // Auth state changes
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      await loadUserData();
      refreshNotifCount();
      setupNotifRealtime();
    } else {
      currentProfile = null;
      currentWallet  = null;
      notifListenerSetup = false;
    }
    updateAuthUI();
    if (typeof onAuthChange === 'function') onAuthChange();
  });

  const loader = document.getElementById('loadingOverlay');
  if (loader) setTimeout(() => loader.classList.add('hidden'), 500);
});

/* ---------------- LOAD PROFILE + WALLET ---------------- */
async function loadUserData() {
  if (!currentUser) return;
  try {
    const [profRes, wallRes] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
      supabaseClient.from('wallets').select('*').eq('user_id', currentUser.id).maybeSingle()
    ]);
    currentProfile = profRes.data || null;
    currentWallet  = wallRes.data || null;
  } catch (e) {
    console.warn('loadUserData failed:', e);
  }
}

/* ---------------- UI BUILDERS ---------------- */

function renderHeader() {
  const mount = document.getElementById('app-header');
  if (!mount) return;

  const page = location.pathname.split('/').pop() || 'index.html';
  const isActive = (p) => page === p ? 'active' : '';

  mount.innerHTML = `
    <header class="header">
      <div class="nav-container">
        <a href="index.html" class="logo">
          <i class="fas fa-mountain-sun"></i>
          <span>Arizona AI</span>
        </a>

        <nav class="nav-menu" id="desktopNav">
          <a href="index.html" class="${isActive('index.html')}"><i class="fas fa-home"></i> Home</a>
          <a href="HuzniAI.html" class="${isActive('HuzniAI.html')}"><i class="fas fa-robot"></i> AI</a>
          <a href="Post.html" class="${isActive('Post.html')}"><i class="fas fa-newspaper"></i> Posts</a>
          <a href="chats.html" class="${isActive('chats.html')}"><i class="fas fa-comments"></i> Chat</a>
          <a href="Friends.html" class="${isActive('Friends.html')}"><i class="fas fa-users"></i> Friends</a>
          <a href="profile.html" class="${isActive('profile.html')}"><i class="fas fa-user"></i> Profile</a>
          <div class="nav-more">
            <a href="#" onclick="toggleMoreMenu(event)"><i class="fas fa-ellipsis"></i> More</a>
            <div class="more-dropdown" id="moreDropdown">
              <a href="ads.html"><i class="fas fa-ad"></i> Ads</a>
              <a href="crypto.forex.html"><i class="fas fa-chart-line"></i> Exchange</a>
              <a href="wallets.html"><i class="fas fa-wallet"></i> Wallet</a>
              <a href="offers.html"><i class="fas fa-gift"></i> Offers</a>
              <a href="aboutus.html"><i class="fas fa-info-circle"></i> About</a>
              <a href="contact.html"><i class="fas fa-envelope"></i> Contact</a>
              <a href="partner.html"><i class="fas fa-handshake"></i> Partner</a>
              <a href="privacy.html"><i class="fas fa-shield-alt"></i> Privacy</a>
              <a href="policy.html"><i class="fas fa-file-contract"></i> Policy</a>
            </div>
          </div>
        </nav>

        <div class="language-toggle">
          <button class="language-btn" onclick="toggleLanguageDropdown()">
            <span id="currentLanguageFlag">🇬🇧</span>
            <span id="currentLanguageText">English</span>
            <i class="fas fa-chevron-down"></i>
          </button>
          <div class="language-dropdown" id="languageDropdown">
            <div class="language-option" onclick="changeLanguage('en','🇬🇧','English',event)"><span class="language-flag">🇬🇧</span> English</div>
            <div class="language-option" onclick="changeLanguage('ar','🇸🇦','العربية',event)"><span class="language-flag">🇸🇦</span> العربية</div>
            <div class="language-option" onclick="changeLanguage('ku','🏴','کوردی',event)"><span class="language-flag">🏴</span> کوردی</div>
            <div class="language-option" onclick="changeLanguage('fa','🇮🇷','فارسی',event)"><span class="language-flag">🇮🇷</span> فارسی</div>
          </div>
        </div>

        <div class="auth-buttons" id="authButtons">
          <a href="login.html" class="btn-login">Login</a>
          <a href="register.html" class="btn-signup">Sign Up</a>
        </div>

        <div class="user-menu" id="userMenu" style="display:none;">
          <a href="notifications.html" class="notif-bell" data-notif-bell title="Notifications" style="position:relative; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--az-text); font-size:18px; text-decoration:none;">
            <i class="far fa-bell"></i>
          </a>
          <a href="profile.html" class="user-profile">
            <div class="user-avatar" id="userAvatar">U</div>
            <div class="user-info">
              <span class="user-name" id="userName">User</span>
              <span class="user-balance" id="userBalance">$0.00</span>
            </div>
          </a>
          <a href="logout.html" class="btn-logout">Logout</a>
        </div>

        <button class="hamburger" onclick="toggleMobileNav()"><i class="fas fa-bars"></i></button>
      </div>

      <nav class="mobile-nav" id="mobileNav">
        <a href="index.html"><i class="fas fa-home"></i> Home</a>
        <a href="HuzniAI.html"><i class="fas fa-robot"></i> AI</a>
        <a href="Post.html"><i class="fas fa-newspaper"></i> Posts</a>
        <a href="chats.html"><i class="fas fa-comments"></i> Chat</a>
        <a href="Friends.html"><i class="fas fa-users"></i> Friends</a>
        <a href="profile.html"><i class="fas fa-user"></i> Profile</a>
        <a href="notifications.html" data-notif-bell style="position:relative;">
          <i class="far fa-bell"></i> Notifications
        </a>
        <a href="wallets.html"><i class="fas fa-wallet"></i> Wallet</a>
        <a href="ads.html"><i class="fas fa-ad"></i> Ads</a>
        <a href="crypto.forex.html"><i class="fas fa-chart-line"></i> Exchange</a>
        <a href="offers.html"><i class="fas fa-gift"></i> Offers</a>
        <a href="aboutus.html"><i class="fas fa-info-circle"></i> About</a>
        <a href="contact.html"><i class="fas fa-envelope"></i> Contact</a>
        <a href="partner.html"><i class="fas fa-handshake"></i> Partner</a>
        <a href="privacy.html"><i class="fas fa-shield-alt"></i> Privacy</a>
        <a href="policy.html"><i class="fas fa-file-contract"></i> Policy</a>
        <div class="mobile-auth">
          <a href="login.html" class="btn-login" style="display:block;text-align:center;margin-bottom:10px;">Login</a>
          <a href="register.html" class="btn-signup" style="display:block;text-align:center;">Sign Up</a>
        </div>
      </nav>
    </header>
  `;
}

function renderFooter() {
  const mount = document.getElementById('app-footer');
  if (!mount) return;
  mount.innerHTML = `
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-section">
          <h4>Arizona AI Company</h4>
          <p style="color:var(--az-text-secondary);font-size:14px;">AI-powered social media platform that pays you for your content.</p>
        </div>
        <div class="footer-section">
          <h4>Quick Links</h4>
          <a href="index.html">Home</a>
          <a href="HuzniAI.html">AI Assistant</a>
          <a href="Post.html">Posts</a>
          <a href="chats.html">Chat</a>
          <a href="Friends.html">Friends</a>
        </div>
        <div class="footer-section">
          <h4>Legal</h4>
          <a href="privacy.html">Privacy</a>
          <a href="policy.html">Policy</a>
          <a href="aboutus.html">About Us</a>
          <a href="contact.html">Contact</a>
          <a href="partner.html">Partner</a>
        </div>
        <div class="footer-section">
          <h4>Support</h4>
          <a href="wallets.html">Payments</a>
          <a href="offers.html">Offers</a>
          <a href="contact.html">Contact Support</a>
          <a href="partner.html">Become a Partner</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>All Rights Reserved @ 2026 Powered By Huzni's Family and TDA developers</p>
      </div>
    </footer>
  `;
}

/* ---------------- UI STATE ---------------- */
function updateAuthUI() {
  const authBtns = document.getElementById('authButtons');
  const userMenu = document.getElementById('userMenu');
  if (!authBtns || !userMenu) return;

  if (currentUser) {
    authBtns.style.display = 'none';
    userMenu.style.display = 'flex';
    const name = currentProfile?.username || currentUser.email?.split('@')[0] || 'User';
    const bal  = currentWallet?.balance ?? 0;
    const avatar = currentProfile?.avatar_url;

    document.getElementById('userName').textContent = name;
    document.getElementById('userBalance').textContent = '$' + Number(bal).toFixed(2);

    const avatarEl = document.getElementById('userAvatar');
    if (avatar) {
      avatarEl.innerHTML = `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      avatarEl.textContent = name.charAt(0).toUpperCase();
    }

    // Init notifications
    refreshNotifCount();
    setupNotifRealtime();
  } else {
    authBtns.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}

/* ---------------- NAV HELPERS ---------------- */
function toggleMobileNav() {
  document.getElementById('mobileNav')?.classList.toggle('active');
}
function toggleLanguageDropdown() {
  document.getElementById('languageDropdown')?.classList.toggle('active');
}
function toggleMoreMenu(e) {
  e.preventDefault();
  document.getElementById('moreDropdown')?.classList.toggle('active');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-more')) {
    document.getElementById('moreDropdown')?.classList.remove('active');
  }
});

/* ---------------- AUTH HELPERS ---------------- */
async function signOutUser() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem('az_lang');
  window.location.href = 'index.html';
}

/* ---------------- TOAST ---------------- */
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

/* ---------------- LANGUAGE ---------------- */
const AZ_TRANSLATIONS = {
  en: { home:'Home', ai:'AI', posts:'Posts', chat:'Chat', friends:'Friends',
        login:'Login', signup:'Sign Up', logout:'Logout', profile:'Profile' },
  ar: { home:'الرئيسية', ai:'الذكاء الاصطناعي', posts:'المنشورات', chat:'الدردشة',
        friends:'الأصدقاء', login:'تسجيل الدخول', signup:'إنشاء حساب', logout:'تسجيل الخروج', profile:'الملف الشخصي' },
  ku: { home:'سەرەکی', ai:'زیریاکی', posts:'بابەتەکان', chat:'گفتوگۆ',
        friends:'هاوڕێکان', login:'چوونە ژوورەوە', signup:'خۆت تۆمار بکە', logout:'چوونە دەرەوە', profile:'پرۆفایل' },
  fa: { home:'خانه', ai:'هوش مصنوعی', posts:'پست‌ها', chat:'گفتگو',
        friends:'دوستان', login:'ورود', signup:'ثبت نام', logout:'خروج', profile:'پروفایل' }
};

function changeLanguage(lang, flag, name, event) {
  localStorage.setItem('az_lang', lang);
  const flagEl = document.getElementById('currentLanguageFlag');
  const textEl = document.getElementById('currentLanguageText');
  if (flagEl) flagEl.textContent = flag;
  if (textEl) textEl.textContent = name;

  document.querySelectorAll('.language-option').forEach(o => o.classList.remove('active'));
  if (event?.target) event.target.closest('.language-option')?.classList.add('active');

  document.getElementById('languageDropdown')?.classList.remove('active');
  applyLanguage(lang);
}

function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === 'ar' || lang === 'fa') ? 'rtl' : 'ltr';
}

/* ---------------- UTILITIES ---------------- */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formatDate(d) {
  return new Date(d).toLocaleString();
}
function requireAuth() {
  if (!currentUser) { window.location.href = 'login.html'; return false; }
  return true;
}
function requireGuest() {
  if (currentUser) { window.location.href = 'index.html'; return false; }
  return true;
}

/* ============================================================
   GLOBAL NOTIFICATIONS — runs on every page
   ============================================================ */
let notifChannel = null;
let notifListenerSetup = false;

async function fetchUnreadNotifCount() {
  if (!currentUser) return 0;
  try {
    const { count } = await supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);
    return count || 0;
  } catch { return 0; }
}

function updateBellBadge(count) {
  const bellEls = document.querySelectorAll('[data-notif-bell]');
  bellEls.forEach(el => {
    let dot = el.querySelector('.notif-count');
    if (count > 0) {
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'notif-count';
        dot.style.cssText = `
          position:absolute; top:2px; right:2px;
          background:var(--az-primary); color:#fff;
          font-size:10px; font-weight:800;
          min-width:18px; height:18px;
          border-radius:9px; padding:0 5px;
          display:flex; align-items:center; justify-content:center;
          border:2px solid #0a0a0a;
          line-height:1;
          z-index:5;
        `;
        el.style.position = 'relative';
        el.appendChild(dot);
      }
      dot.textContent = count > 99 ? '99+' : count;
    } else if (dot) {
      dot.remove();
    }
  });
}

async function refreshNotifCount() {
  const count = await fetchUnreadNotifCount();
  updateBellBadge(count);
  return count;
}

function setupNotifRealtime() {
  if (!currentUser || notifListenerSetup) return;
  notifListenerSetup = true;

  notifChannel = supabaseClient
    .channel('global-notif-' + currentUser.id)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${currentUser.id}` },
      async (payload) => {
        const n = payload.new;
        await refreshNotifCount();
        showNotifToast(n);
      }
    )
    .subscribe();
}

async function showNotifToast(n) {
  let actorName = 'Someone';
  let actorAvatar = null;
  try {
    const { data } = await supabaseClient
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', n.actor_id)
      .maybeSingle();
    if (data) {
      actorName = data.display_name || data.username || actorName;
      actorAvatar = data.avatar_url;
    }
  } catch (e) {}

  const msgMap = {
    like:    `❤️ ${actorName} liked your post`,
    comment: `💬 ${actorName} commented on your post`,
    follow:  `👤 ${actorName} started following you`,
    message: `📩 ${actorName} sent you a message`,
    mention: `@ ${actorName} mentioned you`,
    tip:     `💰 ${actorName} sent you a tip`,
    request: `📨 ${actorName} requested to follow you`
  };
  const msg = msgMap[n.type] || '🔔 New notification';

  let container = document.getElementById('globalNotifToasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'globalNotifToasts';
    container.style.cssText = `
      position:fixed; top:70px; left:50%;
      transform:translateX(-50%);
      z-index:9999; width:92%; max-width:420px;
      display:flex; flex-direction:column; gap:8px;
      pointer-events:none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background:#1a1a1a;
    border:1px solid rgba(255,107,53,.4);
    border-left:4px solid var(--az-primary);
    border-radius:12px;
    padding:12px 14px;
    display:flex; align-items:center; gap:12px;
    box-shadow:0 10px 30px rgba(0,0,0,.6);
    color:#fff;
    font-size:13px;
    animation: slideDown .3s ease;
    cursor:pointer;
    pointer-events:auto;
  `;

  toast.innerHTML = `
    ${actorAvatar
      ? `<img src="${actorAvatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
      : `<div style="width:36px;height:36px;border-radius:50%;background:var(--az-gradient);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${actorName.charAt(0).toUpperCase()}</div>`}
    <div style="flex:1;line-height:1.4;">${msg}</div>
    <i class="fas fa-chevron-right" style="opacity:.5;font-size:12px;"></i>
  `;

  toast.onclick = () => { window.location.href = 'notifications.html'; };
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, 5000);

  if (!document.getElementById('notifKeyframes')) {
    const style = document.createElement('style');
    style.id = 'notifKeyframes';
    style.textContent = `
      @keyframes slideDown {
        from { opacity:0; transform: translateY(-10px); }
        to   { opacity:1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
}

/* ---------------- AUTO INIT ---------------- */
document.addEventListener('auth-ready', () => {
  refreshNotifCount();
  setupNotifRealtime();
});

// Fallback safety net
setInterval(() => {
  if (currentUser && !notifListenerSetup) {
    setupNotifRealtime();
    refreshNotifCount();
  }
}, 3000);
