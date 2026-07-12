/* ============================================================
   AssetFlow – Application Logic
   ============================================================ */

'use strict';

/* ── Utilities ──────────────────────────────────────────────── */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  toast.innerHTML = (icons[type] || '') + `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

/* ── Modal ──────────────────────────────────────────────────── */
const Modal = {
  open(title, bodyHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-overlay').classList.add('open');
  },
  close() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.getElementById('modal-body').innerHTML = '';
  }
};

/* ── App Core ───────────────────────────────────────────────── */
const App = {
  themes: ['system', 'light', 'dark'],
  currentThemeIndex: 0,

  initTheme() {
    const saved = localStorage.getItem('app-theme') || 'system';
    this.currentThemeIndex = this.themes.indexOf(saved) > -1 ? this.themes.indexOf(saved) : 0;
    this.applyTheme(this.themes[this.currentThemeIndex]);
    
    // Listen for system changes if system mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.themes[this.currentThemeIndex] === 'system') {
        this.applyTheme('system');
      }
    });
  },

  cycleTheme() {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
    const theme = this.themes[this.currentThemeIndex];
    localStorage.setItem('app-theme', theme);
    this.applyTheme(theme);
  },

  applyTheme(theme) {
    const root = document.documentElement;
    const icons = [document.getElementById('theme-icon'), document.getElementById('login-theme-icon')];
    
    let isDark = true;
    if (theme === 'light') {
      isDark = false;
      root.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
      isDark = true;
      root.removeAttribute('data-theme');
    } else { // system
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!isDark) root.setAttribute('data-theme', 'light');
      else root.removeAttribute('data-theme');
    }

    icons.forEach(icon => {
      if (!icon) return;
      
      if (theme === 'system') {
        icon.innerHTML = '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>';
      } else if (isDark) {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
      } else {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
      }
    });
  },
  togglePassword() {
    const input = document.getElementById('login-password');
    const icon = document.getElementById('eye-icon');
    if (input.type === 'password') {
      input.type = 'text';
      icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      input.type = 'password';
      icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  },

  login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    let foundEmployee = null;
    const empRows = document.querySelectorAll('#tab-content-employees tbody tr');
    empRows.forEach(row => {
      const rowEmail = row.cells[1].textContent.trim();
      if (rowEmail === email) {
        foundEmployee = {
          name: row.cells[0].textContent.trim(),
          role: row.cells[3].textContent.trim()
        };
      }
    });

    if (!foundEmployee) {
      showToast('Account not found. Only registered employees can access.', 'error');
      return;
    }

    if (!window.userPasswords) window.userPasswords = {};
    const validPassword = window.userPasswords[email] || 'password123';

    if (password !== validPassword) {
      showToast('Invalid credentials.', 'error');
      return;
    }

    document.querySelector('.user-name').textContent = foundEmployee.name;
    document.querySelector('.user-role').textContent = foundEmployee.role;
    const initials = foundEmployee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.querySelector('.user-avatar').textContent = initials;

    document.getElementById('screen-login').classList.remove('active');
    const main = document.getElementById('screen-main');
    main.classList.add('active');
    main.style.display = 'flex';
    App.updateDate();
    showToast(`Welcome back, ${foundEmployee.name}!`, 'success');
  },

  openSignupModal() {
    const bodyHTML = `
      <div class="form-group"><label>Full Name</label><input type="text" class="form-input" id="signup-name" placeholder="e.g. John Doe" /></div>
      <div class="form-group"><label>Email</label><input type="email" class="form-input" id="signup-email" placeholder="john@company.com" /></div>
      <div class="form-group"><label>Department</label>
        <select class="form-input" id="signup-dept">
          <option>Engineering</option><option>IT</option><option>Facilities</option><option>Field Ops</option>
        </select>
      </div>
      <div class="form-group">
        <label>Password</label>
        <div style="position: relative;">
          <input type="password" class="form-input" id="signup-password" placeholder="Enter password" style="padding-right: 40px; box-sizing: border-box;" />
        </div>
      </div>
      <div class="form-group">
        <label>Confirm Password</label>
        <div style="position: relative;">
          <input type="password" class="form-input" id="signup-password-confirm" placeholder="Confirm password" style="padding-right: 40px; box-sizing: border-box;" />
        </div>
      </div>
      <button class="btn btn-primary btn-full" onclick="App.createAccount()">Sign Up</button>
    `;
    Modal.open('Create Account', bodyHTML);
  },

  createAccount() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const dept = document.getElementById('signup-dept').value;
    const password = document.getElementById('signup-password').value.trim();
    const confirmPassword = document.getElementById('signup-password-confirm').value.trim();

    if (!name || !email || !password || !confirmPassword) {
      showToast('Please provide all details.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (!window.userPasswords) window.userPasswords = {};
    window.userPasswords[email] = password;

    const tbody = document.querySelector('#tab-content-employees tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${name}</td>
      <td>${email}</td>
      <td>${dept}</td>
      <td><span class="status-badge status-inactive">Employee</span></td>
      <td>
        <button class="action-btn" onclick="OrgSetup.editEmployee('${name}')">Edit</button>
        <button class="action-btn action-btn-danger" onclick="OrgSetup.deleteEmployee(this)">Remove</button>
      </td>
    `;
    tbody.appendChild(row);

    document.querySelectorAll('select').forEach(sel => {
      if (sel.id.includes('head')) sel.add(new Option(name, name));
      if (sel.id === 'alloc-employee' || sel.id === 'transfer-to') {
        sel.add(new Option(`${name} – ${dept}`, `${name} – ${dept}`));
      }
    });

    Modal.close();
    showToast(`Account for ${name} created successfully!`, 'success');
  },

  openChangePasswordModal() {
    const bodyHTML = `
      <div class="form-group"><label>Email</label><input type="email" class="form-input" id="reset-email" placeholder="john@company.com" /></div>
      <div class="form-group">
        <label>Current Password</label>
        <input type="password" class="form-input" id="reset-old-password" />
      </div>
      <div class="form-group">
        <label>New Password</label>
        <input type="password" class="form-input" id="reset-new-password" />
      </div>
      <div class="form-group">
        <label>Confirm New Password</label>
        <input type="password" class="form-input" id="reset-confirm-password" />
      </div>
      <button class="btn btn-primary btn-full" onclick="App.changePassword()">Update Password</button>
    `;
    Modal.open('Change Password', bodyHTML);
  },

  changePassword() {
    const email = document.getElementById('reset-email').value.trim();
    const oldPass = document.getElementById('reset-old-password').value.trim();
    const newPass = document.getElementById('reset-new-password').value.trim();
    const confirmPass = document.getElementById('reset-confirm-password').value.trim();

    if (!email || !oldPass || !newPass || !confirmPass) {
      showToast('Please provide all details.', 'error');
      return;
    }

    if (newPass !== confirmPass) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    if (!window.userPasswords) window.userPasswords = {};
    const validPassword = window.userPasswords[email] || 'password123';

    if (oldPass !== validPassword) {
      showToast('Current password is incorrect.', 'error');
      return;
    }

    window.userPasswords[email] = newPass;
    Modal.close();
    showToast('Password updated successfully. You can now login with your new password.', 'success');
  },

  logout() {
    window.location.reload();
  },

  updateDashboardStats() {
    const assetRows = document.querySelectorAll('#assets-table tbody tr');
    let available = 0;
    let allocated = 0;
    let maintenance = 0;
    let retired = 0;
    const total = assetRows.length;
    
    assetRows.forEach(row => {
      const statusText = row.querySelector('.status-badge')?.textContent.trim();
      if (statusText === 'Available') available++;
      else if (statusText === 'Allocated') allocated++;
      else if (statusText === 'Maintenance') maintenance++;
      else if (statusText === 'Retired') retired++;
    });

    const availElem = document.getElementById('dash-stat-available');
    const allocElem = document.getElementById('dash-stat-allocated');
    if (availElem) availElem.textContent = available;
    if (allocElem) allocElem.textContent = allocated;

    // Update Reports Donut Chart
    const reportTotalElem = document.getElementById('report-total-assets');
    if (reportTotalElem) reportTotalElem.textContent = total;
    
    const legendItems = document.querySelectorAll('.donut-legend .legend-item');
    if (legendItems.length >= 4) {
      legendItems[0].innerHTML = `<span class="legend-dot" style="background:var(--accent-blue)"></span>Allocated (${allocated})`;
      legendItems[1].innerHTML = `<span class="legend-dot" style="background:var(--accent-green)"></span>Available (${available})`;
      legendItems[2].innerHTML = `<span class="legend-dot" style="background:var(--accent-red)"></span>Maintenance (${maintenance})`;
      legendItems[3].innerHTML = `<span class="legend-dot" style="background:var(--accent-amber)"></span>Retired (${retired})`;
    }
    
    const C = 2 * Math.PI * 45; // Circumference = 282.74
    const allocLen = total > 0 ? (allocated / total) * C : 0;
    const availLen = total > 0 ? (available / total) * C : 0;
    const maintLen = total > 0 ? (maintenance / total) * C : 0;
    const retirLen = total > 0 ? (retired / total) * C : 0;
    
    const circles = document.querySelectorAll('.donut-svg circle');
    if (circles.length >= 4) {
      // First is Allocated (Blue)
      circles[1].style.strokeDasharray = `${allocLen} ${C - allocLen}`;
      circles[1].style.strokeDashoffset = `0`;
      
      // Second is Maintenance (Red - wait, legend says Maintenance is red)
      // Actually legend says: Blue(Allocated), Green(Available), Red(Maintenance), Amber(Retired)
      // In SVG: circle 1=blue, circle 2=red, circle 3=amber
      // The original SVG didn't have green circle, wait... the base circle was the remaining space?
      // Let's explicitly draw 4 segments by adding a green circle dynamically if missing, but we only have 3 overlay circles.
      // Wait, the base circle (index 0) has stroke="var(--border)".
      // Then Blue (Alloc), Red (Maint), Amber (Retired). Let's reuse them.
      circles[1].style.strokeDasharray = `${allocLen} ${C - allocLen}`;
      circles[1].style.strokeDashoffset = `0`;
      
      circles[2].style.strokeDasharray = `${maintLen} ${C - maintLen}`;
      circles[2].style.strokeDashoffset = `-${allocLen}`;
      
      circles[3].style.strokeDasharray = `${retirLen} ${C - retirLen}`;
      circles[3].style.strokeDashoffset = `-${allocLen + maintLen}`;
      
      // We can use the base circle for 'Available' but it's grey (--border).
      // Let's color the base circle green if we want to match legend!
      circles[0].style.stroke = 'var(--accent-green)';
    }

    // Update Department Bar Chart
    const barRows = document.querySelectorAll('.dept-grid .dept-card');
    
    // First, calculate allocated assets per department
    const deptCounts = {};
    barRows.forEach(row => {
      const dept = row.querySelector('.dept-name').textContent.trim();
      let count = 0;
      assetRows.forEach(ar => {
        const statusText = ar.querySelector('.status-badge')?.textContent.trim();
        if (statusText === 'Allocated' && ar.dataset.dept && ar.dataset.dept.includes(dept)) count++;
      });
      deptCounts[dept] = count;
    });

    // Now update the UI
    barRows.forEach(row => {
      const dept = row.querySelector('.dept-name').textContent.trim();
      const count = deptCounts[dept] || 0;
      const valElem = row.querySelector('.bar-value');
      if (valElem) valElem.textContent = count;
      const fillElem = row.querySelector('.bar-fill');
      // Scale width relative to the TOTAL assets in the system so it looks realistic visually
      if (fillElem) fillElem.style.width = total > 0 ? `${(count / total) * 100}%` : '0%';
    });
    
    // Update Categories Table
    const catRows = document.querySelectorAll('#tab-categories-body tr');
    catRows.forEach(row => {
      const cat = row.cells[0].textContent.trim();
      let count = 0;
      assetRows.forEach(ar => {
        if (ar.dataset.category === cat || (ar.cells[2] && ar.cells[2].textContent.trim() === cat)) count++;
      });
      row.cells[1].textContent = count;
    });

    // Sync dropdowns
    if (typeof Allocation !== 'undefined' && typeof Allocation.updateDropdowns === 'function') {
      Allocation.updateDropdowns();
    }
  },

  navigate(page, el) {
    // Update active nav item
    if (el) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      // Find the nav item for this page
      const navItem = document.querySelector(`[data-page="${page}"]`);
      if (navItem) navItem.classList.add('active');
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');
  },

  updateDate() {
    const el = document.getElementById('current-date');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  }
};

