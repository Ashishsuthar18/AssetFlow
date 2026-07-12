// ============================================================
// js/app.js — SPA Router, Odoo Shell, Modal & Toast System
// FIX: Notification bell uses event listener, not inline onclick
// ============================================================
const App = {
  currentView: null,
  navParams: {},

  init() {
    if (Auth.isAuthenticated()) {
      this.showApp();
    } else {
      this.showAuth();
    }
    window.addEventListener('hashchange', () => this.routeHash());
  },

  showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    renderAuthScreen();
  },

  showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    this.renderSidebar();
    this.renderTopbar();
    const hash = window.location.hash.replace('#','') || 'dashboard';
    this.navigate(hash);
    this.startOverdueCheck();
  },

  navigate(viewId, params = {}) {
    this.navParams = params;
    window.location.hash = viewId;
    this.renderView(viewId);
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewId);
    });
    this.updateBreadcrumb(viewId);
  },

  routeHash() {
    const hash = window.location.hash.replace('#','') || 'dashboard';
    if (hash !== this.currentView) this.renderView(hash);
  },

  renderView(viewId) {
    if (!Auth.isAuthenticated()) { this.showAuth(); return; }
    this.currentView = viewId;
    const container = document.getElementById('view-container');
    if (!container) return;
    container.innerHTML = '<div class="view-loading"><div class="spinner"></div></div>';

    const renderFns = {
      'dashboard':     () => renderDashboard(container),
      'org-setup':     () => renderOrgSetup(container),
      'assets':        () => renderAssetDirectory(container),
      'allocations':   () => renderAllocations(container, this.navParams),
      'bookings':      () => renderBookings(container),
      'maintenance':   () => renderMaintenance(container),
      'audit':         () => renderAudit(container),
      'analytics':     () => renderAnalytics(container),
      'notifications': () => renderNotifications(container),
    };

    const fn = renderFns[viewId];
    if (fn) {
      setTimeout(() => { fn(); this.navParams = {}; }, 40);
    } else {
      container.innerHTML = `<div class="empty-state" style="height:300px"><i data-lucide="file-x"></i><h3>404</h3><p>View not found.</p></div>`;
      lucide.createIcons();
    }

    const navItem = RBAC.NAV.find(n => n.id === viewId);
    document.title = navItem ? `${navItem.label} — AssetFlow` : 'AssetFlow ERP';
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewId);
    });
    this.updateBreadcrumb(viewId);
  },

  renderSidebar() {
    const user = Auth.getCurrentUser();
    const navItems = RBAC.navFor(user);
    const ri = RBAC.roleInfo(user.role);

    document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-logo">
      <div class="s-logo-icon">AF</div>
      <div class="s-logo-text">Asset<span>Flow</span></div>
    </div>
    <nav class="sidebar-nav">
      ${navItems.map(item => `
      <button class="nav-item" data-view="${item.id}" id="nav-${item.id}">
        <i data-lucide="${item.icon}"></i>
        <span>${item.label}</span>
        ${item.id === 'notifications' ? `<span class="nav-badge hidden" id="notif-badge">0</span>` : ''}
      </button>`).join('')}
    </nav>
    <div class="sidebar-user-section">
      <div class="s-avatar">${user.name[0]}</div>
      <div class="s-user-info">
        <div class="s-user-name">${escHtml(user.name)}</div>
        <div class="s-user-role">${escHtml(ri.label)}</div>
      </div>
      <button class="s-logout" id="btn-logout" title="Sign out"><i data-lucide="log-out"></i></button>
    </div>`;

    lucide.createIcons({ nodes: [document.getElementById('sidebar')] });

    // ── Attach nav click events via addEventListener (NOT inline onclick)
    navItems.forEach(item => {
      const btn = document.getElementById(`nav-${item.id}`);
      if (btn) btn.addEventListener('click', () => App.navigate(item.id));
    });
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => App.logout());

    this.updateNotifBadge();
  },

  renderTopbar() {
    const user = Auth.getCurrentUser();
    document.getElementById('topbar').innerHTML = `
    <div class="topbar-breadcrumb" id="topbar-breadcrumb">
      <span style="color:var(--text-muted)">AssetFlow</span>
    </div>
    <div class="topbar-actions">
      <button class="topbar-icon-btn" id="btn-topbar-notif" title="Notifications" aria-label="Notifications">
        <i data-lucide="bell"></i>
        <span class="topbar-notif-dot hidden" id="topbar-notif-dot"></span>
      </button>
      <div class="user-chip" style="font-size:0.82rem;display:flex;align-items:center;gap:7px;padding:4px 8px;border-radius:var(--radius-sm);cursor:pointer" id="btn-topbar-user">
        <div class="avatar-xs">${user.name[0]}</div>
        <span style="color:var(--text-secondary)">${escHtml(user.name.split(' ')[0])}</span>
        <i data-lucide="chevron-down" style="width:12px;height:12px;color:var(--text-muted)"></i>
      </div>
    </div>`;

    lucide.createIcons({ nodes: [document.getElementById('topbar')] });

    // ── FIX: Use addEventListener so the bell ALWAYS navigates correctly
    const bellBtn = document.getElementById('btn-topbar-notif');
    if (bellBtn) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        App.navigate('notifications');
      });
    }
    const userChip = document.getElementById('btn-topbar-user');
    if (userChip) {
      userChip.addEventListener('click', () => App.navigate('notifications'));
    }
  },

  updateBreadcrumb(viewId) {
    const el = document.getElementById('topbar-breadcrumb');
    if (!el) return;
    const navItem = RBAC.NAV.find(n => n.id === viewId);
    const label = navItem?.label || viewId;
    el.innerHTML = `<span style="color:var(--text-muted)">AssetFlow</span>
      <span class="bc-sep">›</span>
      <span class="bc-current">${escHtml(label)}</span>`;
  },

  updateNotifBadge() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const count = DB.notifications.getUnreadCount(user.id);
    const badge = document.getElementById('notif-badge');
    const dot   = document.getElementById('topbar-notif-dot');
    if (badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); }
    if (dot)   { dot.classList.toggle('hidden', count === 0); }
  },

  logout() {
    Auth.logout();
    window.location.hash = '';
    this.showAuth();
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    const icons = { success:'check-circle', error:'x-circle', info:'info', warning:'alert-triangle' };
    t.innerHTML = `<i data-lucide="${icons[type]||'info'}"></i><span>${escHtml(message)}</span>`;
    container.appendChild(t);
    lucide.createIcons({ nodes: [t] });
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
  },

  startOverdueCheck() {
    setInterval(() => {
      this.updateNotifBadge();
    }, 60000);
  },
};

// ── MODAL SYSTEM ─────────────────────────────────────────────
function showModal(titleHtml, bodyHtml, footerHtml = '') {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
  <div class="modal-backdrop" id="modal-backdrop"></div>
  <div class="modal-box">
    <div class="modal-header">
      <div class="modal-title">${titleHtml}</div>
      <button class="modal-close" id="modal-close-btn"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
  </div>`;
  overlay.classList.remove('hidden');
  lucide.createIcons({ nodes: [overlay] });

  // Use addEventListener — no inline onclick to avoid scope issues
  document.getElementById('modal-backdrop')?.addEventListener('click', closeModal);
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) { overlay.classList.add('hidden'); overlay.innerHTML = ''; }
}

