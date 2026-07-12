// ============================================================
// js/views/allocations.js — Allocation + Transfer Engine
// FIX: All modals use addEventListener (no inline onclick)
// ============================================================
function renderAllocations(container, params = {}) {
  const user = Auth.getCurrentUser();
  let activeTab = 'allocate';
  let conflictAssetId = null;

  function render() {
    const allocs     = DB.allocations.getAll().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    const transfers  = DB.transferRequests.getAll().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    const overdueSet = new Set(Engine.getOverdueAllocations().map(a => a.id));
    const pendingTR  = transfers.filter(t => t.status==='Pending').length;

    if (!RBAC.can(user,'allocations:create') && activeTab==='allocate') activeTab='active';

    container.innerHTML = `
    <div class="o-view-header">
      <div><div class="o-view-title">Allocations &amp; Transfers</div>
        <div class="o-view-sub">Assign assets, manage transfers, process returns.</div></div>
    </div>
    <div class="o-tabs">
      ${RBAC.can(user,'allocations:create')?`<button class="o-tab ${activeTab==='allocate'?'active':''}" data-tab="allocate"><i data-lucide="git-branch"></i> Allocate Asset</button>`:''}
      <button class="o-tab ${activeTab==='active'?'active':''}" data-tab="active"><i data-lucide="list"></i> Active Allocations</button>
      <button class="o-tab ${activeTab==='transfers'?'active':''}" data-tab="transfers">
        <i data-lucide="arrow-right-left"></i> Transfer Requests
        ${pendingTR?`<span class="o-tab-badge">${pendingTR}</span>`:''}
      </button>
      <button class="o-tab ${activeTab==='history'?'active':''}" data-tab="history"><i data-lucide="history"></i> History</button>
    </div>
    <div class="view-body" id="alloc-tab-body">${renderTab(allocs, transfers, overdueSet)}</div>`;

    lucide.createIcons();

    // Tab switching
    container.querySelectorAll('.o-tab[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => { activeTab = btn.dataset.tab; render(); });
    });

    // Pre-select asset if navigated with params
    if (params.preAssetId && activeTab==='allocate') {
      setTimeout(() => {
        const sel = document.getElementById('alloc-asset-sel');
        if (sel) { sel.value = params.preAssetId; _checkAsset(parseInt(params.preAssetId)); }
      }, 60);
    }

    attachTabEvents(allocs, transfers, overdueSet);
  }

  function renderTab(allocs, transfers, overdueSet) {
    if (activeTab==='allocate')  return renderAllocateForm();
    if (activeTab==='active')    return renderActive(allocs, overdueSet);
    if (activeTab==='transfers') return renderTransfers(transfers);
    return renderHistory(allocs);
  }

  // ── ALLOCATE FORM ─────────────────────────────────────────
  function renderAllocateForm() {
    if (!RBAC.can(user,'allocations:create')) return `<div class="access-denied"><i data-lucide="lock"></i><h3>Permission Denied</h3></div>`;
    const availAssets = DB.assets.where(a => ['Available','Reserved'].includes(a.status) && !a.is_shared_resource);
    const allAssets   = DB.assets.where(a => !['Disposed','Retired'].includes(a.status) && !a.is_shared_resource);
    const users = DB.users.where(u => u.is_active);
    const depts = DB.departments.getAll();

    return `
    <div class="grid-2" style="align-items:start">
      <div class="card">
        <div class="card-header"><div class="card-title"><i data-lucide="git-branch"></i> New Allocation</div></div>
        <div class="card-body">
          <div class="form-stack">
            <div class="form-group">
              <label class="form-label required">Select Asset</label>
              <select class="input" id="alloc-asset-sel">
                <option value="">— Choose an asset —</option>
                <optgroup label="Available / Reserved">
                  ${availAssets.map(a=>`<option value="${a.id}">[${escHtml(a.asset_tag)}] ${escHtml(a.name)}</option>`).join('')}
                </optgroup>
                <optgroup label="Other (incl. Allocated)">
                  ${allAssets.filter(a=>!availAssets.find(av=>av.id===a.id)).map(a=>`<option value="${a.id}">[${escHtml(a.asset_tag)}] ${escHtml(a.name)} — ${a.status}</option>`).join('')}
                </optgroup>
              </select>
            </div>

            <div id="alloc-status-box"></div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label required">Assign To</label>
                <select class="input" id="alloc-user-sel">
                  <option value="">— Select employee —</option>
                  ${users.map(u=>`<option value="${u.id}">${escHtml(u.name)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Department</label>
                <select class="input" id="alloc-dept-sel">
                  <option value="">Not specified</option>
                  ${depts.map(d=>`<option value="${d.id}">${escHtml(d.name)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Expected Return Date</label>
              <input class="input" type="date" id="alloc-return-date" min="${new Date().toISOString().split('T')[0]}">
            </div>

            <!-- Transfer form (revealed on conflict) -->
            <div id="transfer-form-box" class="hidden">
              <div class="transfer-form-box">
                <div class="transfer-form-title"><i data-lucide="arrow-right-left"></i> Raise Transfer Request</div>
                <div class="form-stack">
                  <div class="form-group"><label class="form-label required">Transfer To</label>
                    <select class="input" id="tr-to-user">
                      <option value="">— Select recipient —</option>
                      ${users.map(u=>`<option value="${u.id}">${escHtml(u.name)}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group"><label class="form-label">Reason</label>
                    <textarea class="input" id="tr-reason" rows="3" placeholder="Explain why this transfer is needed…"></textarea>
                  </div>
                  <button class="btn btn-primary" id="btn-submit-transfer"><i data-lucide="send"></i> Submit Transfer Request</button>
                </div>
              </div>
            </div>

            <button class="btn btn-primary" id="btn-alloc-submit"><i data-lucide="check"></i> Confirm Allocation</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title"><i data-lucide="info"></i> Allocation Rules</div></div>
        <div class="rules-list">
          <div class="rule-item"><div class="rule-dot" style="background:var(--green)"></div><p>Only <strong>Available</strong> or <strong>Reserved</strong> assets can be directly allocated.</p></div>
          <div class="rule-item"><div class="rule-dot" style="background:var(--red)"></div><p>If the asset is <strong>Already Allocated</strong>, the system blocks it and shows a <strong>Transfer Request</strong> form.</p></div>
          <div class="rule-item"><div class="rule-dot" style="background:var(--yellow)"></div><p>Assets <strong>Under Maintenance</strong> are blocked until resolved.</p></div>
          <div class="rule-item"><div class="rule-dot" style="background:var(--blue)"></div><p>Returns require mandatory <strong>check-in notes</strong> before reverting to Available.</p></div>
        </div>
      </div>
    </div>`;
  }

  // ── ACTIVE ALLOCATIONS ────────────────────────────────────
  function renderActive(allocs, overdueSet) {
    const active = allocs.filter(a => a.status==='Active');
    return `
    <div class="card">
      <div class="filter-bar" style="justify-content:space-between">
        <span style="font-size:0.84rem;font-weight:600;color:var(--text-secondary)">${active.length} Active Allocation${active.length!==1?'s':''}</span>
        ${overdueSet.size?`<span class="badge badge-overdue">⚠ ${overdueSet.size} Overdue</span>`:''}
      </div>
      <div class="table-wrap"><table class="o-table">
        <thead><tr><th class="cb-col"><input type="checkbox"></th><th>Asset</th><th>Tag</th><th>Holder</th><th>Department</th><th>Expected Return</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${active.length ? active.map(a => {
          const asset=DB.assets.getById(a.asset_id), holder=DB.users.getById(a.user_id), dept=DB.departments.getById(a.department_id);
          const od = overdueSet.has(a.id);
          return `<tr class="${od?'row-danger':''}">
            <td class="cb-col"><input type="checkbox"></td>
            <td><strong>${escHtml(asset?.name||'—')}</strong></td>
            <td><span class="tag-chip">${escHtml(asset?.asset_tag||'—')}</span></td>
            <td><div class="user-chip"><div class="avatar-xs">${(holder?.name||'?')[0]}</div>${escHtml(holder?.name||'—')}</div></td>
            <td style="font-size:0.8rem;color:var(--text-muted)">${escHtml(dept?.name||'—')}</td>
            <td style="${od?'color:var(--red);font-weight:700':'color:var(--text-secondary);font-size:0.82rem'}">${od?'⚠ Overdue · ':''}${fmtDate(a.expected_return_date)||'Not set'}</td>
            <td>${badge(od?'Overdue':'Active')}</td>
            <td>${RBAC.can(user,'allocations:return')?`<button class="btn btn-xs btn-secondary btn-return-alloc" data-id="${a.id}"><i data-lucide="undo-2"></i> Return</button>`:''}</td>
          </tr>`;
        }).join('') : `<tr><td colspan="8"><div class="empty-state"><i data-lucide="inbox"></i><p>No active allocations.</p></div></td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  }

  // ── TRANSFER REQUESTS ─────────────────────────────────────
  function renderTransfers(transfers) {
    return `
    <div class="card">
      <div class="card-header"><div class="card-title"><i data-lucide="arrow-right-left"></i> Transfer Requests</div></div>
      <div class="table-wrap"><table class="o-table">
        <thead><tr><th>Asset</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead>
        <tbody>${transfers.length ? transfers.map(t => {
          const asset=DB.assets.getById(t.asset_id), from=DB.users.getById(t.from_user_id), to=DB.users.getById(t.to_user_id);
          return `<tr>
            <td><strong>${escHtml(asset?.name||'—')}</strong><br><span class="tag-chip">${escHtml(asset?.asset_tag||'')}</span></td>
            <td style="font-size:0.8rem;color:var(--text-secondary)">${escHtml(from?.name||'Unallocated')}</td>
            <td><div class="user-chip"><div class="avatar-xs">${(to?.name||'?')[0]}</div><strong>${escHtml(to?.name||'—')}</strong></div></td>
            <td style="font-size:0.78rem;color:var(--text-secondary);max-width:140px">${escHtml(t.reason||'—')}</td>
            <td>${badge(t.status)}</td>
            <td style="font-size:0.78rem;color:var(--text-muted)">${fmtDate(t.createdAt)}</td>
            <td><div class="action-btns">
              ${t.status==='Pending'&&RBAC.can(user,'allocations:approve_transfer')?`
              <button class="btn btn-xs btn-success btn-approve-tr" data-id="${t.id}"><i data-lucide="check"></i> Approve</button>
              <button class="btn btn-xs btn-danger-outline btn-reject-tr" data-id="${t.id}"><i data-lucide="x"></i> Reject</button>`
              : badge(t.status)}
            </div></td>
          </tr>`;
        }).join('') : `<tr><td colspan="7"><div class="empty-state"><i data-lucide="inbox"></i><p>No transfer requests yet.</p></div></td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  }

  // ── HISTORY ───────────────────────────────────────────────
  function renderHistory(allocs) {
    const hist = allocs.filter(a => a.status!=='Active');
    return `
    <div class="card">
      <div class="card-header"><div class="card-title"><i data-lucide="history"></i> History (${hist.length})</div></div>
      <div class="table-wrap"><table class="o-table">
        <thead><tr><th>Asset</th><th>Holder</th><th>Allocated</th><th>Returned</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>${hist.length ? hist.map(a => {
          const asset=DB.assets.getById(a.asset_id), holder=DB.users.getById(a.user_id);
          return `<tr>
            <td><strong>${escHtml(asset?.name||'—')}</strong> <span class="tag-chip">${escHtml(asset?.asset_tag||'')}</span></td>
            <td>${escHtml(holder?.name||'—')}</td>
            <td style="font-size:0.78rem;color:var(--text-muted)">${fmtDate(a.createdAt)}</td>
            <td style="font-size:0.78rem;color:var(--text-muted)">${fmtDate(a.returned_at)||'—'}</td>
            <td>${badge(a.status)}</td>
            <td style="font-size:0.76rem;color:var(--text-secondary);max-width:180px">${escHtml(a.check_in_notes||'—')}</td>
          </tr>`;
        }).join('') : `<tr><td colspan="6"><div class="empty-state"><i data-lucide="inbox"></i><p>No history yet.</p></div></td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  }

  // ── ATTACH TAB EVENTS ─────────────────────────────────────
  function attachTabEvents(allocs, transfers, overdueSet) {
    // Asset selector change
    const assetSel = document.getElementById('alloc-asset-sel');
    if (assetSel) assetSel.addEventListener('change', () => _checkAsset(parseInt(assetSel.value)));

    // Allocate submit
    document.getElementById('btn-alloc-submit')?.addEventListener('click', _doAllocate);

    // Transfer submit
    document.getElementById('btn-submit-transfer')?.addEventListener('click', _doTransfer);

    // Return buttons
    document.querySelectorAll('.btn-return-alloc').forEach(btn => {
      btn.addEventListener('click', () => _returnModal(parseInt(btn.dataset.id)));
    });

    // Transfer approve/reject
    document.querySelectorAll('.btn-approve-tr').forEach(btn => {
      btn.addEventListener('click', () => {
        const res = Engine.approveTransfer(parseInt(btn.dataset.id));
        if (res.ok) { App.toast('Transfer approved!','success'); App.updateNotifBadge(); render(); }
        else App.toast(res.error,'error');
      });
    });
    document.querySelectorAll('.btn-reject-tr').forEach(btn => {
      btn.addEventListener('click', () => {
        DB.transferRequests.update(parseInt(btn.dataset.id), { status:'Rejected' });
        App.toast('Transfer rejected.','info'); render();
      });
    });
  }

  // ── CONFLICT CHECK (live) ─────────────────────────────────
  function _checkAsset(assetId) {
    const box = document.getElementById('alloc-status-box');
    const submitBtn = document.getElementById('btn-alloc-submit');
    const transferBox = document.getElementById('transfer-form-box');
    if (!box) return;

    if (!assetId) { box.innerHTML=''; return; }
    conflictAssetId = assetId;

    const check = Engine.checkAllocationConflict(assetId);
    if (check.conflict) {
      box.innerHTML = `
      <div class="conflict-banner">
        <div class="conflict-banner-header"><i data-lucide="alert-octagon"></i> Already Allocated — Transfer Required</div>
        <p>${check.message}</p>
      </div>`;
      if (submitBtn) { submitBtn.disabled=true; submitBtn.style.opacity='0.4'; }
      if (transferBox) transferBox.classList.remove('hidden');
    } else {
      const asset = DB.assets.getById(assetId);
      if (['Available','Reserved'].includes(asset?.status)) {
        box.innerHTML = `<div class="success-box"><i data-lucide="check-circle"></i> <strong>${escHtml(asset.status)}</strong> — ready to allocate.</div>`;
        if (submitBtn) { submitBtn.disabled=false; submitBtn.style.opacity='1'; }
        if (transferBox) transferBox.classList.add('hidden');
      } else {
        box.innerHTML = `<div class="alert alert-warning"><i data-lucide="alert-triangle"></i> Asset is <strong>${escHtml(asset?.status)}</strong> — cannot be allocated.</div>`;
        if (submitBtn) { submitBtn.disabled=true; submitBtn.style.opacity='0.4'; }
        if (transferBox) transferBox.classList.add('hidden');
      }
    }
    lucide.createIcons({ nodes: [box] });
  }

  function _doAllocate() {
    const assetId = parseInt(document.getElementById('alloc-asset-sel')?.value);
    const userId  = parseInt(document.getElementById('alloc-user-sel')?.value);
    const deptId  = document.getElementById('alloc-dept-sel')?.value;
    const retDate = document.getElementById('alloc-return-date')?.value;
    if (!assetId || !userId) { App.toast('Select an asset and a user.','error'); return; }
    const res = Engine.allocateAsset(assetId, userId, deptId, retDate||null);
    if (res.ok) { App.toast('Asset allocated successfully!','success'); App.updateNotifBadge(); render(); }
    else if (res.conflict) { App.toast('Conflict — use Transfer Request.','error'); }
    else App.toast(res.error||'Failed.','error');
  }

  function _doTransfer() {
    const assetId = conflictAssetId || parseInt(document.getElementById('alloc-asset-sel')?.value);
    const toUser  = parseInt(document.getElementById('tr-to-user')?.value);
    const reason  = document.getElementById('tr-reason')?.value;
    if (!assetId || !toUser) { App.toast('Select asset and recipient.','error'); return; }
    const res = Engine.createTransferRequest(assetId, toUser, reason);
    if (res.ok) { App.toast('Transfer request submitted! Awaiting approval.','success'); App.updateNotifBadge(); activeTab='transfers'; render(); }
  }

  // ── RETURN MODAL ──────────────────────────────────────────
  function _returnModal(allocId) {
    const alloc = DB.allocations.getById(allocId);
    const asset = DB.assets.getById(alloc.asset_id);
    showModal(
      `<i data-lucide="undo-2"></i> Process Return — ${escHtml(asset?.name||'')}`,
      `<div class="form-stack">
        <div class="alert alert-info" style="margin-bottom:0"><i data-lucide="info"></i> Check-in notes are <strong>mandatory</strong> before return.</div>
        <div class="form-group"><label class="form-label required">Condition on Return</label>
          <select class="input" id="ret-cond">
            <option value="Excellent">Excellent</option><option value="Good" selected>Good</option>
            <option value="Fair">Fair</option><option value="Poor">Poor</option><option value="Damaged">Damaged</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label required">Check-in Notes</label>
          <textarea class="input" id="ret-notes" rows="4" placeholder="Describe condition, any issues observed…" required></textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-confirm-return"><i data-lucide="check"></i> Confirm Return</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-confirm-return')?.addEventListener('click', () => {
      const notes = document.getElementById('ret-notes')?.value;
      const cond  = document.getElementById('ret-cond')?.value;
      const res = Engine.processReturn(allocId, notes, cond);
      if (res.ok) { App.toast('Asset returned → Available.','success'); App.updateNotifBadge(); closeModal(); render(); }
      else App.toast(res.error,'error');
    });
  }

  render();
}