/* ── Organization Setup ─────────────────────────────────────── */
const OrgSetup = {
  switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-content-${tab}`).classList.add('active');
  },

  openAddModal() {
    const activeTab = document.querySelector('.tab-btn.active')?.textContent?.trim() || 'Departments';
    const isEmployee = activeTab === 'Employee';
    const isCategory = activeTab === 'Categories';

    let bodyHTML = '';
    if (isEmployee) {
      bodyHTML = `
        <div class="form-group"><label>Full Name</label><input type="text" class="form-input" id="new-emp-name" placeholder="e.g. John Doe" /></div>
        <div class="form-group"><label>Email</label><input type="email" class="form-input" id="new-emp-email" placeholder="john@company.com" /></div>
        <div class="form-group"><label>Department</label>
          <select class="form-input" id="new-emp-dept">
            <option>Engineering</option><option>IT</option><option>Facilities</option><option>Field Ops</option>
          </select>
        </div>
        <div class="form-group"><label>Role</label>
          <select class="form-input" id="new-emp-role"><option>Employee</option><option>Admin</option></select>
        </div>
        <button class="btn btn-primary btn-full" onclick="OrgSetup.saveEmployee()">Add Employee</button>
      `;
      Modal.open('Add Employee', bodyHTML);
    } else if (isCategory) {
      bodyHTML = `
        <div class="form-group"><label>Category Name</label><input type="text" class="form-input" id="new-cat-name" placeholder="e.g. Medical Equipment" /></div>
        <div class="form-group"><label>Description</label><textarea class="form-input form-textarea" id="new-cat-desc" placeholder="Brief description..."></textarea></div>
        <button class="btn btn-primary btn-full" onclick="OrgSetup.saveCategory()">Add Category</button>
      `;
      Modal.open('Add Category', bodyHTML);
    } else {
      bodyHTML = `
        <div class="form-group"><label>Department Name</label><input type="text" class="form-input" id="new-dept-name" placeholder="e.g. Legal" /></div>
        <div class="form-group"><label>Head</label>
          <select class="form-input" id="new-dept-head">
            <option value="">Select employee...</option>
            <option>Priya Shah</option><option>Arjun Nair</option><option>Sona Iqbal</option>
          </select>
        </div>
        <div class="form-group"><label>Parent Department</label>
          <select class="form-input" id="new-dept-parent">
            <option value="">None (root department)</option>
            <option>Engineering</option><option>Facilities</option><option>Field Ops</option>
          </select>
        </div>
        <div class="form-group"><label>Status</label>
          <select class="form-input" id="new-dept-status"><option>Active</option><option>Inactive</option></select>
        </div>
        <button class="btn btn-primary btn-full" onclick="OrgSetup.saveDept()">Add Department</button>
      `;
      Modal.open('Add Department', bodyHTML);
    }
  },

  saveDept() {
    const name   = document.getElementById('new-dept-name').value.trim();
    const head   = document.getElementById('new-dept-head').value;
    const parent = document.getElementById('new-dept-parent').value;
    const status = document.getElementById('new-dept-status').value;

    if (!name) { showToast('Department name is required.', 'error'); return; }

    const tbody = document.getElementById('dept-table-body');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${name}</td>
      <td>${head || '–'}</td>
      <td>${parent || '–'}</td>
      <td><span class="status-badge ${status === 'Active' ? 'status-active' : 'status-inactive'}">${status}</span></td>
      <td>
        <button class="action-btn" onclick="OrgSetup.editDept('${name}')">Edit</button>
        <button class="action-btn action-btn-danger" onclick="OrgSetup.deleteDept(this)">Delete</button>
      </td>
    `;
    tbody.appendChild(row);

    // Add to Department dropdowns
    document.querySelectorAll('select').forEach(sel => {
      if (sel.id.includes('dept') && !sel.id.includes('status')) {
        sel.add(new Option(name, name));
      }
    });

    Modal.close();
    showToast(`Department "${name}" added successfully.`, 'success');
  },

  saveEmployee() {
    const name = document.getElementById('new-emp-name').value.trim();
    const email = document.getElementById('new-emp-email').value.trim();
    const dept = document.getElementById('new-emp-dept').value;
    const role = document.getElementById('new-emp-role').value;
    const currentUserRole = document.querySelector('.user-role').textContent;

    if (!name) { showToast('Employee name is required.', 'error'); return; }

    if (role === 'Admin' && currentUserRole !== 'Admin') {
      showToast('Permission denied: Only Admins can assign the Admin role.', 'error');
      return;
    }

    const tbody = document.querySelector('#tab-content-employees tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${name}</td>
      <td>${email}</td>
      <td>${dept}</td>
      <td><span class="status-badge ${role === 'Admin' ? 'status-active' : 'status-inactive'}">${role}</span></td>
      <td>
        <button class="action-btn" onclick="OrgSetup.editEmployee('${name}')">Edit</button>
        <button class="action-btn action-btn-danger" onclick="OrgSetup.deleteEmployee(this)">Remove</button>
      </td>
    `;
    tbody.appendChild(row);

    // Update Head dropdowns and Assign To dropdowns
    document.querySelectorAll('select').forEach(sel => {
      if (sel.id.includes('head')) sel.add(new Option(name, name));
      if (sel.id === 'alloc-employee' || sel.id === 'transfer-to') {
        sel.add(new Option(`${name} – ${dept}`, `${name} – ${dept}`));
      }
    });

    Modal.close();
    showToast(`Employee "${name}" added successfully.`, 'success');
    if (typeof Allocation !== 'undefined') Allocation.updateDropdowns();
  },

  saveCategory() {
    const name = document.getElementById('new-cat-name').value.trim();
    const desc = document.getElementById('new-cat-desc').value.trim();

    if (!name) { showToast('Category name is required.', 'error'); return; }

    const tbody = document.querySelector('#tab-content-categories tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${name}</td>
      <td>0</td>
      <td>${desc}</td>
      <td>
        <button class="action-btn" onclick="OrgSetup.editCategory('${name}')">Edit</button>
        <button class="action-btn action-btn-danger" onclick="OrgSetup.deleteCategory(this)">Delete</button>
      </td>
    `;
    tbody.appendChild(row);

    document.querySelectorAll('select').forEach(sel => {
      if (sel.id.includes('category')) sel.add(new Option(name, name));
    });

    Modal.close();
    showToast(`Category "${name}" added successfully.`, 'success');
  },

  editDept(name) {
    const bodyHTML = `
      <div class="form-group"><label>Department Name</label><input type="text" class="form-input" id="edit-dept-name" value="${name}" /></div>
      <div class="form-group"><label>Head</label>
        <select class="form-input" id="edit-dept-head">
          <option value="">Select employee...</option>
          <option>Priya Shah</option><option>Arjun Nair</option><option>Sona Iqbal</option>
        </select>
      </div>
      <div class="form-group"><label>Parent Department</label>
        <select class="form-input" id="edit-dept-parent">
          <option value="">None (root department)</option>
          <option>Engineering</option><option>Facilities</option><option>Field Ops</option>
        </select>
      </div>
      <div class="form-group"><label>Status</label>
        <select class="form-input" id="edit-dept-status"><option>Active</option><option>Inactive</option></select>
      </div>
      <button class="btn btn-primary btn-full" onclick="OrgSetup.saveEditDept('${name}')">Save Changes</button>
    `;
    Modal.open(`Edit Department – ${name}`, bodyHTML);
  },

  saveEditDept(oldName) {
    const newName = document.getElementById('edit-dept-name').value.trim();
    const head = document.getElementById('edit-dept-head').value;
    const parent = document.getElementById('edit-dept-parent').value;
    const status = document.getElementById('edit-dept-status').value;

    if (!newName) { showToast('Department name is required.', 'error'); return; }

    const deptRows = document.querySelectorAll('#tab-content-departments tbody tr');
    deptRows.forEach(row => {
      if (row.cells[0].textContent === oldName) {
        row.cells[0].textContent = newName;
        row.cells[1].textContent = head || '–';
        row.cells[2].textContent = parent || '–';
        row.cells[3].innerHTML = `<span class="status-badge ${status === 'Active' ? 'status-active' : 'status-inactive'}">${status}</span>`;
        row.cells[4].innerHTML = `
          <button class="action-btn" onclick="OrgSetup.editDept('${newName}')">Edit</button>
          <button class="action-btn action-btn-danger" onclick="OrgSetup.deleteDept(this)">Delete</button>
        `;
      }
      if (row.cells[2].textContent === oldName) {
        row.cells[2].textContent = newName;
      }
    });

    const empRows = document.querySelectorAll('#tab-content-employees tbody tr');
    empRows.forEach(row => {
      if (row.cells[2].textContent === oldName) {
        row.cells[2].textContent = newName;
      } else if (row.cells[2].textContent.includes(oldName)) {
        row.cells[2].textContent = row.cells[2].textContent.replace(oldName, newName);
      }
    });

    document.querySelectorAll('option').forEach(opt => {
      if (opt.textContent === oldName) opt.textContent = newName;
      if (opt.value === oldName) opt.value = newName;
      if (opt.textContent.includes(`– ${oldName}`)) opt.textContent = opt.textContent.replace(`– ${oldName}`, `– ${newName}`);
    });

    Modal.close();
    showToast('Department updated successfully.', 'success');
  },

  deleteDept(btn) {
    const row = btn.closest('tr');
    const deptName = row.cells[0].textContent;
    if (confirm(`Delete department "${deptName}"?`)) {
      row.remove();
      showToast(`Department "${deptName}" deleted.`, 'info');
    }
  },

  editCategory(name) {
    const bodyHTML = `
      <div class="form-group"><label>Category Name</label><input type="text" class="form-input" id="edit-cat-name" value="${name}" /></div>
      <div class="form-group"><label>Description</label><textarea class="form-input form-textarea" id="edit-cat-desc">Standard description for ${name}...</textarea></div>
      <button class="btn btn-primary btn-full" onclick="OrgSetup.saveEditCategory('${name}')">Save Changes</button>
    `;
    Modal.open(`Edit Category – ${name}`, bodyHTML);
  },

  saveEditCategory(oldName) {
    const newName = document.getElementById('edit-cat-name').value.trim();
    const desc = document.getElementById('edit-cat-desc').value.trim();

    if (!newName) { showToast('Category name is required.', 'error'); return; }

    const rows = document.querySelectorAll('#tab-content-categories tbody tr');
    rows.forEach(row => {
      if (row.cells[0].textContent === oldName) {
        row.cells[0].textContent = newName;
        row.cells[2].textContent = desc;
        row.cells[3].innerHTML = `
          <button class="action-btn" onclick="OrgSetup.editCategory('${newName}')">Edit</button>
          <button class="action-btn action-btn-danger" onclick="OrgSetup.deleteCategory(this)">Delete</button>
        `;
      }
    });

    document.querySelectorAll('option').forEach(opt => {
      if (opt.textContent === oldName) opt.textContent = newName;
      if (opt.value === oldName) opt.value = newName;
    });
    Modal.close();
    showToast('Category updated successfully.', 'success');
  },

  deleteCategory(btn) {
    const row = btn.closest('tr');
    const categoryName = row.cells[0].textContent;
    if (confirm(`Delete category "${categoryName}"?`)) {
      row.remove();
      showToast(`Category "${categoryName}" deleted.`, 'info');
    }
  },

  editEmployee(name) {
    const bodyHTML = `
      <div class="form-group"><label>Full Name</label><input type="text" class="form-input" id="edit-emp-name" value="${name}" /></div>
      <div class="form-group"><label>Email</label><input type="email" class="form-input" id="edit-emp-email" value="${name.toLowerCase().replace(' ', '.')}@company.com" /></div>
      <div class="form-group"><label>Department</label>
        <select class="form-input" id="edit-emp-dept">
          <option>Engineering</option><option>IT</option><option>Facilities</option><option>Field Ops</option>
        </select>
      </div>
      <div class="form-group"><label>Role</label>
        <select class="form-input" id="edit-emp-role"><option>Employee</option><option>Admin</option></select>
      </div>
      <button class="btn btn-primary btn-full" onclick="OrgSetup.saveEditEmployee('${name}')">Save Changes</button>
    `;
    Modal.open(`Edit Employee – ${name}`, bodyHTML);
  },

  saveEditEmployee(oldName) {
    const newName = document.getElementById('edit-emp-name').value.trim();
    const email = document.getElementById('edit-emp-email').value.trim();
    const dept = document.getElementById('edit-emp-dept').value;
    const role = document.getElementById('edit-emp-role').value;
    const currentUserRole = document.querySelector('.user-role').textContent;

    if (!newName) { showToast('Employee name is required.', 'error'); return; }

    if (role === 'Admin' && currentUserRole !== 'Admin') {
      showToast('Permission denied: Only Admins can assign the Admin role.', 'error');
      return;
    }

    const empRows = document.querySelectorAll('#tab-content-employees tbody tr');
    empRows.forEach(row => {
      if (row.cells[0].textContent === oldName) {
        row.cells[0].textContent = newName;
        row.cells[1].textContent = email;
        row.cells[2].textContent = dept;
        row.cells[3].innerHTML = `<span class="status-badge ${role === 'Admin' ? 'status-active' : 'status-inactive'}">${role}</span>`;
        row.cells[4].innerHTML = `
          <button class="action-btn" onclick="OrgSetup.editEmployee('${newName}')">Edit</button>
          <button class="action-btn action-btn-danger" onclick="OrgSetup.deleteEmployee(this)">Remove</button>
        `;
      }
    });

    const deptRows = document.querySelectorAll('#tab-content-departments tbody tr');
    deptRows.forEach(row => {
      if (row.cells[1].textContent === oldName) {
        row.cells[1].textContent = newName;
      }
    });

    document.querySelectorAll('option').forEach(opt => {
      if (opt.textContent === oldName) opt.textContent = newName;
      if (opt.value === oldName) opt.value = newName;
      if (opt.textContent.startsWith(`${oldName} – `)) {
        opt.textContent = `${newName} – ${dept}`;
      }
    });
    Modal.close();
    showToast('Employee updated successfully.', 'success');
    if (typeof Allocation !== 'undefined') Allocation.updateDropdowns();
  },

  deleteEmployee(btn) {
    const row = btn.closest('tr');
    const employeeName = row.cells[0].textContent;
    if (confirm(`Remove employee "${employeeName}"?`)) {
      row.remove();
      showToast(`Employee "${employeeName}" removed.`, 'info');
      if (typeof Allocation !== 'undefined') Allocation.updateDropdowns();
    }
  }
};