// ── AUTH SCREEN ───────────────────────────────────────────────
function renderAuthScreen() {
  const el = document.getElementById('auth-screen');
  el.innerHTML = `
  <div class="auth-wrapper">
    <div class="auth-logo-area">
      <div class="auth-logo-icon">AF</div>
      <div class="auth-logo-title">AssetFlow ERP</div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">Enterprise Asset &amp; Resource Management</div>
    </div>
    <div class="auth-card">
      <div class="auth-tabs">
        <button class="auth-tab active" id="tab-login">Sign In</button>
        <button class="auth-tab" id="tab-signup">Create Account</button>
      </div>
      <div class="auth-body">
        <div id="auth-form-area">${renderLoginForm()}</div>
      </div>
      <div class="demo-section">
        <div class="demo-section-label">Demo Accounts — Click to fill</div>
        <div class="demo-grid">
          <div class="demo-item" data-email="admin@assetflow.com" data-pass="Admin@123">
            <div class="demo-role" style="color:var(--red)">🛡️ Admin</div>
            <div class="demo-name">Parth Chovatiya</div>
            <div class="demo-info">admin@assetflow.com</div>
          </div>
          <div class="demo-item" data-email="manager@assetflow.com" data-pass="Manager@123">
            <div class="demo-role" style="color:var(--yellow)">💼 Asset Manager</div>
            <div class="demo-name">Ashish Sudhar</div>
            <div class="demo-info">manager@assetflow.com</div>
          </div>
          <div class="demo-item" data-email="head@assetflow.com" data-pass="Head@123">
            <div class="demo-role" style="color:var(--purple)">👥 Dept. Head</div>
            <div class="demo-name">Rohan Desai</div>
            <div class="demo-info">head@assetflow.com</div>
          </div>
          <div class="demo-item" data-email="emp@assetflow.com" data-pass="Emp@123">
            <div class="demo-role" style="color:var(--green)">👤 Employee</div>
            <div class="demo-name">Priya Sharma</div>
            <div class="demo-info">emp@assetflow.com</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  lucide.createIcons({ nodes: [el] });

  // Attach events via addEventListener
  document.getElementById('tab-login')?.addEventListener('click',  () => _authSwitch('login'));
  document.getElementById('tab-signup')?.addEventListener('click', () => _authSwitch('signup'));
  document.querySelectorAll('.demo-item').forEach(item => {
    item.addEventListener('click', () => {
      _authSwitch('login');
      setTimeout(() => {
        const emailEl = document.getElementById('li-email');
        const passEl  = document.getElementById('li-pass');
        if (emailEl) emailEl.value = item.dataset.email;
        if (passEl)  passEl.value  = item.dataset.pass;
      }, 80);
    });
  });
  _attachLoginEvents();
}

function renderLoginForm() {
  return `
  <form id="login-form" class="auth-form" autocomplete="on">
    <div class="form-group">
      <label class="form-label">Email Address</label>
      <div class="input-icon-wrap"><i data-lucide="mail"></i>
        <input class="input" id="li-email" type="email" placeholder="name@company.com" required autocomplete="email">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <div class="input-icon-wrap"><i data-lucide="lock"></i>
        <input class="input" id="li-pass" type="password" placeholder="••••••••" required autocomplete="current-password">
      </div>
    </div>
    <div class="auth-options">
      <label class="checkbox-label"><input type="checkbox" id="li-remember"> Remember me</label>
      <a href="#" class="auth-link" id="forgot-link">Forgot password?</a>
    </div>
    <div id="auth-error" class="auth-error hidden"></div>
    <button type="submit" class="btn btn-primary btn-full btn-lg" id="btn-login">
      <i data-lucide="log-in"></i> Sign In
    </button>
  </form>`;
}

function renderSignupForm() {
  const depts = DB.departments.getAll();
  return `
  <form id="signup-form" class="auth-form" autocomplete="on">
    <div class="auth-notice">
      <i data-lucide="info"></i>
      Signup creates an <strong>Employee</strong> account. Admins assign higher roles.
    </div>
    <div class="form-group">
      <label class="form-label">Full Name</label>
      <div class="input-icon-wrap"><i data-lucide="user"></i>
        <input class="input" id="su-name" type="text" placeholder="Your full name" required>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Work Email</label>
      <div class="input-icon-wrap"><i data-lucide="mail"></i>
        <input class="input" id="su-email" type="email" placeholder="name@company.com" required>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <div class="input-icon-wrap"><i data-lucide="lock"></i>
        <input class="input" id="su-pass" type="password" placeholder="Min 6 characters" required>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Department</label>
      <select class="input" id="su-dept">
        <option value="">Select your department…</option>
        ${depts.map(d=>`<option value="${d.id}">${escHtml(d.name)}</option>`).join('')}
      </select>
    </div>
    <div id="auth-error" class="auth-error hidden"></div>
    <button type="submit" class="btn btn-primary btn-full btn-lg" id="btn-signup">
      <i data-lucide="user-plus"></i> Create Account
    </button>
  </form>`;
}

function _authSwitch(tab) {
  document.getElementById('tab-login')?.classList.toggle('active',  tab === 'login');
  document.getElementById('tab-signup')?.classList.toggle('active', tab === 'signup');
  document.getElementById('auth-form-area').innerHTML = tab === 'login' ? renderLoginForm() : renderSignupForm();
  lucide.createIcons({ nodes: [document.getElementById('auth-form-area')] });
  if (tab === 'login') _attachLoginEvents();
  else _attachSignupEvents();
}

function _attachLoginEvents() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('li-email')?.value;
    const pass  = document.getElementById('li-pass')?.value;
    const errEl = document.getElementById('auth-error');
    const res = Auth.login(email, pass);
    if (res.ok) { App.showApp(); }
    else { errEl.textContent = res.error; errEl.classList.remove('hidden'); }
  });
  document.getElementById('forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault(); App.toast('Contact your admin to reset your password.', 'info');
  });
}

function _attachSignupEvents() {
  const form = document.getElementById('signup-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = document.getElementById('su-name')?.value;
    const email = document.getElementById('su-email')?.value;
    const pass  = document.getElementById('su-pass')?.value;
    const dept  = document.getElementById('su-dept')?.value;
    const errEl = document.getElementById('auth-error');
    const res = Auth.signup(name, email, pass, dept);
    if (res.ok) { Auth.login(email, pass); App.toast(`Welcome, ${name}!`, 'success'); App.showApp(); }
    else { errEl.textContent = res.error; errEl.classList.remove('hidden'); }
  });
}

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
