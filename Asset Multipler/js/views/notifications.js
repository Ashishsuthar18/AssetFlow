// ============================================================
// js/views/notifications.js — Activity Logs & Notifications
// Wireframe Screen 10: Tabs = All | Alerts | Approvals | Bookings
// ============================================================
function renderNotifications(container) {
  const user = Auth.getCurrentUser();
  let activeTab = 'all';

  // Mark unread as read when page opens
  DB.notifications.getForUser(user.id).forEach(n => {
    if (!n.read) DB.notifications.update(n.id, { read: true });
  });
  App.updateNotifBadge();

  function render() {
    const allNotifs = DB.notifications.getForUser(user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const logs = DB.activityLogs.getAll()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Tab filters matching wireframe Screen 10
    const alerts    = allNotifs.filter(n => ['overdue','audit'].includes(n.type));
    const approvals = allNotifs.filter(n => ['maintenance','transfer','allocation'].includes(n.type));
    const bookings  = allNotifs.filter(n => n.type === 'booking');

    const displayed = activeTab==='all'       ? allNotifs
                    : activeTab==='alerts'    ? alerts
                    : activeTab==='approvals' ? approvals
                    : bookings;

    const overdueCount = Engine.getOverdueAllocations().length;
    const pendingMaint = DB.maintenanceRequests.where(m => m.status==='Pending').length;

    container.innerHTML = `
    <div class="o-view-header">
      <div>
        <div class="o-view-title">Activity Logs &amp; Notifications</div>
        <div class="o-view-sub">${allNotifs.length} total · ${alerts.length} alert${alerts.length!==1?'s':''} · ${approvals.length} approval${approvals.length!==1?'s':''}</div>
      </div>
    </div>

    ${overdueCount ? `<div style="padding:10px 20px 0">
      <div class="alert alert-danger">
        <i data-lucide="alarm-clock"></i>
        <div><strong>Overdue Returns:</strong> ${overdueCount} asset${overdueCount>1?'s':''} past return date.
          <button class="btn btn-xs btn-danger" id="goto-allocs" style="margin-left:8px">View →</button>
        </div>
      </div>
    </div>` : ''}

    ${pendingMaint ? `<div style="padding:6px 20px 0">
      <div class="alert alert-warning">
        <i data-lucide="wrench"></i>
        <div><strong>${pendingMaint} Maintenance Pending</strong> — awaiting approval.
          <button class="btn btn-xs btn-warning" id="goto-maint" style="margin-left:8px">View →</button>
        </div>
      </div>
    </div>` : ''}

    <!-- Wireframe Screen 10 tabs: All | Alerts | Approvals | Bookings -->
    <div class="o-tabs">
      <button class="o-tab ${activeTab==='all'?'active':''}" id="ntab-all">
        All
        <span class="o-tab-badge" style="background:var(--green);color:#fff">${allNotifs.length}</span>
      </button>
      <button class="o-tab ${activeTab==='alerts'?'active':''}" id="ntab-alerts">
        Alerts
        ${alerts.length?`<span class="o-tab-badge" style="background:var(--red);color:#fff">${alerts.length}</span>`:''}
      </button>
      <button class="o-tab ${activeTab==='approvals'?'active':''}" id="ntab-approvals">
        Approvals
        ${approvals.length?`<span class="o-tab-badge" style="background:var(--yellow);color:#fff">${approvals.length}</span>`:''}
      </button>
      <button class="o-tab ${activeTab==='bookings'?'active':''}" id="ntab-bookings">
        Bookings
        ${bookings.length?`<span class="o-tab-badge" style="background:var(--blue);color:#fff">${bookings.length}</span>`:''}
      </button>
    </div>

    <div class="view-body">
      <div class="grid-2" style="align-items:start">

        <!-- LEFT: Notification feed (matches wireframe Screen 10 layout) -->
        <div class="card">
          <div class="notif-feed" style="max-height:540px;overflow-y:auto">
            ${displayed.length ? displayed.map(n => {
              const conf = _notifConfig(n.type);
              return `<div class="notif-row" data-id="${n.id}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-light);cursor:pointer;background:${n.read?'transparent':'#faf9fb'};transition:background 0.1s">
                <div style="width:9px;height:9px;border-radius:50%;background:${conf.dot};flex-shrink:0"></div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:0.84rem;color:var(--text)">${escHtml(n.message)}</div>
                </div>
                <div style="font-size:0.76rem;color:var(--text-muted);white-space:nowrap;flex-shrink:0">${timeAgo(n.createdAt)}</div>
              </div>`;
            }).join('') : `<div class="empty-state" style="padding:50px">
              <i data-lucide="bell"></i><h3>No notifications</h3><p>You're all caught up!</p>
            </div>`}
          </div>
        </div>

        <!-- RIGHT: Activity Log -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i data-lucide="activity"></i> Activity Log</div>
            <span style="font-size:0.76rem;color:var(--text-muted)">${logs.length} events</span>
          </div>
          <div style="max-height:540px;overflow-y:auto">
            ${logs.length ? logs.map(l => {
              const who = DB.users.getById(l.user_id);
              const imap = {'Asset':'package','Allocation':'git-branch','Booking':'calendar','Maintenance':'wrench','Transfer':'arrow-right-left','Audit':'clipboard-check','User':'user','Role':'shield','CSV':'upload'};
              const ik = Object.keys(imap).find(k => l.action?.includes(k));
              return `<div class="activity-item">
                <div class="activity-icon"><i data-lucide="${imap[ik]||'zap'}"></i></div>
                <div style="flex:1;min-width:0">
                  <div class="activity-desc"><strong>${escHtml(l.action)}</strong></div>
                  ${l.description&&l.description!==l.action?`<div style="font-size:0.77rem;color:var(--text-secondary);margin-top:2px;line-height:1.4">${escHtml(l.description)}</div>`:''}
                  <div class="activity-time">${who?escHtml(who.name)+' · ':''}${timeAgo(l.createdAt)}</div>
                </div>
              </div>`;
            }).join('') : `<div class="empty-state" style="padding:40px"><i data-lucide="inbox"></i><p>No activity yet.</p></div>`}
          </div>
        </div>
      </div>
    </div>`;

    lucide.createIcons();

    // Attach tab events
    document.getElementById('ntab-all')?.addEventListener('click',       () => { activeTab='all';       render(); });
    document.getElementById('ntab-alerts')?.addEventListener('click',    () => { activeTab='alerts';    render(); });
    document.getElementById('ntab-approvals')?.addEventListener('click', () => { activeTab='approvals'; render(); });
    document.getElementById('ntab-bookings')?.addEventListener('click',  () => { activeTab='bookings';  render(); });
    document.getElementById('goto-allocs')?.addEventListener('click',    () => App.navigate('allocations'));
    document.getElementById('goto-maint')?.addEventListener('click',     () => App.navigate('maintenance'));

    // Mark individual notification read on click
    document.querySelectorAll('.notif-row[data-id]').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.background = 'var(--bg)');
      el.addEventListener('mouseleave', () => el.style.background = el.dataset.read==='true' ? 'transparent' : '#faf9fb');
      el.addEventListener('click', () => {
        DB.notifications.update(parseInt(el.dataset.id), { read: true });
        App.updateNotifBadge(); render();
      });
    });
  }

  function _notifConfig(type) {
    const map = {
      overdue:     { dot:'var(--red)'    },
      audit:       { dot:'var(--orange)' },
      maintenance: { dot:'var(--yellow)' },
      transfer:    { dot:'var(--yellow)' },
      allocation:  { dot:'var(--blue)'   },
      booking:     { dot:'var(--blue)'   },
    };
    return map[type] || { dot:'var(--grey)' };
  }

  render();
}