/* ── Assets ─────────────────────────────────────────────────── */
const Assets = {
  search(query) {
    const rows = document.querySelectorAll('#assets-table-body tr');
    const q = query.toLowerCase();
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  },

  filter() {
    const category = document.getElementById('asset-filter-category').value;
    const status   = document.getElementById('asset-filter-status').value;
    const dept     = document.getElementById('asset-filter-dept').value;
    const rows     = document.querySelectorAll('#assets-table-body tr');

    rows.forEach(row => {
      const rCat  = row.dataset.category || '';
      const rStat = row.dataset.status   || '';
      const rDept = row.dataset.dept     || '';

      const catOk  = !category || rCat  === category;
      const statOk = !status   || rStat === status;
      const deptOk = !dept     || rDept.includes(dept);

      row.style.display = (catOk && statOk && deptOk) ? '' : 'none';
    });
  },

  viewAsset(tag) {
    if (!window.assetDB) {
      window.assetDB = {
        'AF-0012': { serial: 'SN-DL-20221015', condition: 'Good', purchaseDate: '2022-10-15', purchaseValue: '₹75,000' },
        'AF-0062': { serial: 'SN-PJ-20211003', condition: 'Needs repair', purchaseDate: '2021-10-03', purchaseValue: '₹45,000' },
        'AF-0201': { serial: 'SN-CH-20230601', condition: 'Good', purchaseDate: '2023-06-01', purchaseValue: '₹8,500' },
        'AF-0078': { serial: 'SN-FK-20200315', condition: 'Parts ordered', purchaseDate: '2020-03-15', purchaseValue: '₹4,50,000' },
        'AF-0114': { serial: 'SN-DL-20231205', condition: 'Excellent', purchaseDate: '2023-12-05', purchaseValue: '₹80,000' },
        'AF-0003': { serial: 'SN-AC-20220801', condition: 'Good', purchaseDate: '2022-08-01', purchaseValue: '₹35,000' }
      };
    }

    let a = { name: '', category: '', status: '', location: '', assignedTo: '–' };
    const rows = document.querySelectorAll('#assets-table-body tr');
    rows.forEach(row => {
      const rowTag = row.querySelector('.tag-badge')?.textContent.trim();
      if (rowTag === tag) {
        a.name = row.cells[1].textContent.trim();
        a.category = row.cells[2].textContent.trim();
        a.status = row.querySelector('.status-badge').textContent.trim();
        a.location = row.cells[4].textContent.trim();
        a.assignedTo = row.cells[5].textContent.trim();
      }
    });

    const extra = window.assetDB[tag] || {};
    const displayData = {
      ...a,
      serial: extra.serial || 'N/A',
      condition: extra.condition || 'Unknown',
      purchaseDate: extra.purchaseDate || 'N/A',
      purchaseValue: extra.purchaseValue || 'N/A'
    };

    const statusClass = {
      'Available': 'status-available',
      'Allocated': 'status-allocated',
      'Maintenance': 'status-maintenance'
    }[displayData.status] || 'status-inactive';

    Modal.open(`Asset Details – ${tag}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Name</label><div style="color:var(--text-primary);padding:8px 0">${displayData.name}</div></div>
        <div class="form-group"><label>Tag</label><div style="padding:8px 0"><span class="tag-badge">${tag}</span></div></div>
        <div class="form-group"><label>Category</label><div style="color:var(--text-secondary);padding:8px 0">${displayData.category}</div></div>
        <div class="form-group"><label>Status</label><div style="padding:8px 0"><span class="status-badge ${statusClass}">${displayData.status}</span></div></div>
        <div class="form-group"><label>Location</label><div style="color:var(--text-secondary);padding:8px 0">${displayData.location}</div></div>
        <div class="form-group"><label>Assigned To</label><div style="color:var(--text-secondary);padding:8px 0">${displayData.assignedTo}</div></div>
        <div class="form-group"><label>Serial Number</label><div style="color:var(--text-muted);padding:8px 0;font-family:monospace;font-size:12px">${displayData.serial}</div></div>
        <div class="form-group"><label>Condition</label><div style="color:var(--text-secondary);padding:8px 0">${displayData.condition}</div></div>
        <div class="form-group"><label>Purchase Date</label><div style="color:var(--text-muted);padding:8px 0">${displayData.purchaseDate}</div></div>
        <div class="form-group"><label>Purchase Value</label><div style="color:var(--accent-green);padding:8px 0;font-weight:600">${displayData.purchaseValue}</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn btn-primary" onclick="Modal.close(); App.navigate('allocation', document.querySelector('[data-page=allocation]'))">Allocate</button>
        <button class="btn btn-primary" onclick="Modal.close(); Assets.unallocateAsset('${tag}')" style="background:var(--accent-red);border-color:var(--accent-red)">Unallocate</button>
        <button class="btn btn-outline" onclick="Modal.close()">Close</button>
      </div>
    `);
  },

  allocateAsset(tag) {
    App.navigate('allocation', document.querySelector('[data-page=allocation]'));
    const sel = document.getElementById('alloc-asset-select');
    if (sel) {
      // Pre-select based on tag
      const opts = Array.from(sel.options);
      const match = opts.find(o => o.value.startsWith(tag));
      if (match) { sel.value = match.value; Allocation.checkAsset(match.value); }
    }
    showToast(`Opening allocation form for ${tag}`, 'info');
  },

  unallocateAsset(tag) {
    const rows = document.querySelectorAll('#assets-table-body tr');
    let found = false;
    rows.forEach(row => {
      const rowTag = row.querySelector('.tag-badge')?.textContent.trim();
      if (rowTag === tag) {
        found = true;
        const statusText = row.querySelector('.status-badge').textContent.trim();
        if (statusText !== 'Allocated') {
          showToast(`Asset ${tag} is not currently allocated.`, 'info');
          return;
        }
        
        const empName = row.cells[5].textContent.trim();
        
        row.dataset.status = 'Available';
        if (row.cells[3]) row.cells[3].innerHTML = `<span class="status-badge status-available">Available</span>`;
        if (row.cells[5]) row.cells[5].textContent = '–';
        
        App.updateDashboardStats();
        
        // Update History
        const historyList = document.querySelector('.history-list');
        if (historyList) {
          const dateStr = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
          const item = document.createElement('div');
          item.className = 'history-item';
          item.innerHTML = `<div class="history-date">${dateStr}</div><div class="history-desc">${tag} returned by ${empName}</div>`;
          historyList.prepend(item);
        }
        
        showToast(`Asset ${tag} successfully unallocated.`, 'success');
      }
    });
    
    if (!found) {
      showToast(`Asset ${tag} not found.`, 'error');
    }
  },

  openRegisterModal() {
    Modal.open('Register New Asset', `
      <div class="form-group"><label>Asset Name</label><input type="text" class="form-input" id="reg-name" placeholder="e.g. Dell Laptop" /></div>
      <div class="form-row">
        <div class="form-group"><label>Category</label>
          <select class="form-input" id="reg-category">
            <option>Electronics</option><option>Furniture</option><option>Vehicles</option><option>Office Supplies</option>
          </select>
        </div>
        <div class="form-group"><label>Department</label>
          <select class="form-input" id="reg-dept">
            <option value="">None</option><option>Engineering</option><option>IT</option><option>Facilities</option><option>Field Ops</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Location</label><input type="text" class="form-input" id="reg-location" placeholder="e.g. Warehouse" /></div>
        <div class="form-group"><label>Serial Number</label><input type="text" class="form-input" id="reg-serial" placeholder="SN-XXXX" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Purchase Date</label><input type="date" class="form-input" id="reg-date" /></div>
        <div class="form-group"><label>Purchase Value (₹)</label><input type="number" class="form-input" id="reg-value" placeholder="0" /></div>
      </div>
      <div class="form-group"><label>Condition</label>
        <select class="form-input" id="reg-condition">
          <option>Excellent</option><option>Good</option><option>Fair</option><option>Needs Repair</option>
        </select>
      </div>
      <button class="btn btn-primary btn-full" onclick="Assets.saveRegistration()">Register Asset</button>
    `);
  },

  saveRegistration() {
    const name = document.getElementById('reg-name').value.trim();
    if (!name) { showToast('Asset name is required.', 'error'); return; }

    const category = document.getElementById('reg-category').value;
    const location = document.getElementById('reg-location').value || 'Warehouse';
    const tagNum = 'AF-' + String(Math.floor(Math.random() * 9000) + 1000);

    // Save extra fields
    const serial = document.getElementById('reg-serial').value || 'N/A';
    const purchaseDate = document.getElementById('reg-date').value || 'N/A';
    const purchaseValue = document.getElementById('reg-value').value ? '₹' + document.getElementById('reg-value').value : 'N/A';
    const condition = document.getElementById('reg-condition').value || 'N/A';

    if (!window.assetDB) { window.assetDB = {}; }
    window.assetDB[tagNum] = { serial, purchaseDate, purchaseValue, condition };

    const tbody = document.getElementById('assets-table-body');
    const row = document.createElement('tr');
    row.dataset.category = category;
    row.dataset.status = 'Available';
    row.dataset.dept = document.getElementById('reg-dept').value || '';
    row.innerHTML = `
      <td><span class="tag-badge">${tagNum}</span></td>
      <td>${name}</td>
      <td>${category}</td>
      <td><span class="status-badge status-available">Available</span></td>
      <td>${location}</td>
      <td>–</td>
      <td>
        <button class="action-btn" onclick="Assets.viewAsset('${tagNum}')">View</button>
        <button class="action-btn" onclick="Assets.allocateAsset('${tagNum}')">Allocate</button>
        <button class="action-btn" onclick="Assets.unallocateAsset('${tagNum}')">Unallocate</button>
      </td>
    `;
    tbody.appendChild(row);
    Modal.close();
    showToast(`Asset "${name}" registered as ${tagNum}.`, 'success');
    App.updateDashboardStats();
  }
};

