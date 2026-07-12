// ============================================================
// js/engine.js — Business Logic & State Machine
// ============================================================

// ── HELPERS ──────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
}
function timeAgo(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 60)   return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400)return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}
function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── STATUS BADGE HELPERS ─────────────────────────────────────
const STATUS_COLORS = {
  // Asset statuses
  Available:          { bg:'rgba(16,185,129,0.15)', color:'#10b981', dot:'#10b981' },
  Allocated:          { bg:'rgba(59,130,246,0.15)',  color:'#3b82f6', dot:'#3b82f6' },
  Reserved:           { bg:'rgba(139,92,246,0.15)', color:'#8b5cf6', dot:'#8b5cf6' },
  'Under Maintenance':{ bg:'rgba(245,158,11,0.15)', color:'#f59e0b', dot:'#f59e0b' },
  Lost:               { bg:'rgba(239,68,68,0.15)',  color:'#ef4444', dot:'#ef4444' },
  Retired:            { bg:'rgba(107,114,128,0.15)',color:'#9ca3af', dot:'#9ca3af' },
  Disposed:           { bg:'rgba(75,85,99,0.15)',   color:'#6b7280', dot:'#6b7280' },
  // Priority
  Critical:           { bg:'rgba(239,68,68,0.2)',   color:'#ef4444', dot:'#ef4444' },
  High:               { bg:'rgba(245,100,0,0.2)',   color:'#f97316', dot:'#f97316' },
  Medium:             { bg:'rgba(245,158,11,0.15)', color:'#f59e0b', dot:'#f59e0b' },
  Low:                { bg:'rgba(16,185,129,0.12)', color:'#10b981', dot:'#10b981' },
  // Maintenance status
  Pending:            { bg:'rgba(245,158,11,0.15)', color:'#f59e0b', dot:'#f59e0b' },
  Approved:           { bg:'rgba(59,130,246,0.15)', color:'#3b82f6', dot:'#3b82f6' },
  Rejected:           { bg:'rgba(239,68,68,0.15)',  color:'#ef4444', dot:'#ef4444' },
  'In Progress':      { bg:'rgba(139,92,246,0.15)',color:'#8b5cf6', dot:'#8b5cf6' },
  Resolved:           { bg:'rgba(16,185,129,0.15)', color:'#10b981', dot:'#10b981' },
  // Booking
  Upcoming:           { bg:'rgba(59,130,246,0.15)', color:'#3b82f6', dot:'#3b82f6' },
  Ongoing:            { bg:'rgba(16,185,129,0.15)', color:'#10b981', dot:'#10b981' },
  Completed:          { bg:'rgba(107,114,128,0.15)',color:'#9ca3af', dot:'#9ca3af' },
  Cancelled:          { bg:'rgba(239,68,68,0.15)',  color:'#ef4444', dot:'#ef4444' },
  // Alloc
  Active:             { bg:'rgba(16,185,129,0.15)', color:'#10b981', dot:'#10b981' },
  Returned:           { bg:'rgba(107,114,128,0.15)',color:'#9ca3af', dot:'#9ca3af' },
  // Transfer
  'Transfer Pending': { bg:'rgba(245,158,11,0.15)', color:'#f59e0b', dot:'#f59e0b' },
};

function badge(label, size = 'sm') {
  const s = STATUS_COLORS[label] || { bg:'rgba(107,114,128,0.15)', color:'#9ca3af', dot:'#9ca3af' };
  const fs = size === 'sm' ? '0.72rem' : '0.8rem';
  return `<span style="background:${s.bg};color:${s.color};font-size:${fs};padding:3px 10px;border-radius:999px;font-weight:600;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;">
    <span style="width:6px;height:6px;border-radius:50%;background:${s.dot};"></span>${escHtml(label)}</span>`;
}

function condBadge(cond) {
  const map = { Excellent:'#10b981', Good:'#3b82f6', Fair:'#f59e0b', Poor:'#ef4444', Damaged:'#ef4444' };
  const c = map[cond] || '#9ca3af';
  return `<span style="color:${c};font-weight:600;font-size:0.75rem;">${escHtml(cond||'—')}</span>`;
}

