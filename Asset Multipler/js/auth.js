// ============================================================
// js/auth.js — Authentication Module
// ============================================================

const Auth = {
  SESSION_KEY: 'af_session',

  getCurrentUser() {
    try {
      const s = sessionStorage.getItem(this.SESSION_KEY) || localStorage.getItem(this.SESSION_KEY + '_r');
      if (!s) return null;
      const { uid } = JSON.parse(s);
      return DB.users.getById(uid);
    } catch { return null; }
  },

  isAuthenticated() { return !!this.getCurrentUser(); },

  login(email, password, remember = false) {
    const user = DB.users.getByEmail(email);
    if (!user) return { ok: false, error: 'No account found with this email address.' };
    if (!user.is_active) return { ok: false, error: 'This account has been deactivated. Contact your Admin.' };
    if (user.password !== btoa(password)) return { ok: false, error: 'Incorrect password. Please try again.' };
    const payload = JSON.stringify({ uid: user.id });
    sessionStorage.setItem(this.SESSION_KEY, payload);
    if (remember) localStorage.setItem(this.SESSION_KEY + '_r', payload);
    DB.activityLogs.create({ user_id: user.id, action: 'Login', description: `${user.name} logged in.` });
    return { ok: true, user };
  },

  signup(name, email, password, department_id) {
    if (!name.trim()) return { ok: false, error: 'Full name is required.' };
    if (!email.includes('@')) return { ok: false, error: 'Enter a valid email address.' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    if (DB.users.getByEmail(email)) return { ok: false, error: 'An account with this email already exists.' };
    const user = DB.users.create({
      name: name.trim(), email: email.trim().toLowerCase(),
      password: btoa(password), role: 'Employee',
      department_id: parseInt(department_id) || null, is_active: true,
    });
    DB.activityLogs.create({ user_id: user.id, action: 'Account Created', description: `New employee account: ${name}` });
    return { ok: true, user };
  },

  logout() {
    const u = this.getCurrentUser();
    if (u) DB.activityLogs.create({ user_id: u.id, action: 'Logout', description: `${u.name} logged out.` });
    sessionStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.SESSION_KEY + '_r');
  },
};