/* ── Allocation ─────────────────────────────────────────────── */
const Allocation = {
  updateDropdowns() {
    // 1. Assets
    const assetSel = document.getElementById('alloc-asset-select');
    if (assetSel) {
      const currentAsset = assetSel.value;
      assetSel.innerHTML = '<option value="">Select asset...</option>';
      const assetRows = document.querySelectorAll('#assets-table-body tr');
      assetRows.forEach(row => {
        const tag = row.querySelector('.tag-badge').textContent.trim();
        const name = row.cells[1].textContent.trim();
        const status = row.querySelector('.status-badge').textContent.trim();
        const assignedTo = status === 'Allocated' ? ` (Allocated to ${row.cells[5].textContent.trim()})` : ` (${status})`;
        const valSuffix = status.toLowerCase() === 'available' ? 'free' : status.toLowerCase();
        
        const opt = document.createElement('option');
        opt.value = `${tag}-${valSuffix}`;
        opt.textContent = `${tag} – ${name}${assignedTo}`;
        assetSel.appendChild(opt);
      });
      if (currentAsset) assetSel.value = currentAsset;
    }

    // 2. Employees (Assign To & Transfer To)
    const empSel = document.getElementById('alloc-employee');
    const transSel = document.getElementById('transfer-to');
    if (empSel && transSel) {
      const currentEmp = empSel.value;
      const currentTrans = transSel.value;
      
      const empOptions = ['<option value="">Select Employee...</option>'];
      const empRows = document.querySelectorAll('#tab-content-employees tbody tr');
      empRows.forEach(row => {
        const name = row.cells[0].textContent.trim();
        const dept = row.cells[2].textContent.trim();
        empOptions.push(`<option>${name} – ${dept}</option>`);
      });
      
      const empHTML = empOptions.join('');
      empSel.innerHTML = empHTML;
      transSel.innerHTML = empHTML;
      
      if (currentEmp) empSel.value = currentEmp;
      if (currentTrans) transSel.value = currentTrans;
    }

    // 3. Locations
    const locSel = document.getElementById('alloc-location');
    if (locSel) {
      const currentLoc = locSel.value;
      const locOptions = ['<option value="">Select Location...</option>'];
      const locSet = new Set();
      
      const assetRows = document.querySelectorAll('#assets-table-body tr');
      assetRows.forEach(row => {
        const loc = row.cells[4].textContent.trim();
        if (loc && loc !== '–') locSet.add(loc);
      });
      
      locSet.forEach(loc => {
        locOptions.push(`<option>${loc}</option>`);
      });
      
      locSel.innerHTML = locOptions.join('');
      if (currentLoc) locSel.value = currentLoc;
    }
  },

  checkAsset(value) {
    const warning  = document.getElementById('allocation-warning');
    const directFm = document.getElementById('direct-allocation-form');
    const transferFm = document.getElementById('transfer-request-form');

    if (!value) {
      warning.style.display = 'none';
      directFm.style.display = 'block';
      transferFm.style.display = 'none';
      return;
    }

    if (value.includes('allocated')) {
      warning.style.display = 'flex';
      directFm.style.display = 'none';
      transferFm.style.display = 'block';
    } else {
      warning.style.display = 'none';
      directFm.style.display = 'block';
      transferFm.style.display = 'none';
    }
  },

  submitAllocation() {
    const assetSel = document.getElementById('alloc-asset-select');
    const empSel   = document.getElementById('alloc-employee');

    if (!assetSel.value) { showToast('Please select an asset.', 'error'); return; }
    if (!empSel.value)   { showToast('Please select an employee.', 'error'); return; }

    const empName = empSel.options[empSel.selectedIndex].text.split(/[-–]/)[0].trim();
    const empDept = empSel.options[empSel.selectedIndex].text.split(/[-–]/)[1]?.trim() || '';
    const assetText = assetSel.options[assetSel.selectedIndex].text.split('(')[0].trim();
    const tag = assetSel.value.split('-')[0] + '-' + assetSel.value.split('-')[1]; // safely extract AF-XXXX

    // Update asset table row status
    const rows = document.querySelectorAll('#assets-table-body tr');
    rows.forEach(row => {
      const rowTag = row.querySelector('.tag-badge')?.textContent.trim();
      if (rowTag && tag.includes(rowTag)) {
        row.dataset.status = 'Allocated';
        if (empDept) row.dataset.dept = empDept;
        if (row.cells[3]) row.cells[3].innerHTML = `<span class="status-badge status-allocated">Allocated</span>`;
        if (row.cells[5]) row.cells[5].textContent = empName;
      }
    });
    
    App.updateDashboardStats();
    showToast(`Asset allocated to ${empName} successfully.`, 'success');

    // Update History
    const historyList = document.querySelector('.history-list');
    if (historyList) {
      const dateStr = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `<div class="history-date">${dateStr}</div><div class="history-desc">${assetText} allocated to ${empName}</div>`;
      historyList.prepend(item);
    }

    assetSel.value = '';
    empSel.value = '';
    Allocation.checkAsset('');
  },

  submitTransfer() {
    const toEl  = document.getElementById('transfer-to');
    const reason = document.getElementById('transfer-reason');
    const assetSel = document.getElementById('alloc-asset-select');

    if (!toEl.value)     { showToast('Please select a recipient.', 'error'); return; }
    if (!reason.value.trim()) { showToast('Please provide a transfer reason.', 'error'); return; }

    const empName = toEl.options[toEl.selectedIndex].text.split(/[-–]/)[0].trim();
    const assetText = assetSel.options[assetSel.selectedIndex].text.split('(')[0].trim();
    showToast(`Transfer request submitted successfully. Pending approval.`, 'success');

    // Update History
    const historyList = document.querySelector('.history-list');
    if (historyList) {
      const dateStr = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `<div class="history-date">${dateStr}</div><div class="history-desc">${assetText} transfer requested to ${empName}</div>`;
      historyList.prepend(item);
    }

    document.getElementById('alloc-asset-select').value = '';
    reason.value = '';
    Allocation.checkAsset('');
  }
};