// ── ENGINE ────────────────────────────────────────────────────
const Engine = {

  // 1. ALLOCATION CONFLICT CHECK
  checkAllocationConflict(assetId) {
    const active = DB.allocations.getActiveByAsset(assetId);
    if (!active) return { conflict: false };
    const holder = DB.users.getById(active.user_id);
    const dept   = DB.departments.getById(active.department_id);
    return {
      conflict: true, allocation: active, holder,
      message: `Currently held by <strong>${holder ? holder.name : 'Unknown'}</strong>${dept ? ' · '+dept.name : ''} since ${fmtDate(active.createdAt)}.`,
    };
  },

  // 2. BOOKING OVERLAP VALIDATOR
  checkBookingOverlap(assetId, startISO, endISO, excludeId = null) {
    const newS = new Date(startISO).getTime();
    const newE = new Date(endISO).getTime();
    const existing = DB.bookings.getByAsset(assetId).filter(b =>
      !['Cancelled','Completed'].includes(b.status) && b.id !== excludeId
    );
    for (const b of existing) {
      const eS = new Date(b.start_time).getTime();
      const eE = new Date(b.end_time).getTime();
      if (newS < eE && newE > eS) {   // overlap: not (newE<=eS || newS>=eE)
        const who = DB.users.getById(b.user_id);
        return {
          overlap: true, booking: b,
          message: `Overlaps with existing booking by <strong>${who ? who.name : 'Unknown'}</strong> (${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}).`,
        };
      }
    }
    return { overlap: false };
  },

  // 3. STATE MACHINE — Maintenance status → Asset status
  updateMaintenanceStatus(reqId, newStatus, extra = {}) {
    const req = DB.maintenanceRequests.getById(reqId);
    if (!req) return { ok: false, error: 'Request not found.' };
    DB.maintenanceRequests.update(reqId, { status: newStatus, ...extra });
    const asset = DB.assets.getById(req.asset_id);
    const u = Auth.getCurrentUser();
    const who = u ? u.name : 'System';

    if (newStatus === 'Approved') {
      DB.assets.update(req.asset_id, { status: 'Under Maintenance' });
      this._notify('maintenance', 'Maintenance Approved', `${asset.name} (${asset.asset_tag}) sent for repair.`, req.user_id);
      this._log(u, `Maintenance Approved: ${asset.name} (${asset.asset_tag})`);
    } else if (newStatus === 'Resolved') {
      DB.assets.update(req.asset_id, { status: 'Available' });
      this._notify('maintenance', 'Maintenance Resolved', `${asset.name} (${asset.asset_tag}) is now available.`, req.user_id);
      this._log(u, `Maintenance Resolved: ${asset.name} (${asset.asset_tag})`);
    } else if (newStatus === 'Rejected') {
      this._notify('maintenance', 'Maintenance Rejected', `Your maintenance request for ${asset.name} was rejected.`, req.user_id);
      this._log(u, `Maintenance Rejected: ${asset.name} (${asset.asset_tag})`);
    } else if (newStatus === 'In Progress') {
      this._log(u, `Maintenance In Progress: ${asset.name} (${asset.asset_tag})`);
    }
    return { ok: true };
  },

  // 4. RETURN FLOW (mandates notes)
  processReturn(allocId, notes, condition) {
    if (!notes || !notes.trim()) return { ok: false, error: 'Check-in notes are required before returning an asset.' };
    const alloc = DB.allocations.getById(allocId);
    if (!alloc) return { ok: false, error: 'Allocation record not found.' };
    DB.allocations.update(allocId, { status: 'Returned', check_in_notes: notes.trim(), returned_at: new Date().toISOString() });
    DB.assets.update(alloc.asset_id, { status: 'Available', condition: condition || 'Good' });
    const asset = DB.assets.getById(alloc.asset_id);
    const holder = DB.users.getById(alloc.user_id);
    const u = Auth.getCurrentUser();
    this._notify('allocation', 'Asset Returned', `${asset.name} (${asset.asset_tag}) returned by ${holder ? holder.name : 'Unknown'}.`, null);
    this._log(u, `Asset Returned: ${asset.name} (${asset.asset_tag}) by ${holder ? holder.name : 'Unknown'}. Notes: ${notes.trim()}`);
    return { ok: true };
  },

  // 5. ALLOCATE ASSET
  allocateAsset(assetId, userId, deptId, expectedReturn) {
    const check = this.checkAllocationConflict(assetId);
    if (check.conflict) return { ok: false, conflict: true, ...check };
    const asset = DB.assets.getById(assetId);
    if (!asset) return { ok: false, error: 'Asset not found.' };
    if (!['Available','Reserved'].includes(asset.status))
      return { ok: false, error: `Cannot allocate — asset is currently "${asset.status}".` };
    const u = Auth.getCurrentUser();
    const alloc = DB.allocations.create({
      asset_id: assetId, user_id: userId,
      department_id: parseInt(deptId) || null,
      expected_return_date: expectedReturn || null,
      status: 'Active', allocated_by: u ? u.id : null,
    });
    DB.assets.update(assetId, { status: 'Allocated' });
    const who = DB.users.getById(userId);
    this._notify('allocation', 'Asset Assigned to You', `${asset.name} (${asset.asset_tag}) has been allocated to you.`, userId);
    this._log(u, `Allocated ${asset.name} (${asset.asset_tag}) to ${who ? who.name : 'Unknown'}`);
    return { ok: true, allocation: alloc };
  },

  // 6. TRANSFER REQUEST
  createTransferRequest(assetId, toUserId, reason) {
    const active = DB.allocations.getActiveByAsset(assetId);
    const u = Auth.getCurrentUser();
    const asset = DB.assets.getById(assetId);
    const tr = DB.transferRequests.create({
      asset_id: assetId,
      from_user_id: active ? active.user_id : null,
      to_user_id: toUserId,
      requested_by: u ? u.id : null,
      reason: reason || '',
      status: 'Pending',
    });
    this._notify('transfer', 'Transfer Request Received', `Transfer requested for ${asset.name} (${asset.asset_tag}).`, null);
    this._log(u, `Transfer Request: ${asset.name} (${asset.asset_tag})`);
    return { ok: true, transfer: tr };
  },

  // 7. APPROVE TRANSFER
  approveTransfer(transferId) {
    const tr = DB.transferRequests.getById(transferId);
    if (!tr) return { ok: false, error: 'Transfer not found.' };
    // Return from current holder
    const active = DB.allocations.getActiveByAsset(tr.asset_id);
    if (active) DB.allocations.update(active.id, { status: 'Returned', returned_at: new Date().toISOString(), check_in_notes: 'Auto-returned via transfer.' });
    DB.transferRequests.update(transferId, { status: 'Approved' });
    // Re-allocate
    const toUser = DB.users.getById(tr.to_user_id);
    const result = this.allocateAsset(tr.asset_id, tr.to_user_id, toUser ? toUser.department_id : null, null);
    const asset = DB.assets.getById(tr.asset_id);
    const u = Auth.getCurrentUser();
    this._notify('transfer', 'Transfer Approved', `${asset ? asset.name : ''} has been transferred to ${toUser ? toUser.name : 'you'}.`, tr.to_user_id);
    this._log(u, `Transfer Approved: ${asset ? asset.name : ''} → ${toUser ? toUser.name : 'Unknown'}`);
    return { ok: true };
  },

  // 8. KPI STATS
  getKPIStats() {
    const assets = DB.assets.getAll();
    const allocs = DB.allocations.getAll();
    const books  = DB.bookings.getAll();
    const maint  = DB.maintenanceRequests.getAll();
    const trans  = DB.transferRequests.getAll();
    const overdue = this.getOverdueAllocations();
    return {
      total:            assets.length,
      available:        assets.filter(a => a.status === 'Available').length,
      allocated:        assets.filter(a => a.status === 'Allocated').length,
      underMaintenance: assets.filter(a => a.status === 'Under Maintenance').length,
      lost:             assets.filter(a => a.status === 'Lost').length,
      activeBookings:   books.filter(b => ['Upcoming','Ongoing'].includes(b.status)).length,
      overdueReturns:   overdue.length,
      pendingTransfers: trans.filter(t => t.status === 'Pending').length,
      pendingMaint:     maint.filter(m => m.status === 'Pending').length,
      upcomingReturns:  allocs.filter(a => {
        if (a.status !== 'Active' || !a.expected_return_date) return false;
        const d = new Date(a.expected_return_date);
        const now = new Date();
        const in7 = new Date(); in7.setDate(now.getDate() + 7);
        return d >= now && d <= in7;
      }).length,
    };
  },

  getOverdueAllocations() {
    return DB.allocations.where(a => {
      if (a.status !== 'Active' || !a.expected_return_date) return false;
      return new Date(a.expected_return_date) < new Date(new Date().toDateString());
    });
  },

  // 9. RAISE MAINTENANCE REQUEST
  raiseMaintenance(assetId, description, priority) {
    const asset = DB.assets.getById(assetId);
    if (!asset) return { ok: false, error: 'Asset not found.' };
    if (['Retired','Disposed'].includes(asset.status))
      return { ok: false, error: 'Cannot raise maintenance for a retired/disposed asset.' };
    const u = Auth.getCurrentUser();
    const req = DB.maintenanceRequests.create({
      asset_id: assetId, issue_description: description, priority: priority||'Medium',
      status: 'Pending', reported_by: u ? u.id : null,
    });
    this._notify('maintenance','New Maintenance Request',`${asset.name}: ${description.substring(0,60)}`,null);
    this._log(u,`Maintenance Raised: ${asset.name} (${asset.asset_tag}) — ${priority}`);
    return { ok: true, request: req };
  },

  // ── Private helpers ─────────────────────────────────────────
  _notify(type, title, message, userId) {
    DB.notifications.create({ type, title, message, user_id: userId || null, read: false });
  },
  _log(user, description) {
    DB.activityLogs.create({ user_id: user ? user.id : null, action: description.split(':')[0], description });
  },
};
