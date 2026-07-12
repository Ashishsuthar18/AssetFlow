// ============================================================
// js/views/maintenance.js — Wireframe Screen 7
// 5-column Kanban: Pending | Approved | Technician Assigned | In Progress | Resolved
// All events via addEventListener
// ============================================================
function renderMaintenance(container) {
  const user = Auth.getCurrentUser();

  function render() {
    const requests  = DB.maintenanceRequests.getAll();
    const users     = DB.users.getAll();
    const canApprove = RBAC.can(user,'maintenance:approve');
    const canCreate  = RBAC.can(user,'maintenance:create');

    const cols = [
      { id:'Pending',           label:'Pending',            color:'var(--yellow)', bg:'var(--yellow-bg)' },
      { id:'Approved',          label:'Approved',           color:'var(--blue)',   bg:'var(--blue-bg)'   },
      { id:'Technician Assigned', label:'Technician Assigned', color:'var(--purple)', bg:'var(--purple-bg)' },
      { id:'In Progress',       label:'In Progress',        color:'var(--orange)', bg:'var(--orange-bg)' },
      { id:'Resolved',          label:'Resolved',           color:'var(--green)',  bg:'var(--green-bg)'  },
    ];

    container.innerHTML = `
    <div class="o-view-header">
      <div>
        <div class="o-view-title">Maintenance Management</div>
        <div class="o-view-sub">Approval workflow as Kanban board. Approving sends to maintenance; resolving returns to Available.</div>
      </div>
      <div class="o-view-actions">
        ${canCreate ? `<button class="btn btn-primary btn-sm" id="btn-new-maint"><i data-lucide="plus"></i> New Request</button>` : ''}
        <button class="btn btn-secondary btn-sm" id="btn-maint-tab"><i data-lucide="list"></i> List View</button>
      </div>
    </div>

    <div class="view-body">
      <!-- Footer rule (wireframe) -->
      <div class="alert alert-info" style="margin-bottom:12px">
        <i data-lucide="info"></i>
        <span>Approving a card moves the asset to <strong>Under Maintenance</strong>; resolving returns it to <strong>Available</strong>.</span>
      </div>

      <!-- 5-Column Kanban (wireframe Screen 7) -->
      <div class="kanban-board">
        ${cols.map(col => {
          const cards = requests.filter(r => r.status === col.id);
          return `
          <div class="kanban-col kanban-col-${col.id.toLowerCase().replace(/\s+/g,'')}">
            <div class="kanban-col-header" style="border-top-color:${col.color}">
              <span>${col.label}</span>
              <span class="kanban-col-count" style="background:${col.bg};color:${col.color}">${cards.length}</span>
            </div>
            <div class="kanban-cards">
              ${cards.length ? cards.map(req => renderCard(req, col, canApprove, users)).join('') :
                `<div class="kanban-empty"><i data-lucide="inbox"></i><span>None</span></div>`}
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Rejected: separate row at bottom -->
      ${(() => {
        const rejected = requests.filter(r => r.status==='Rejected');
        if (!rejected.length) return '';
        return `<div class="card" style="margin-top:12px">
          <div class="card-header"><div class="card-title" style="color:var(--red)"><i data-lucide="x-circle"></i> Rejected Requests (${rejected.length})</div></div>
          <div class="table-wrap"><table class="o-table">
            <thead><tr><th>Asset</th><th>Issue</th><th>Reported By</th><th>Priority</th><th>Date</th></tr></thead>
            <tbody>${rejected.map(r=>{
              const a=DB.assets.getById(r.asset_id),who=DB.users.getById(r.reported_by);
              return `<tr><td>${escHtml(a?.name||'—')} <span class="tag-chip">${escHtml(a?.asset_tag||'')}</span></td>
                <td style="font-size:0.8rem;color:var(--text-secondary);max-width:160px">${escHtml(r.issue_description||'—')}</td>
                <td style="font-size:0.8rem">${escHtml(who?.name||'—')}</td>
                <td>${badge(r.priority||'Medium')}</td>
                <td style="font-size:0.78rem;color:var(--text-muted)">${fmtDate(r.createdAt)}</td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>
        </div>`;
      })()}
    </div>`;

    lucide.createIcons();

    // New request
    document.getElementById('btn-new-maint')?.addEventListener('click', _newMaint);
    document.getElementById('btn-maint-tab')?.addEventListener('click', _showListView);

    // Card action buttons
    document.querySelectorAll('.maint-action-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id     = parseInt(btn.dataset.id);
        _doAction(id, action);
      });
    });

    // Card click → detail modal
    document.querySelectorAll('.kanban-card[data-id]').forEach(card => {
      card.addEventListener('click', () => _viewDetail(parseInt(card.dataset.id)));
    });

    // Assign technician
    document.querySelectorAll('.btn-assign-tech').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); _assignTech(parseInt(btn.dataset.id)); });
    });
    // Add cost on resolve
    document.querySelectorAll('.btn-add-cost').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); _addCost(parseInt(btn.dataset.id)); });
    });
  }

  // ── CARD RENDERER ─────────────────────────────────────────
  function renderCard(req, col, canApprove, users) {
    const asset  = DB.assets.getById(req.asset_id);
    const who    = DB.users.getById(req.reported_by);
    const tech   = req.assigned_technician_id ? DB.users.getById(req.assigned_technician_id) : null;

    // Actions per status (wireframe: approve/reject from Pending, assign tech from Approved)
    let actions = '';
    if (req.status==='Pending' && canApprove) {
      actions = `
      <button class="btn btn-xs btn-success maint-action-btn" data-action="Approved" data-id="${req.id}"><i data-lucide="check"></i> Approve</button>
      <button class="btn btn-xs btn-danger-outline maint-action-btn" data-action="Rejected" data-id="${req.id}"><i data-lucide="x"></i> Reject</button>`;
    } else if (req.status==='Approved' && canApprove) {
      actions = `<button class="btn btn-xs btn-secondary btn-assign-tech" data-id="${req.id}"><i data-lucide="user-check"></i> Assign Tech</button>`;
    } else if (req.status==='Technician Assigned' && canApprove) {
      actions = `<button class="btn btn-xs btn-primary maint-action-btn" data-action="In Progress" data-id="${req.id}"><i data-lucide="play"></i> Start</button>`;
    } else if (req.status==='In Progress' && canApprove) {
      actions = `<button class="btn btn-xs btn-success maint-action-btn btn-add-cost" data-action="Resolved" data-id="${req.id}"><i data-lucide="check-circle"></i> Resolve</button>`;
    }

    return `
    <div class="kanban-card" data-id="${req.id}">
      <div class="kanban-card-top">
        <span class="tag-chip">${escHtml(asset?.asset_tag||'—')}</span>
        ${badge(req.priority||'Medium')}
      </div>
      <div class="kanban-card-title">${escHtml(asset?.name||'—')}</div>
      <div class="kanban-card-desc">${escHtml((req.issue_description||'').substring(0,80))}</div>
      <div class="kanban-card-footer">
        <div style="font-size:0.74rem;color:var(--text-muted)">${escHtml(who?.name||'—')}</div>
        <div style="font-size:0.74rem;color:var(--text-muted)">${timeAgo(req.createdAt)}</div>
      </div>
      ${tech ? `<div style="display:flex;align-items:center;gap:5px;margin-top:6px;padding-top:6px;border-top:1px solid var(--border-light)"><div class="avatar-xs">${tech.name[0]}</div><span style="font-size:0.76rem;color:var(--text-secondary)">${escHtml(tech.name)}</span></div>` : ''}
      ${actions ? `<div class="kanban-card-actions">${actions}</div>` : ''}
    </div>`;
  }

  // ── ACTIONS ───────────────────────────────────────────────
  function _doAction(id, action) {
    if (action==='Resolved') { _addCost(id); return; }
    const res = Engine.updateMaintenanceStatus(id, action);
    if (res.ok) {
      App.toast(`Request ${action.toLowerCase()}.`, action==='Rejected'?'info':'success');
      App.updateNotifBadge(); render();
    } else App.toast(res.error,'error');
  }

  function _assignTech(id) {
    const users = DB.users.where(u=>u.is_active);
    showModal(
      `<i data-lucide="user-check"></i> Assign Technician`,
      `<div class="form-group"><label class="form-label required">Select Technician</label>
        <select class="input" id="tech-sel">
          <option value="">— Select —</option>
          ${users.map(u=>`<option value="${u.id}">${escHtml(u.name)} (${u.role})</option>`).join('')}
        </select>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-assign"><i data-lucide="check"></i> Assign</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-assign')?.addEventListener('click', () => {
      const techId = parseInt(document.getElementById('tech-sel')?.value);
      if (!techId) { App.toast('Select a technician.','error'); return; }
      Engine.updateMaintenanceStatus(id, 'Technician Assigned', { assigned_technician_id: techId });
      App.toast('Technician assigned!','success'); closeModal(); render();
    });
  }

  function _addCost(id) {
    showModal(
      `<i data-lucide="check-circle"></i> Resolve Maintenance Request`,
      `<div class="form-stack">
        <div class="form-group"><label class="form-label">Actual Cost (₹)</label>
          <input class="input" type="number" id="res-cost" min="0" placeholder="e.g. 1500">
        </div>
        <div class="form-group"><label class="form-label">Resolution Notes</label>
          <textarea class="input" id="res-notes" rows="3" placeholder="What was fixed? Parts replaced?"></textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-success" id="m-resolve"><i data-lucide="check-circle"></i> Mark Resolved</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-resolve')?.addEventListener('click', () => {
      const cost  = parseFloat(document.getElementById('res-cost')?.value)||null;
      const notes = document.getElementById('res-notes')?.value;
      const res   = Engine.updateMaintenanceStatus(id, 'Resolved', { actual_cost:cost, resolution_notes:notes });
      if (res.ok) { App.toast('Resolved → Asset back to Available!','success'); App.updateNotifBadge(); closeModal(); render(); }
      else App.toast(res.error,'error');
    });
  }

  // ── NEW REQUEST ───────────────────────────────────────────
  function _newMaint() {
    const assets = DB.assets.where(a => !['Retired','Disposed'].includes(a.status));
    showModal(
      `<i data-lucide="wrench"></i> New Maintenance Request`,
      `<div class="form-stack">
        <div class="form-group"><label class="form-label required">Asset</label>
          <select class="input" id="nm-asset">
            <option value="">— Select asset —</option>
            ${assets.map(a=>`<option value="${a.id}">[${escHtml(a.asset_tag)}] ${escHtml(a.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label required">Priority</label>
          <select class="input" id="nm-priority">
            <option value="Low">Low</option><option value="Medium" selected>Medium</option>
            <option value="High">High</option><option value="Critical">Critical</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label required">Issue Description</label>
          <textarea class="input" id="nm-desc" rows="4" placeholder="Describe the fault in detail…" required></textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-create"><i data-lucide="send"></i> Submit Request</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-create')?.addEventListener('click', () => {
      const assetId = parseInt(document.getElementById('nm-asset')?.value);
      const desc    = document.getElementById('nm-desc')?.value?.trim();
      const pri     = document.getElementById('nm-priority')?.value;
      if (!assetId || !desc) { App.toast('Asset and description required.','error'); return; }
      const res = Engine.raiseMaintenance(assetId, desc, pri);
      if (res.ok) { App.toast('Request submitted!','success'); App.updateNotifBadge(); closeModal(); render(); }
      else App.toast(res.error,'error');
    });
  }

  // ── DETAIL MODAL ──────────────────────────────────────────
  function _viewDetail(id) {
    const req  = DB.maintenanceRequests.getById(id);
    const asset= DB.assets.getById(req.asset_id);
    const who  = DB.users.getById(req.reported_by);
    const tech = req.assigned_technician_id ? DB.users.getById(req.assigned_technician_id) : null;
    showModal(
      `<i data-lucide="wrench"></i> ${escHtml(asset?.name||'Maintenance')}`,
      `<div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Asset</div><span class="tag-chip">${escHtml(asset?.asset_tag||'—')}</span> ${escHtml(asset?.name||'—')}</div>
        <div class="detail-item"><div class="detail-label">Status</div>${badge(req.status)}</div>
        <div class="detail-item"><div class="detail-label">Priority</div>${badge(req.priority||'Medium')}</div>
        <div class="detail-item"><div class="detail-label">Reported By</div>${escHtml(who?.name||'—')}</div>
        <div class="detail-item"><div class="detail-label">Reported Date</div>${fmtDate(req.createdAt)}</div>
        <div class="detail-item"><div class="detail-label">Technician</div>${tech?escHtml(tech.name):'Not assigned'}</div>
        ${req.actual_cost?`<div class="detail-item"><div class="detail-label">Actual Cost</div>₹${parseFloat(req.actual_cost).toLocaleString('en-IN')}</div>`:''}
      </div>
      <div style="margin-top:14px">
        <div class="detail-label" style="margin-bottom:5px">Issue Description</div>
        <div class="desc-box">${escHtml(req.issue_description||'—')}</div>
      </div>
      ${req.resolution_notes?`<div style="margin-top:12px"><div class="detail-label" style="margin-bottom:5px">Resolution Notes</div><div class="desc-box">${escHtml(req.resolution_notes)}</div></div>`:''}`,
      `<button class="btn btn-secondary" id="m-close">Close</button>`
    );
    document.getElementById('m-close')?.addEventListener('click', closeModal);
  }

  // ── LIST VIEW TOGGLE ──────────────────────────────────────
  function _showListView() {
    const requests = DB.maintenanceRequests.getAll().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    showModal(
      `<i data-lucide="list"></i> All Maintenance Requests (${requests.length})`,
      `<div class="table-wrap" style="max-height:60vh;overflow-y:auto"><table class="o-table">
        <thead><tr><th>Asset</th><th>Issue</th><th>Priority</th><th>Status</th><th>Reported By</th><th>Date</th></tr></thead>
        <tbody>${requests.map(r=>{
          const a=DB.assets.getById(r.asset_id),w=DB.users.getById(r.reported_by);
          return `<tr>
            <td>${escHtml(a?.name||'—')} <span class="tag-chip">${escHtml(a?.asset_tag||'')}</span></td>
            <td style="font-size:0.78rem;max-width:160px;color:var(--text-secondary)">${escHtml(r.issue_description?.substring(0,60)||'—')}</td>
            <td>${badge(r.priority||'Medium')}</td>
            <td>${badge(r.status)}</td>
            <td style="font-size:0.8rem">${escHtml(w?.name||'—')}</td>
            <td style="font-size:0.78rem;color:var(--text-muted)">${fmtDate(r.createdAt)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`,
      `<button class="btn btn-secondary" id="m-close">Close</button>`
    );
    document.getElementById('m-close')?.addEventListener('click', closeModal);
  }

  render();
}