/* ── Booking ─────────────────────────────────────────────────── */
const Booking = {
  selectedSlot: null,

  loadTimeline(resource) {
    showToast(`Loaded timeline for ${document.getElementById('booking-resource').selectedOptions[0].text}`, 'info');
  },

  selectSlot(el, from, to) {
    // Deselect previously selected
    document.querySelectorAll('.selected-slot').forEach(s => {
      s.classList.remove('selected-slot');
      s.classList.add('available-slot');
      s.textContent = `Click to book ${s.dataset.from} – ${s.dataset.to}`;
    });

    el.dataset.from = from;
    el.dataset.to   = to;
    el.classList.remove('available-slot');
    el.classList.add('selected-slot');
    el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg> Selected: ${from} – ${to}`;
    this.selectedSlot = { from, to };
  },

  openBookModal() {
    const resource = document.getElementById('booking-resource');
    const resourceName = resource.selectedOptions[0]?.text || 'Resource';

    Modal.open('Book a Slot', `
      <div class="form-group"><label>Resource</label>
        <div style="color:var(--text-primary);font-weight:600;padding:8px 0">${resourceName}</div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Start Time</label>
          <select class="form-input" id="book-start">
            <option>9:00 AM</option><option>10:00 AM</option><option>11:00 AM</option><option selected>12:00 PM</option>
            <option>1:00 PM</option><option>2:00 PM</option><option>3:00 PM</option><option>4:00 PM</option>
          </select>
        </div>
        <div class="form-group"><label>End Time</label>
          <select class="form-input" id="book-end">
            <option>10:00 AM</option><option>11:00 AM</option><option>12:00 PM</option><option selected>1:00 PM</option>
            <option>2:00 PM</option><option>3:00 PM</option><option>4:00 PM</option><option>5:00 PM</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Booked By / Team</label>
        <input type="text" class="form-input" id="book-team" placeholder="e.g. Engineering Team" />
      </div>
      <div class="form-group"><label>Purpose</label>
        <textarea class="form-input form-textarea" id="book-purpose" placeholder="Brief description..." style="min-height:80px"></textarea>
      </div>
      <div id="book-conflict-warning" class="alert-banner alert-warning" style="display:none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        Conflict detected with existing booking (9:00–10:00 AM). Choose a different slot.
      </div>
      <button class="btn btn-primary btn-full" onclick="Booking.confirmBooking()">Confirm Booking</button>
    `);
  },

  confirmBooking() {
    const start = document.getElementById('book-start')?.value;
    const team  = document.getElementById('book-team')?.value.trim();

    // Check for fake conflict with 9 AM slot
    if (start === '9:00 AM') {
      const warn = document.getElementById('book-conflict-warning');
      if (warn) { warn.style.display = 'flex'; return; }
    }

    Modal.close();
    showToast(`Booking confirmed for ${start}!`, 'success');

    // Add new block to timeline
    const slots = document.querySelectorAll('.available-slot');
    if (slots.length > 0) {
      const slot = slots[0];
      slot.classList.remove('available-slot');
      slot.classList.add('booked');
      slot.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Booked – ${team || 'Your Team'} – ${start}`;
    }
  }
};

