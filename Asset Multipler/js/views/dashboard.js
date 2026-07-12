// ============================================================
// js/views/dashboard.js — Wireframe Screen 2
// 6 KPI boxes (2×3), overdue banner, 3 action buttons, Recent Activity
// ============================================================
function renderDashboard(container) {
  const user = Auth.getCurrentUser();
  const kpi  = Engine.getKPIStats();
  const logs = DB.activityLogs.getAll().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8);
  const overdue = Engine.getOverdueAllocations();

  container.innerHTML = `
  <div class="o-view-header">
    <div>
      <div class="o-view-title">Today's Overview</div>
      <div class="o-view-sub">Welcome back, <strong>${escHtml(user.name)}</strong> · ${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
    </div>
  </div>

  <div class="view-body">
    <!-- KPI Grid: 2×3 like wireframe -->
    <div class="dash-kpi-grid">
      <div class="dash-kpi-box">
        <div class="dkb-label">Available</div>
        <div class="dkb-value">${kpi.available}</div>
      </div>
      <div class="dash-kpi-box allocated">
        <div class="dkb-label">Allocated</div>
        <div class="dkb-value">${kpi.allocated}</div>
      </div>
      <div class="dash-kpi-box maintenance">
        <div class="dkb-label">Under Maintenance</div>
        <div class="dkb-value">${kpi.underMaintenance}</div>
      </div>
      <div class="dash-kpi-box bookings">
        <div class="dkb-label">Active Bookings</div>
        <div class="dkb-value">${kpi.activeBookings}</div>
      </div>
      <div class="dash-kpi-box transfers">
        <div class="dkb-label">Pending Transfers</div>
        <div class="dkb-value">${kpi.pendingTransfers}</div>
      </div>
      <div class="dash-kpi-box returns">
        <div class="dkb-label">Upcoming Returns</div>
        <div class="dkb-value">${kpi.upcomingReturns}</div>
      </div>
    </div>

    <!-- Overdue banner (red, wireframe) -->
    ${overdue.length ? `
    <div class="dash-overdue-banner" id="dash-overdue-banner">
      <i data-lucide="alarm-clock"></i>
      <span>${overdue.length} asset${overdue.length>1?'s':''} overdue for return – flagged for follow-up</span>
      <button class="btn btn-xs" style="background:rgba(255,255,255,0.2);color:#fff;border-color:rgba(255,255,255,0.4);margin-left:auto" id="btn-view-overdue">View →</button>
    </div>` : ''}

    <!-- 3 Action Buttons (wireframe) -->
    <div class="dash-actions">
      ${RBAC.can(user,'assets:register') ? `<button class="btn btn-primary" id="dash-btn-register"><i data-lucide="plus"></i> + Register Asset</button>` : ''}
      <button class="btn btn-teal" id="dash-btn-book"><i data-lucide="calendar"></i> Book Resource</button>
      ${RBAC.can(user,'maintenance:create') ? `<button class="btn btn-secondary" id="dash-btn-maint"><i data-lucide="wrench"></i> Raise Request</button>` : ''}
    </div>

    <!-- Recent Activity -->
    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <div class="card-title"><i data-lucide="activity"></i> Recent Activity</div>
        <button class="btn btn-ghost btn-sm" id="dash-all-notifs"><i data-lucide="arrow-right"></i> All Notifications</button>
      </div>
      <div>
        ${logs.length ? logs.map(l => {
          const who = DB.users.getById(l.user_id);
          const imap = {'Asset':'package','Allocation':'git-branch','Booking':'calendar','Maintenance':'wrench','Transfer':'arrow-right-left','Audit':'clipboard-check','User':'user','CSV':'upload','Role':'shield'};
          const ik = Object.keys(imap).find(k => l.action?.includes(k));
          return `<div class="activity-item">
            <div class="activity-icon"><i data-lucide="${imap[ik]||'zap'}"></i></div>
            <div style="flex:1">
              <div class="activity-desc">${escHtml(l.description||l.action)}</div>
              <div class="activity-time">${who?escHtml(who.name)+' · ':''}${timeAgo(l.createdAt)}</div>
            </div>
          </div>`;
        }).join('') : `<div class="empty-state" style="padding:30px"><i data-lucide="inbox"></i><p>No recent activity.</p></div>`}
      </div>
    </div>

    <!-- Quick summary for Admin/Manager -->
    ${RBAC.can(user,'analytics:view') ? `
    <div class="grid-2" style="margin-top:14px">
      <div class="card">
        <div class="card-header"><div class="card-title"><i data-lucide="package"></i> Asset Summary</div></div>
        <div class="card-body">
          <div class="detail-grid">
            <div class="detail-item"><div class="detail-label">Total Assets</div><strong style="font-size:1.2rem">${kpi.total}</strong></div>
            <div class="detail-item"><div class="detail-label">Lost / Disposed</div><strong style="color:var(--red)">${kpi.lost + (DB.assets.where(a=>a.status==='Disposed').length)}</strong></div>
            <div class="detail-item"><div class="detail-label">Pending Maintenance</div><strong style="color:var(--yellow)">${kpi.pendingMaint}</strong></div>
            <div class="detail-item"><div class="detail-label">Overdue Returns</div><strong style="color:var(--red)">${kpi.overdueReturns}</strong></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i data-lucide="users"></i> Department Snapshot</div></div>
        <div class="table-wrap"><table class="o-table">
          <thead><tr><th>Department</th><th>Assets Held</th><th>Overdue</th></tr></thead>
          <tbody>${DB.departments.getAll().slice(0,4).map(d=>{
            const held = DB.allocations.getByDept(d.id).filter(a=>a.status==='Active').length;
            const od   = Engine.getOverdueAllocations().filter(a=>a.department_id===d.id).length;
            return `<tr>
              <td style="font-weight:600">${escHtml(d.name)}</td>
              <td>${held}</td>
              <td>${od?`<span style="color:var(--red);font-weight:700">${od}</span>`:'—'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>
    </div>` : ''}
  </div>`;

  lucide.createIcons();

  // Action buttons
  document.getElementById('btn-view-overdue')?.addEventListener('click',   () => App.navigate('allocations'));
  document.getElementById('dash-btn-register')?.addEventListener('click',  () => App.navigate('assets'));
  document.getElementById('dash-btn-book')?.addEventListener('click',      () => App.navigate('bookings'));
  document.getElementById('dash-btn-maint')?.addEventListener('click',     () => App.navigate('maintenance'));
  document.getElementById('dash-all-notifs')?.addEventListener('click',    () => App.navigate('notifications'));
}
