// ============================================================
// js/views/audit.js — Audit Workbench (Wireframe Screen 8)
// New: Export Audit Report as CSV | Auditor assignment
// ============================================================
function renderAudit(container) {
  const user = Auth.getCurrentUser();
  let selectedCycleId = null;

  function render() {
    if (!RBAC.can(user, 'audit:view')) {
      container.innerHTML = `<div class="access-denied"><i data-lucide="lock"></i><h3>Access Denied</h3><p>Audit Workbench requires Admin or Asset Manager role.</p></div>`;
      lucide.createIcons(); return;
    }

    const cycles = DB.auditCycles.getAll().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    if (!selectedCycleId && cycles.length) selectedCycleId = cycles[0].id;
    const selCycle = selectedCycleId ? DB.auditCycles.getById(selectedCycleId) : null;
    const discrepancies = DB.auditItems.where(i => selCycle && i.cycle_id===selCycle.id && ['Missing','Damaged'].includes(i.status));

    container.innerHTML = `
    <div class="o-view-header">
      <div>
        <div class="o-view-title">Audit Workbench</div>
        <div class="o-view-sub">Physical verification cycles, auditor assignment, auto discrepancy detection.</div>
      </div>
      <div class="o-view-actions">
        ${selCycle ? `<button class="btn btn-secondary btn-sm" id="btn-export-audit"><i data-lucide="download"></i> Export Report</button>` : ''}
        ${RBAC.can(user,'audit:create') ? `<button class="btn btn-primary btn-sm" id="btn-new-cycle"><i data-lucide="plus"></i> New Audit Cycle</button>` : ''}
      </div>
    </div>

    <!-- Wireframe: red flagged banner (admin only) -->
    ${discrepancies.length && RBAC.can(user,'audit:create') ? `
    <div style="padding:0 20px;padding-top:12px">
      <div class="alert alert-danger" style="margin-bottom:0">
        <i data-lucide="alert-octagon"></i>
        <div>
          <strong>${discrepancies.length} Asset${discrepancies.length>1?'s':''} Flagged</strong> — discrepancy report generated (admin only).
          <button class="btn btn-xs btn-danger" style="margin-left:8px" id="btn-view-report-top">View Audit Cycle →</button>
        </div>
      </div>
    </div>` : ''}

    <div class="view-body">
      <div class="audit-layout">
        <!-- Left panel: cycle list -->
        <div>
          <div class="audit-list-panel">
            <div class="panel-header" style="display:flex;justify-content:space-between;align-items:center">
              <span>Audit Cycles</span>
              <span class="badge badge-${cycles.length?'active':'pending'}">${cycles.length}</span>
            </div>
            ${cycles.length ? cycles.map(c => `
            <div class="audit-list-item ${c.id===selectedCycleId?'active':''}" data-cycle-id="${c.id}">
              <div class="audit-item-title">${escHtml(c.name)}</div>
              <div class="audit-item-meta">${fmtDate(c.start_date||c.createdAt)} · ${badge(c.status,'sm')}</div>
            </div>`).join('') : `<div class="empty-state" style="padding:30px"><i data-lucide="clipboard"></i><p>No cycles yet.</p></div>`}
          </div>
        </div>

        <!-- Right panel: cycle detail -->
        ${selCycle ? renderCycleDetail(selCycle) : `<div class="card"><div class="empty-state" style="padding:60px"><i data-lucide="clipboard"></i><h3>Select or create an audit cycle</h3></div></div>`}
      </div>
    </div>`;

    lucide.createIcons();

    // Events via addEventListener
    document.querySelectorAll('.audit-list-item[data-cycle-id]').forEach(el => {
      el.addEventListener('click', () => { selectedCycleId = parseInt(el.dataset.cycleId); render(); });
    });
    document.getElementById('btn-new-cycle')?.addEventListener('click', _auditNew);
    document.getElementById('btn-export-audit')?.addEventListener('click', () => _auditExportCSV(selectedCycleId));
    document.getElementById('btn-view-report-top')?.addEventListener('click', () => _auditViewReport(selectedCycleId));

    // Verify buttons
    document.querySelectorAll('.vbtn[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action   = btn.dataset.action;
        const cycleId  = parseInt(btn.dataset.cycle);
        const assetId  = parseInt(btn.dataset.asset);
        _auditMark(cycleId, assetId, action);
      });
    });

    document.querySelectorAll('.btn-assign-auditors').forEach(btn => {
      btn.addEventListener('click', () => _auditAssignAuditors(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.btn-close-cycle').forEach(btn => {
      btn.addEventListener('click', () => _auditClose(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.btn-view-report').forEach(btn => {
      btn.addEventListener('click', () => _auditViewReport(parseInt(btn.dataset.id)));
    });
  }

  // ── Cycle Detail ──────────────────────────────────────────
  function renderCycleDetail(cycle) {
    const items    = DB.auditItems.where(i => i.cycle_id === cycle.id);
    const assets   = DB.assets.where(a => !['Disposed','Retired'].includes(a.status));
    const auditors = (cycle.auditor_ids||[]).map(id => DB.users.getById(id)).filter(Boolean);
    const dept     = DB.departments.getById(cycle.department_id);
    const verified = items.filter(i => i.status === 'Verified').length;
    const missing  = items.filter(i => i.status === 'Missing');
    const damaged  = items.filter(i => i.status === 'Damaged');
    const total    = assets.length;
    const pct      = total ? Math.round((verified / total) * 100) : 0;

    return `
    <div class="audit-detail-panel">
      <div class="audit-detail-header">
        <div>
          <div style="font-size:1rem;font-weight:700;margin-bottom:5px">${escHtml(cycle.name)}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            ${badge(cycle.status)}
            ${dept ? `<span style="font-size:0.8rem;color:var(--text-muted)">Dept: ${escHtml(dept.name)}</span>` : ''}
            <span style="font-size:0.8rem;color:var(--text-muted)">${fmtDate(cycle.start_date)} – ${fmtDate(cycle.end_date)}</span>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${cycle.status!=='Completed' && RBAC.can(user,'audit:create') ? `<button class="btn btn-teal btn-sm btn-close-cycle" data-id="${cycle.id}"><i data-lucide="check-circle"></i> Close Cycle</button>` : ''}
          <button class="btn btn-secondary btn-sm btn-view-report" data-id="${cycle.id}"><i data-lucide="file-text"></i> Discrepancy Report</button>
        </div>
      </div>

      <!-- Progress & Auditors -->
      <div style="padding:14px 18px;border-bottom:1px solid var(--border-light)">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:0.8rem;font-weight:600;color:var(--text-secondary)">Verification Progress</span>
          <span style="font-size:0.8rem;font-weight:700;color:var(--primary)">${pct}% (${verified}/${total})</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>

        <div style="margin-top:12px">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">Assigned Auditors</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            ${auditors.length ? auditors.map(a=>`<div class="user-chip-xs"><div class="avatar-xs">${a.name[0]}</div><span>${escHtml(a.name)}</span></div>`).join('') : `<span style="font-size:0.8rem;color:var(--text-muted)">No auditors assigned</span>`}
            ${cycle.status!=='Completed' && RBAC.can(user,'audit:create') ? `<button class="btn btn-xs btn-secondary btn-assign-auditors" data-id="${cycle.id}"><i data-lucide="user-plus"></i> Assign</button>` : ''}
          </div>
        </div>

        ${missing.length||damaged.length ? `
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          ${missing.length ? `<span class="badge badge-missing">⚠ ${missing.length} Missing</span>` : ''}
          ${damaged.length ? `<span class="badge badge-damaged">⚠ ${damaged.length} Damaged</span>` : ''}
        </div>` : ''}
      </div>

      <!-- Asset checklist table (wireframe: Asset | Assigned Auditor | Last Seen | Status | Actions) -->
      <div class="table-wrap" style="max-height:360px;overflow-y:auto">
        <table class="o-table">
          <thead><tr>
            <th>Asset Tag</th><th>Asset Name</th><th>Location</th>
            <th>Assigned Auditor</th><th>Status</th><th>Verify</th>
          </tr></thead>
          <tbody>
          ${assets.map(a => {
            const item = items.find(i => i.asset_id === a.id);
            const s = item?.status || '—';
            const isDanger = ['Missing','Damaged'].includes(s);
            const auditorOnItem = item?.auditor_id ? DB.users.getById(item.auditor_id) : null;
            return `<tr class="${isDanger?'row-danger':''}">
              <td><span class="tag-chip">${escHtml(a.asset_tag)}</span></td>
              <td style="font-weight:${isDanger?'700':'400'}">${escHtml(a.name)}</td>
              <td style="font-size:0.8rem;color:var(--text-muted)">${escHtml(a.location||'—')}</td>
              <td style="font-size:0.78rem;color:var(--text-secondary)">${auditorOnItem ? escHtml(auditorOnItem.name) : auditors[0] ? escHtml(auditors[0].name) : '—'}</td>
              <td>${s==='—' ? `<span style="color:var(--text-light);font-size:0.8rem">Not checked</span>` : badge(s)}</td>
              <td>${cycle.status !== 'Completed' ? `
                <div class="verify-btns">
                  <button class="vbtn vbtn-verified ${s==='Verified'?'active':''}" title="Mark Verified"
                    data-action="Verified" data-cycle="${cycle.id}" data-asset="${a.id}"><i data-lucide="check"></i></button>
                  <button class="vbtn vbtn-missing ${s==='Missing'?'active':''}" title="Mark Missing"
                    data-action="Missing" data-cycle="${cycle.id}" data-asset="${a.id}"><i data-lucide="search-x"></i></button>
                  <button class="vbtn vbtn-damaged ${s==='Damaged'?'active':''}" title="Mark Damaged"
                    data-action="Damaged" data-cycle="${cycle.id}" data-asset="${a.id}"><i data-lucide="alert-triangle"></i></button>
                </div>` : badge(s)}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  // ── MARK ASSET ────────────────────────────────────────────
  function _auditMark(cycleId, assetId, status) {
    const existing = DB.auditItems.where(i => i.cycle_id===cycleId && i.asset_id===assetId)[0];
    if (existing) DB.auditItems.update(existing.id, { status, updatedAt: new Date().toISOString() });
    else DB.auditItems.create({ cycle_id:cycleId, asset_id:assetId, status, notes:'', auditor_id:user.id, createdAt:new Date().toISOString() });

    if (status === 'Missing') {
      DB.assets.update(assetId, { status:'Lost', updatedAt: new Date().toISOString() });
      App.toast('Asset flagged as Missing → status set to Lost.','warning');
    } else if (status === 'Damaged') {
      App.toast('Asset flagged as Damaged.','warning');
    } else {
      const a = DB.assets.getById(assetId);
      if (a?.status === 'Lost') DB.assets.update(assetId, { status:'Available', updatedAt: new Date().toISOString() });
    }
    App.updateNotifBadge();
    render();
  }

  // ── NEW CYCLE ─────────────────────────────────────────────
  function _auditNew() {
    const depts = DB.departments.getAll();
    const today = new Date().toISOString().split('T')[0];
    const q = Math.ceil((new Date().getMonth()+1)/3);
    const defaultName = `Q${q} ${new Date().getFullYear()} Audit`;
    showModal(
      `<i data-lucide="clipboard-plus"></i> New Audit Cycle`,
      `<div class="form-stack">
        <div class="form-group"><label class="form-label required">Cycle Name</label>
          <input class="input" id="na-name" value="${defaultName}" required>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Department</label>
            <select class="input" id="na-dept">
              <option value="">All Departments</option>
              ${depts.map(d=>`<option value="${d.id}">${escHtml(d.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Start Date</label>
            <input class="input" type="date" id="na-start" value="${today}">
          </div>
        </div>
        <div class="form-group"><label class="form-label">End Date</label>
          <input class="input" type="date" id="na-end">
        </div>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-create-cycle"><i data-lucide="save"></i> Create Cycle</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-create-cycle')?.addEventListener('click', () => {
      const name = document.getElementById('na-name')?.value?.trim();
      if (!name) { App.toast('Name required.','error'); return; }
      const cycle = DB.auditCycles.create({
        name, status:'Active',
        department_id: document.getElementById('na-dept')?.value || null,
        start_date: document.getElementById('na-start')?.value || null,
        end_date: document.getElementById('na-end')?.value || null,
        auditor_ids: [], created_by: user.id
      });
      Engine._log(user, `Audit Created: ${name}`);
      App.toast('Audit cycle created!','success');
      closeModal(); selectedCycleId = cycle.id; render();
    });
  }

  // ── CLOSE CYCLE ───────────────────────────────────────────
  function _auditClose(id) {
    DB.auditCycles.update(id, { status:'Completed', updatedAt: new Date().toISOString() });
    App.toast('Audit cycle closed.','info'); render();
  }

  // ── ASSIGN AUDITORS ───────────────────────────────────────
  function _auditAssignAuditors(id) {
    const cycle = DB.auditCycles.getById(id);
    const users = DB.users.where(u => u.is_active);
    showModal(
      `<i data-lucide="user-plus"></i> Assign Auditors`,
      `<div class="auditor-checkboxes">
        ${users.map(u=>`
        <label class="checkbox-label">
          <input type="checkbox" class="auditor-cb" value="${u.id}" ${(cycle.auditor_ids||[]).includes(u.id)?'checked':''}>
          ${escHtml(u.name)} <span style="color:var(--text-muted);font-size:0.76rem">(${u.role})</span>
        </label>`).join('')}
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-save-auditors"><i data-lucide="save"></i> Save</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-save-auditors')?.addEventListener('click', () => {
      const ids = [...document.querySelectorAll('.auditor-cb:checked')].map(el => parseInt(el.value));
      DB.auditCycles.update(id, { auditor_ids: ids, updatedAt: new Date().toISOString() });
      App.toast('Auditors assigned!','success'); closeModal(); render();
    });
  }

  // ── VIEW DISCREPANCY REPORT ───────────────────────────────
  function _auditViewReport(id) {
    const cycle   = DB.auditCycles.getById(id);
    const items   = DB.auditItems.where(i => i.cycle_id === id);
    const assets  = DB.assets.where(a => !['Disposed','Retired'].includes(a.status));
    const missing = items.filter(i => i.status==='Missing');
    const damaged = items.filter(i => i.status==='Damaged');
    const verified= items.filter(i => i.status==='Verified');
    const notChk  = assets.length - items.length;

    showModal(
      `<i data-lucide="file-text"></i> Discrepancy Report — ${escHtml(cycle?.name||'')}`,
      `<div style="display:flex;flex-direction:column;gap:14px">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${[['Total',assets.length,'grey'],['Verified',verified.length,'green'],['Missing',missing.length,'red'],['Damaged',damaged.length,'yellow']].map(([l,v,c])=>`
          <div style="background:var(--${c}-bg);border-radius:var(--radius-sm);padding:10px;text-align:center">
            <div style="font-size:1.5rem;font-weight:800;color:var(--${c})">${v}</div>
            <div style="font-size:0.74rem;color:var(--text-muted)">${l}</div>
          </div>`).join('')}
        </div>
        ${missing.length||damaged.length ? `
        <div class="conflict-banner">
          <div class="conflict-banner-header"><i data-lucide="alert-octagon"></i> ${missing.length+damaged.length} Discrepancies Detected</div>
          <div class="table-wrap" style="max-height:220px;overflow-y:auto;margin-top:8px">
            <table class="o-table">
              <thead><tr><th>Asset</th><th>Tag</th><th>Issue</th><th>Location</th></tr></thead>
              <tbody>${[...missing,...damaged].map(i=>{
                const a=DB.assets.getById(i.asset_id);
                return `<tr><td style="font-weight:600">${escHtml(a?.name||'—')}</td>
                  <td><span class="tag-chip">${escHtml(a?.asset_tag||'')}</span></td>
                  <td>${badge(i.status)}</td>
                  <td style="font-size:0.78rem;color:var(--text-muted)">${escHtml(a?.location||'—')}</td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>
        </div>` : `<div class="success-box"><i data-lucide="check-circle"></i> No discrepancies — all checked assets verified!</div>`}
        ${notChk>0 ? `<div class="alert alert-warning"><i data-lucide="clock"></i> <strong>${notChk} asset${notChk>1?'s':''}</strong> not yet checked in this cycle.</div>` : ''}
      </div>`,
      `<button class="btn btn-secondary" id="m-close-rep">Close</button>
       <button class="btn btn-primary" id="m-export-rep"><i data-lucide="download"></i> Export CSV</button>`
    );
    document.getElementById('m-close-rep')?.addEventListener('click', closeModal);
    document.getElementById('m-export-rep')?.addEventListener('click', () => { _auditExportCSV(id); closeModal(); });
  }

  // ── EXPORT AUDIT REPORT AS CSV ────────────────────────────
  function _auditExportCSV(cycleId) {
    const cycle  = DB.auditCycles.getById(cycleId);
    const items  = DB.auditItems.where(i => i.cycle_id === cycleId);
    const assets = DB.assets.where(a => !['Disposed','Retired'].includes(a.status));
    const auditors = (cycle?.auditor_ids||[]).map(id => DB.users.getById(id)).filter(Boolean);

    const rows = [
      [`Audit Report: ${cycle?.name || 'Unnamed'}`],
      [`Generated: ${new Date().toLocaleString('en-IN')}`, `Status: ${cycle?.status || '—'}`],
      [`Start: ${fmtDate(cycle?.start_date)}`, `End: ${fmtDate(cycle?.end_date)}`],
      [`Auditors: ${auditors.map(a=>a.name).join(', ') || 'None'}`],
      [],
      ['SUMMARY'],
      ['Total Assets', assets.length],
      ['Verified',     items.filter(i=>i.status==='Verified').length],
      ['Missing',      items.filter(i=>i.status==='Missing').length],
      ['Damaged',      items.filter(i=>i.status==='Damaged').length],
      ['Not Checked',  assets.length - items.length],
      [],
      ['ASSET CHECKLIST'],
      ['Asset Tag','Asset Name','Category','Location','Status','Condition','Audited By','Notes'],
    ];

    assets.forEach(a => {
      const item = items.find(i => i.asset_id === a.id);
      const cat  = DB.assetCategories.getById(a.category_id);
      const who  = item?.auditor_id ? DB.users.getById(item.auditor_id) : null;
      rows.push([
        a.asset_tag, a.name,
        cat?.name || '',
        a.location || '',
        item?.status || 'Not Checked',
        a.condition || '',
        who?.name || '',
        item?.notes || '',
      ]);
    });

    // DISCREPANCY SECTION
    const disc = items.filter(i => ['Missing','Damaged'].includes(i.status));
    if (disc.length) {
      rows.push([], ['DISCREPANCIES'], ['Asset Tag','Asset Name','Issue','Location','Asset Status']);
      disc.forEach(i => {
        const a = DB.assets.getById(i.asset_id);
        rows.push([a?.asset_tag||'', a?.name||'', i.status, a?.location||'', a?.status||'']);
      });
    }

    const csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.download = `AssetFlow_Audit_${cycle?.name?.replace(/\s+/g,'_')||'Report'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    App.toast('Audit report exported!','success');
  }

  render();
}