/* ── Maintenance ─────────────────────────────────────────────── */
const Maintenance = {
  draggedCard: null,

  drag(event) {
    this.draggedCard = event.target.closest('.kanban-card');
    event.target.closest('.kanban-card').style.opacity = '0.5';
    event.dataTransfer.effectAllowed = 'move';
  },

  allowDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
  },

  drop(event, colId) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    if (this.draggedCard) {
      const targetCards = document.getElementById(`cards-${colId}`);
      this.draggedCard.style.opacity = '';
      targetCards.appendChild(this.draggedCard);
      Maintenance.updateCounts();
      showToast(`Card moved to ${colId.charAt(0).toUpperCase() + colId.slice(1)}`, 'info');
    }
    this.draggedCard = null;
  },

  updateCounts() {
    ['pending','approved','assigned','inprogress','resolved'].forEach(col => {
      const cards = document.querySelectorAll(`#cards-${col} .kanban-card`).length;
      const counter = document.getElementById(`count-${col}`);
      if (counter) counter.textContent = cards;
    });
  },

  approveCard(btn, id) {
    const card = btn.closest('.kanban-card');
    const approvedCol = document.getElementById('cards-approved');
    approvedCol.appendChild(card);
    card.querySelector('.card-actions').innerHTML = `<button class="btn btn-xs btn-outline" onclick="Maintenance.assignTech(this)">Assign Tech</button>`;
    card.querySelector('.card-meta').textContent = 'Approved: ' + new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    Maintenance.updateCounts();
    showToast(`Ticket ${id} approved – asset marked as "Under Maintenance".`, 'success');
  },

  assignTech(btn) {
    const card = btn.closest('.kanban-card');
    const id   = card.dataset.id;
    Modal.open(`Assign Technician – ${id}`, `
      <div class="form-group"><label>Technician</label>
        <select class="form-input" id="tech-select">
          <option>R. Varma</option><option>S. Kumar</option><option>M. Patel</option><option>A. Sharma</option>
        </select>
      </div>
      <div class="form-group"><label>Estimated Completion</label>
        <input type="date" class="form-input" />
      </div>
      <button class="btn btn-primary btn-full" onclick="Maintenance.confirmAssign('${id}')">Assign</button>
    `);
  },

  confirmAssign(id) {
    const tech = document.getElementById('tech-select').value;
    const card = document.querySelector(`.kanban-card[data-id="${id}"]`);
    if (card) {
      document.getElementById('cards-assigned').appendChild(card);
      card.querySelector('.card-title').textContent += ` – tech: ${tech}`;
      card.querySelector('.card-meta').textContent = 'Assigned: ' + new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      card.querySelector('.card-actions').innerHTML = `<button class="btn btn-xs btn-outline" onclick="Maintenance.markInProgress(this)">Start Work</button>`;
      Maintenance.updateCounts();
    }
    Modal.close();
    showToast(`Technician ${tech} assigned to ${id}.`, 'success');
  },

  markInProgress(btn) {
    const card = btn.closest('.kanban-card');
    document.getElementById('cards-inprogress').appendChild(card);
    card.querySelector('.card-actions').innerHTML = `<button class="btn btn-xs btn-primary" onclick="Maintenance.resolveCard(this)">Resolve</button>`;
    Maintenance.updateCounts();
    showToast('Maintenance work started.', 'info');
  },

  resolveCard(btn) {
    const card = btn.closest('.kanban-card');
    document.getElementById('cards-resolved').appendChild(card);
    card.classList.add('card-resolved');
    card.querySelector('.card-meta').textContent = 'Resolved: ' + new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    card.querySelector('.card-actions').innerHTML = '';

    // Update asset table back to Available
    const tag = card.dataset.id;
    const rows = document.querySelectorAll('#assets-table-body tr');
    rows.forEach(row => {
      const rowTag = row.querySelector('.tag-badge')?.textContent.trim();
      if (rowTag === tag) {
        row.dataset.status = 'Available';
        if (row.cells[3]) row.cells[3].innerHTML = `<span class="status-badge status-available">Available</span>`;
      }
    });

    Maintenance.updateCounts();
    App.updateDashboardStats();
    showToast('Ticket resolved – asset status returned to "Available".', 'success');
  },

  openTicketModal() {
    Modal.open('New Maintenance Ticket', `
      <div class="form-group"><label>Asset</label>
        <select class="form-input" id="ticket-asset">
          <option>AF-0012 – Dell Laptop</option>
          <option>AF-0062 – Projector</option>
          <option>AF-0201 – Office Chair</option>
          <option>AF-0078 – Forklift</option>
          <option>AF-0114 – Dell Laptop</option>
        </select>
      </div>
      <div class="form-group"><label>Issue Description</label>
        <textarea class="form-input form-textarea" id="ticket-desc" placeholder="Describe the issue in detail..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Priority</label>
          <select class="form-input" id="ticket-priority">
            <option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option>
          </select>
        </div>
        <div class="form-group"><label>Category</label>
          <select class="form-input">
            <option>Electrical</option><option>Mechanical</option><option>Software</option><option>Physical Damage</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary btn-full" onclick="Maintenance.saveTicket()">Submit Ticket</button>
    `);
  },

  saveTicket() {
    const asset = document.getElementById('ticket-asset').value;
    const desc  = document.getElementById('ticket-desc').value.trim();
    if (!desc) { showToast('Please describe the issue.', 'error'); return; }

    const tag = asset.split(' – ')[0];
    const shortDesc = desc.length > 30 ? desc.substring(0, 30) + '...' : desc;

    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.id = tag;
    card.setAttribute('ondragstart', 'Maintenance.drag(event)');
    card.innerHTML = `
      <div class="card-tag">${tag}</div>
      <div class="card-title">${shortDesc}</div>
      <div class="card-meta">Reported: ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
      <div class="card-actions">
        <button class="btn btn-xs btn-primary" onclick="Maintenance.approveCard(this, '${tag}')">Approve</button>
      </div>
    `;
    document.getElementById('cards-pending').appendChild(card);
    Maintenance.updateCounts();
    Modal.close();
    showToast(`Maintenance ticket for ${asset} submitted.`, 'success');
  }
};

