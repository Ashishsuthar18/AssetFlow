// ============================================================
// js/views/orgSetup.js — Wireframe Screen 3 (Admin only)
// Tabs: Departments | Categories | Employees | + Add
// ============================================================
function renderOrgSetup(container) {
  const user = Auth.getCurrentUser();
  let activeTab = 'departments';

  function render() {
    if (!RBAC.can(user,'*') && user.role !== 'Admin') {
      container.innerHTML = `<div class="access-denied"><i data-lucide="lock"></i><h3>Admin Only</h3><p>Organization Setup is restricted to administrators.</p></div>`;
      lucide.createIcons(); return;
    }

    const depts = DB.departments.getAll();
    const cats  = DB.assetCategories.getAll();
    const users = DB.users.getAll();

    container.innerHTML = `
    <div class="o-view-header">
      <div>
        <div class="o-view-title">Organization Setup</div>
        <div class="o-view-sub">Manage departments, asset categories, and user roles. Changes here drive picklists across all modules.</div>
      </div>
    </div>

    <div class="view-body">
      <!-- Tabs matching wireframe Screen 3: Departments | Categories | Employee | + Add -->
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
        <button class="org-tab ${activeTab==='departments'?'active':''}" id="org-tab-dept">Departments</button>
        <button class="org-tab ${activeTab==='categories'?'active':''}" id="org-tab-cats">Categories</button>
        <button class="org-tab ${activeTab==='users'?'active':''}" id="org-tab-users">Employees</button>
        <div style="flex:1"></div>
        <button class="btn btn-primary btn-sm" id="btn-org-add"><i data-lucide="plus"></i> + Add</button>
      </div>

      <!-- Note from wireframe -->
      <div class="alert alert-info" style="margin-bottom:12px">
        <i data-lucide="info"></i>
        <span>Editing a department here also drives the picklist in Asset Allocations and Bookings.</span>
      </div>

      ${activeTab==='departments' ? renderDepts(depts) : activeTab==='categories' ? renderCats(cats) : renderUsers(users)}
    </div>`;

    lucide.createIcons();

    // Tab events
    document.getElementById('org-tab-dept')?.addEventListener('click', () => { activeTab='departments'; render(); });
    document.getElementById('org-tab-cats')?.addEventListener('click', () => { activeTab='categories'; render(); });
    document.getElementById('org-tab-users')?.addEventListener('click', () => { activeTab='users'; render(); });
    document.getElementById('btn-org-add')?.addEventListener('click', () => {
      if (activeTab==='departments') _addDept();
      else if (activeTab==='categories') _addCat();
      else _addUser();
    });

    // Edit / delete row actions
    document.querySelectorAll('.org-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.type, id = parseInt(btn.dataset.id);
        if (t==='dept') _editDept(id);
        else if (t==='cat') _editCat(id);
        else _editUser(id);
      });
    });
    document.querySelectorAll('.org-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.type, id = parseInt(btn.dataset.id);
        if (confirm('Are you sure you want to delete this record?')) {
          if (t==='dept') DB.departments.delete(id);
          else if (t==='cat') DB.assetCategories.delete(id);
          else DB.users.update(id, { is_active:false });
          App.toast('Deleted.','info'); render();
        }
      });
    });

    // Role elevation
    document.querySelectorAll('.org-role-btn').forEach(btn => {
      btn.addEventListener('click', () => _changeRole(parseInt(btn.dataset.id)));
    });
  }

  // ── DEPARTMENTS TABLE (wireframe: Department | Head | Parent Dept | Status) ─────
  function renderDepts(depts) {
    return `
    <div class="card">
      <div class="table-wrap"><table class="o-table">
        <thead><tr><th>Department</th><th>Head</th><th>Parent Dept</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${depts.length ? depts.map(d => {
          const head   = DB.users.getById(d.head_user_id);
          const parent = DB.departments.getById(d.parent_department_id);
          const isActive = d.is_active !== false;
          return `<tr>
            <td style="font-weight:700">${escHtml(d.name)}</td>
            <td style="font-size:0.82rem">${head ? `<div class="user-chip-xs"><div class="avatar-xs">${head.name[0]}</div>${escHtml(head.name)}</div>` : '<span style="color:var(--text-muted)">—</span>'}</td>
            <td style="font-size:0.8rem;color:var(--text-secondary)">${parent ? escHtml(parent.name) : '—'}</td>
            <td>${badge(isActive ? 'Available' : 'Retired')}</td>
            <td><div class="action-btns">
              <button class="btn btn-xs btn-ghost org-edit-btn" data-type="dept" data-id="${d.id}"><i data-lucide="pencil"></i></button>
              <button class="btn btn-xs btn-ghost org-delete-btn" data-type="dept" data-id="${d.id}"><i data-lucide="trash-2"></i></button>
            </div></td>
          </tr>`;
        }).join('') : `<tr><td colspan="5"><div class="empty-state" style="padding:30px"><i data-lucide="building-2"></i><p>No departments yet.</p></div></td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  }

  // ── CATEGORIES ────────────────────────────────────────────
  function renderCats(cats) {
    return `
    <div class="card">
      <div class="table-wrap"><table class="o-table">
        <thead><tr><th>Category</th><th>Icon</th><th>Assets Count</th><th>Custom Attrs</th><th>Actions</th></tr></thead>
        <tbody>${cats.length ? cats.map(c => {
          const count = DB.assets.where(a=>a.category_id===c.id).length;
          return `<tr>
            <td style="font-weight:600">${escHtml(c.name)}</td>
            <td style="font-size:1.1rem">${c.icon||'📦'}</td>
            <td>${count}</td>
            <td style="font-size:0.78rem;color:var(--text-muted)">${c.custom_attributes ? JSON.stringify(c.custom_attributes).substring(0,40) : '—'}</td>
            <td><div class="action-btns">
              <button class="btn btn-xs btn-ghost org-edit-btn" data-type="cat" data-id="${c.id}"><i data-lucide="pencil"></i></button>
              <button class="btn btn-xs btn-ghost org-delete-btn" data-type="cat" data-id="${c.id}"><i data-lucide="trash-2"></i></button>
            </div></td>
          </tr>`;
        }).join('') : `<tr><td colspan="5"><div class="empty-state" style="padding:30px"><i data-lucide="tag"></i><p>No categories yet.</p></div></td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  }

  // ── EMPLOYEES TABLE (wireframe: Name | Email | Role | Dept | Status) ──────────
  function renderUsers(users) {
    return `
    <div class="card">
      <div class="filter-bar">
        <div class="search-wrap">
          <i data-lucide="search"></i>
          <input class="input search-input" type="text" id="user-search" placeholder="Search name or email…">
        </div>
      </div>
      <div class="table-wrap"><table class="o-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="users-tbody">${renderUserRows(users)}</tbody>
      </table></div>
    </div>`;
  }

  function renderUserRows(users) {
    return users.map(u => {
      const dept = DB.departments.getById(u.department_id);
      const ri   = RBAC.roleInfo(u.role);
      return `<tr>
        <td><div class="user-chip"><div class="avatar-xs">${u.name[0]}</div><strong>${escHtml(u.name)}</strong></div></td>
        <td style="font-size:0.8rem;color:var(--text-secondary)">${escHtml(u.email)}</td>
        <td><span class="badge" style="background:${ri.bg};color:${ri.color}">${escHtml(ri.label)}</span></td>
        <td style="font-size:0.8rem;color:var(--text-muted)">${escHtml(dept?.name||'—')}</td>
        <td>${badge(u.is_active?'Active':'Retired')}</td>
        <td><div class="action-btns">
          <button class="btn btn-xs btn-ghost org-edit-btn" data-type="user" data-id="${u.id}" title="Edit"><i data-lucide="pencil"></i></button>
          <button class="btn btn-xs btn-secondary org-role-btn" data-id="${u.id}" title="Change Role"><i data-lucide="shield"></i></button>
        </div></td>
      </tr>`;
    }).join('') || `<tr><td colspan="6"><div class="empty-state" style="padding:30px"><i data-lucide="users"></i><p>No employees.</p></div></td></tr>`;
  }

  // ── DEPT CRUD ─────────────────────────────────────────────
  function _addDept() {
    const depts = DB.departments.getAll();
    const users = DB.users.where(u => u.is_active);
    showModal(
      `<i data-lucide="building-2"></i> Add Department`,
      `<div class="form-stack">
        <div class="form-group"><label class="form-label required">Department Name</label><input class="input" id="d-name" required></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Department Head</label>
            <select class="input" id="d-head"><option value="">— Select —</option>${users.map(u=>`<option value="${u.id}">${escHtml(u.name)}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Parent Department</label>
            <select class="input" id="d-parent"><option value="">None (Top-level)</option>${depts.map(d=>`<option value="${d.id}">${escHtml(d.name)}</option>`).join('')}</select>
          </div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-create"><i data-lucide="save"></i> Create</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-create')?.addEventListener('click', () => {
      const name = document.getElementById('d-name')?.value?.trim();
      if (!name) { App.toast('Name required.','error'); return; }
      DB.departments.create({ name, head_user_id:parseInt(document.getElementById('d-head')?.value)||null, parent_department_id:parseInt(document.getElementById('d-parent')?.value)||null, is_active:true });
      App.toast('Department created!','success'); closeModal(); render();
    });
  }

  function _editDept(id) {
    const d = DB.departments.getById(id);
    const depts = DB.departments.getAll().filter(dep => dep.id !== id);
    const users = DB.users.where(u => u.is_active);
    showModal(
      `<i data-lucide="pencil"></i> Edit Department`,
      `<div class="form-stack">
        <div class="form-group"><label class="form-label required">Name</label><input class="input" id="d-name" value="${escHtml(d.name)}" required></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Head</label>
            <select class="input" id="d-head"><option value="">None</option>${users.map(u=>`<option value="${u.id}" ${u.id===d.head_user_id?'selected':''}>${escHtml(u.name)}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Parent</label>
            <select class="input" id="d-parent"><option value="">None</option>${depts.map(dep=>`<option value="${dep.id}" ${dep.id===d.parent_department_id?'selected':''}>${escHtml(dep.name)}</option>`).join('')}</select>
          </div>
        </div>
        <label class="checkbox-label"><input type="checkbox" id="d-active" ${d.is_active!==false?'checked':''}> Active</label>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-save"><i data-lucide="save"></i> Save</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-save')?.addEventListener('click', () => {
      DB.departments.update(id, { name:document.getElementById('d-name')?.value, head_user_id:parseInt(document.getElementById('d-head')?.value)||null, parent_department_id:parseInt(document.getElementById('d-parent')?.value)||null, is_active:document.getElementById('d-active')?.checked });
      App.toast('Department updated!','success'); closeModal(); render();
    });
  }

  // ── CATEGORY CRUD ─────────────────────────────────────────
  function _addCat() {
    showModal(
      `<i data-lucide="tag"></i> Add Category`,
      `<div class="form-stack">
        <div class="form-group"><label class="form-label required">Category Name</label><input class="input" id="c-name" required></div>
        <div class="form-group"><label class="form-label">Icon (emoji)</label><input class="input" id="c-icon" placeholder="📦" maxlength="4"></div>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-create"><i data-lucide="save"></i> Create</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-create')?.addEventListener('click', () => {
      const name = document.getElementById('c-name')?.value?.trim();
      if (!name) { App.toast('Name required.','error'); return; }
      DB.assetCategories.create({ name, icon:document.getElementById('c-icon')?.value||'📦', custom_attributes:null });
      App.toast('Category created!','success'); closeModal(); render();
    });
  }

  function _editCat(id) {
    const c = DB.assetCategories.getById(id);
    showModal(
      `<i data-lucide="pencil"></i> Edit Category`,
      `<div class="form-stack">
        <div class="form-group"><label class="form-label required">Name</label><input class="input" id="c-name" value="${escHtml(c.name)}" required></div>
        <div class="form-group"><label class="form-label">Icon</label><input class="input" id="c-icon" value="${c.icon||'📦'}" maxlength="4"></div>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-save"><i data-lucide="save"></i> Save</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-save')?.addEventListener('click', () => {
      DB.assetCategories.update(id, { name:document.getElementById('c-name')?.value, icon:document.getElementById('c-icon')?.value||'📦' });
      App.toast('Category updated!','success'); closeModal(); render();
    });
  }

  // ── USER CRUD ─────────────────────────────────────────────
  function _addUser() {
    const depts = DB.departments.getAll();
    showModal(
      `<i data-lucide="user-plus"></i> Add Employee`,
      `<div class="form-stack">
        <div class="form-row">
          <div class="form-group"><label class="form-label required">Full Name</label><input class="input" id="u-name" required></div>
          <div class="form-group"><label class="form-label required">Email</label><input class="input" type="email" id="u-email" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label required">Role</label>
            <select class="input" id="u-role">
              ${['Admin','AssetManager','DeptHead','Employee'].map(r=>`<option value="${r}" ${r==='Employee'?'selected':''}>${r}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Department</label>
            <select class="input" id="u-dept"><option value="">— None —</option>${depts.map(d=>`<option value="${d.id}">${escHtml(d.name)}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-group"><label class="form-label required">Initial Password</label><input class="input" type="password" id="u-pass" placeholder="Min 6 chars" required></div>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-create"><i data-lucide="save"></i> Create</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-create')?.addEventListener('click', () => {
      const name=document.getElementById('u-name')?.value?.trim(), email=document.getElementById('u-email')?.value?.trim(), pass=document.getElementById('u-pass')?.value;
      if (!name||!email||!pass||pass.length<6) { App.toast('All fields required (min 6-char password).','error'); return; }
      if (DB.users.getByEmail(email)) { App.toast('Email already registered.','error'); return; }
      DB.users.create({ name, email, password:pass, role:document.getElementById('u-role')?.value||'Employee', department_id:parseInt(document.getElementById('u-dept')?.value)||null, is_active:true });
      App.toast('Employee created!','success'); closeModal(); render();
    });
  }

  function _editUser(id) {
    const u = DB.users.getById(id);
    const depts = DB.departments.getAll();
    showModal(
      `<i data-lucide="pencil"></i> Edit Employee — ${escHtml(u.name)}`,
      `<div class="form-stack">
        <div class="form-row">
          <div class="form-group"><label class="form-label required">Name</label><input class="input" id="u-name" value="${escHtml(u.name)}"></div>
          <div class="form-group"><label class="form-label required">Email</label><input class="input" type="email" id="u-email" value="${escHtml(u.email)}"></div>
        </div>
        <div class="form-group"><label class="form-label">Department</label>
          <select class="input" id="u-dept"><option value="">None</option>${depts.map(d=>`<option value="${d.id}" ${d.id===u.department_id?'selected':''}>${escHtml(d.name)}</option>`).join('')}</select>
        </div>
        <label class="checkbox-label"><input type="checkbox" id="u-active" ${u.is_active!==false?'checked':''}> Active</label>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-save"><i data-lucide="save"></i> Save</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-save')?.addEventListener('click', () => {
      DB.users.update(id, { name:document.getElementById('u-name')?.value, email:document.getElementById('u-email')?.value, department_id:parseInt(document.getElementById('u-dept')?.value)||null, is_active:document.getElementById('u-active')?.checked });
      App.toast('Employee updated!','success'); closeModal(); render();
    });
  }

  function _changeRole(id) {
    const u = DB.users.getById(id);
    showModal(
      `<i data-lucide="shield"></i> Change Role — ${escHtml(u.name)}`,
      `<div class="form-group"><label class="form-label required">New Role</label>
        <select class="input" id="new-role">
          ${['Admin','AssetManager','DeptHead','Employee'].map(r=>`<option value="${r}" ${r===u.role?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="alert alert-warning" style="margin-top:12px"><i data-lucide="alert-triangle"></i> Changing role immediately affects this user's access and navigation.</div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-save-role"><i data-lucide="shield"></i> Update Role</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-save-role')?.addEventListener('click', () => {
      const role = document.getElementById('new-role')?.value;
      DB.users.update(id, { role });
      Engine._log(user, `Role Changed: ${u.name} → ${role}`);
      App.toast(`${u.name} is now ${role}.`,'success'); closeModal(); render();
    });
  }

  render();
}