/* ── Audit (Screen 8) ────────────────────────────────────────── */
const Audit = {
  /* Cycle through statuses by clicking the pill (wireframe interaction) */
  cycleStatus(span) {
    const order  = ['audit-pending', 'audit-verified', 'audit-missing', 'audit-damaged'];
    const labels = { 'audit-pending': 'Pending', 'audit-verified': 'Verified', 'audit-missing': 'Missing', 'audit-damaged': 'Damaged' };
    const current = order.find(c => span.classList.contains(c)) || 'audit-pending';
    const next    = order[(order.indexOf(current) + 1) % order.length];

    span.classList.remove(...order);
    span.classList.add(next);
    span.textContent = labels[next];

    Audit.updateDiscrepancyBanner();
    const assetName = span.closest('tr').cells[0].textContent.trim();
    showToast(`${assetName} marked as ${labels[next]}.`, next === 'audit-verified' ? 'success' : next === 'audit-pending' ? 'info' : 'error');
  },

  setStatus(btn, newStatus) {
    const row        = btn.closest('tr');
    const statusCell = row.cells[2];
    const statusSpan = statusCell.querySelector('.audit-status');

    // Remove old classes
    statusSpan.classList.remove('audit-verified', 'audit-missing', 'audit-damaged', 'audit-pending');

    const map = {
      verified: { cls: 'audit-verified', label: 'Verified' },
      missing:  { cls: 'audit-missing',  label: 'Missing'  },
      damaged:  { cls: 'audit-damaged',  label: 'Damaged'  },
    };

    const def = map[newStatus];
    statusSpan.classList.add(def.cls);
    statusSpan.textContent = def.label;

    Audit.updateDiscrepancyBanner();
    showToast(`${row.cells[0].textContent.trim()} marked as ${def.label}.`, newStatus === 'verified' ? 'success' : 'error');
  },

  updateDiscrepancyBanner() {
    const rows   = document.querySelectorAll('#audit-checklist-body tr');
    let flagged  = 0;
    rows.forEach(r => {
      const s = r.querySelector('.audit-status');
      if (s && (s.classList.contains('audit-missing') || s.classList.contains('audit-damaged'))) flagged++;
    });

    const banner = document.getElementById('audit-discrepancy-banner');
    const text   = document.getElementById('audit-discrepancy-text');
    if (banner && text) {
      if (flagged > 0) {
        banner.style.display = 'flex';
        text.textContent = `${flagged} asset${flagged > 1 ? 's' : ''} flagged – discrepancy report generated automatically`;
      } else {
        banner.style.display = 'none';
      }
    }
  },

  closeCycle() {
    const rows   = document.querySelectorAll('#audit-checklist-body tr');
    let pending  = 0;
    rows.forEach(r => {
      if (r.querySelector('.audit-pending')) pending++;
    });

    if (pending > 0) {
      showToast(`${pending} asset(s) still pending verification. Please verify all before closing.`, 'error');
      return;
    }

    Modal.open('Close Audit Cycle', `
      <p style="color:var(--text-secondary);margin-bottom:var(--gap-md)">
        Are you sure you want to close the <strong style="color:var(--text-primary)">Q3 Audit – Engineering dept</strong>?
        A final discrepancy report will be generated and emailed to auditors.
      </p>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" onclick="Audit.confirmClose()">Close Cycle</button>
        <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
      </div>
    `);
  },

  confirmClose() {
    Modal.close();
    showToast('Audit cycle closed. Discrepancy report sent to auditors.', 'success');
    document.querySelector('.audit-cycle-banner')?.remove();
  },

  newCycle() {
    Modal.open('New Audit Cycle', `
      <div class="form-group"><label>Department</label>
        <select class="form-input" id="new-cycle-dept">
          <option>Engineering</option><option>IT</option><option>Facilities</option><option>Field Ops</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Start Date</label><input type="date" class="form-input" id="new-cycle-start" /></div>
        <div class="form-group"><label>End Date</label><input type="date" class="form-input" id="new-cycle-end" /></div>
      </div>
      <div class="form-group"><label>Auditors (comma separated)</label>
        <input type="text" class="form-input" id="new-cycle-auditors" placeholder="A. Rao, S. Iqbal" />
      </div>
      <button class="btn btn-primary btn-full" onclick="Audit.createCycle()">Create Audit Cycle</button>
    `);
  },

  createCycle() {
    const dept     = document.getElementById('new-cycle-dept')?.value;
    const auditors = document.getElementById('new-cycle-auditors')?.value.trim();
    Modal.close();
    showToast(`Audit cycle created for ${dept}.`, 'success');
  },

  exportLog() {
    const rows = document.querySelectorAll('#audit-checklist-body tr');
    let csv = 'Asset Tag,Name,Expected Location,Verification\n';
    rows.forEach(row => {
      const tag      = row.querySelector('.tag-badge')?.textContent?.trim() || '';
      const name     = row.cells[0].textContent.replace(tag, '').trim();
      const location = row.cells[1].textContent.trim();
      const status   = row.cells[2].textContent.trim();
      csv += `"${tag}","${name}","${location}","${status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `assetflow-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Audit report exported as CSV.', 'success');
  }
};

/* ── Reports (Screen 9) ──────────────────────────────────────── */
const Reports = {
  exportReport() {
    const data = [
      'AssetFlow Reports – ' + new Date().toLocaleDateString('en-IN'),
      '',
      'MOST USED ASSETS',
      'Room B2, 34 bookings this month',
      'Van AF-343, 21 trips this month',
      'Projector AF-335, 18 uses',
      '',
      'IDLE ASSETS',
      'Camera AF-0301, unused 60+ days',
      'Chair AF-0470, unused 45 days',
      '',
      'DUE FOR MAINTENANCE / RETIREMENT',
      'Forklift AF-0087, service due in 5 days',
      'Laptop AF-0020, 4 years old – nearing retirement',
    ].join('\n');

    const blob = new Blob([data], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `assetflow-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report exported successfully.', 'success');
  }
};

/* ── Notifications / Activity Log (Screen 10) ────────────────── */
const Notifications = {
  filterTab(type, btn) {
    // Update active tab
    document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    // Show/hide rows
    const rows = document.querySelectorAll('.activity-log-row');
    rows.forEach(row => {
      const rType = row.dataset.type || 'all';
      if (type === 'all' || rType === type) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  },

  markAllRead() {
    document.querySelectorAll('.activity-log-row').forEach(r => r.classList.add('read'));
    const badge = document.querySelector('.nav-item[data-page="notifications"] .badge');
    if (badge) badge.remove();
    showToast('All notifications marked as read.', 'success');
  },

  dismiss(id) {
    const el = document.getElementById(id);
    if (el) {
      el.style.opacity = '0';
      el.style.transition = '0.2s ease';
      setTimeout(() => el.remove(), 200);
      const badge = document.querySelector('.nav-item[data-page="notifications"] .badge');
      if (badge) {
        const count = parseInt(badge.textContent) - 1;
        if (count <= 0) badge.remove();
        else badge.textContent = count;
      }
    }
  }
};

/* ── Keyboard Shortcuts ─────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') Modal.close();
});

/* ── Init ───────────────────────────────────────────────────── */
// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  App.initTheme();
  App.updateDate();
  App.updateDashboardStats();
  
  // Set default state on the login screen too
  App.updateDate();

  // Add drag-leave handlers to kanban cols
  document.querySelectorAll('.kanban-col').forEach(col => {
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove('drag-over');
      }
    });
  });

  // Demo: allow pressing Enter on login to sign in
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') App.login();
  });
  document.getElementById('login-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') App.login();
  });
});
