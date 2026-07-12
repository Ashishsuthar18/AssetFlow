// ============================================================
// js/views/analytics.js — Wireframe Screen 9
// Charts + Most Used + Idle Assets + Nearing Retirement + Export
// ============================================================
function renderAnalytics(container) {
  const user = Auth.getCurrentUser();
  if (!RBAC.can(user, 'analytics:view')) {
    container.innerHTML = `<div class="access-denied"><i data-lucide="lock"></i><h3>Access Denied</h3><p>Analytics requires Admin, Asset Manager, or Dept. Head role.</p></div>`;
    lucide.createIcons(); return;
  }

  const assets   = DB.assets.getAll();
  const allocs   = DB.allocations.getAll();
  const bookings = DB.bookings.getAll();
  const mreqs    = DB.maintenanceRequests.getAll();
  const depts    = DB.departments.getAll();

  // Compute most-used (by booking count)
  const bookingsByAsset = {};
  bookings.forEach(b => { bookingsByAsset[b.asset_id] = (bookingsByAsset[b.asset_id]||0)+1; });
  const mostUsed = assets
    .map(a => ({ asset:a, count: bookingsByAsset[a.id]||0 }))
    .sort((a,b) => b.count-a.count)
    .filter(x => x.count > 0)
    .slice(0, 5);

  // Idle assets (no booking or allocation in 60+ days)
  const cutoff60 = new Date(); cutoff60.setDate(cutoff60.getDate()-60);
  const idleAssets = assets.filter(a => {
    if (['Retired','Disposed'].includes(a.status)) return false;
    const lastBook  = bookings.filter(b=>b.asset_id===a.id).sort((x,y)=>new Date(y.start_time)-new Date(x.start_time))[0];
    const lastAlloc = allocs.filter(al=>al.asset_id===a.id).sort((x,y)=>new Date(y.createdAt)-new Date(x.createdAt))[0];
    const lastUsed  = [lastBook?.start_time, lastAlloc?.createdAt].filter(Boolean).sort().reverse()[0];
    return !lastUsed || new Date(lastUsed) < cutoff60;
  }).slice(0, 5);

  // Assets nearing retirement (>5 years old) or pending maintenance
  const fiveYearsAgo = new Date(); fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear()-5);
  const nearingRetirement = assets.filter(a => a.acquisition_date && new Date(a.acquisition_date) < fiveYearsAgo && !['Retired','Disposed'].includes(a.status));
  const pendingMaint = mreqs.filter(m => m.status==='Pending').map(m => ({ req:m, asset:DB.assets.getById(m.asset_id) }));

  const totalValue = assets.reduce((s,a)=>s+(parseFloat(a.acquisition_cost)||0),0);
  const utilRate   = assets.length ? Math.round((assets.filter(a=>a.status==='Allocated').length/assets.length)*100) : 0;

  container.innerHTML = `
  <div class="o-view-header">
    <div>
      <div class="o-view-title">Reports &amp; Analytics</div>
      <div class="o-view-sub">Utilization · Maintenance frequency · Most-used · Idle · Booking heatmap</div>
    </div>
    <div class="o-view-actions">
      <button class="btn btn-primary btn-sm" id="btn-export-report"><i data-lucide="download"></i> Export Report</button>
    </div>
  </div>

  <div class="view-body">
    <!-- Charts Row (wireframe: Utilization by department | Maintenance Frequency) -->
    <div class="grid-2" style="margin-bottom:14px">
      <div class="card">
        <div class="card-header"><div class="card-title"><i data-lucide="bar-chart-2"></i> Utilization by Department</div></div>
        <div class="chart-wrap" style="height:200px">
          <canvas id="chart-dept-util"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i data-lucide="trending-up"></i> Maintenance Frequency</div></div>
        <div class="chart-wrap" style="height:200px">
          <canvas id="chart-maint-freq"></canvas>
        </div>
      </div>
    </div>

    <!-- Most Used + Idle Assets (wireframe layout) -->
    <div class="grid-2" style="margin-bottom:14px">
      <div class="card">
        <div class="card-header"><div class="card-title"><i data-lucide="star"></i> Most Used Assets</div></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
          ${mostUsed.length ? mostUsed.map((x,i) => {
            const cat = DB.assetCategories.getById(x.asset.category_id);
            return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <div style="display:flex;align-items:center;gap:8px;min-width:0">
                <span style="font-size:0.72rem;font-weight:700;color:var(--text-muted);width:16px">${i+1}</span>
                <div>
                  <div style="font-size:0.84rem;font-weight:600">${escHtml(x.asset.name)}</div>
                  <div style="font-size:0.74rem;color:var(--text-muted)">${escHtml(cat?.name||'—')}</div>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:0.84rem;font-weight:700;color:var(--primary)">${x.count}</div>
                <div style="font-size:0.71rem;color:var(--text-muted)">booking${x.count!==1?'s':''}</div>
              </div>
            </div>`;
          }).join('') : `<div class="empty-state" style="padding:20px"><i data-lucide="star"></i><p>No booking data yet.</p></div>`}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i data-lucide="moon"></i> Idle Assets</div>
          <span style="font-size:0.76rem;color:var(--text-muted)">Unused 60+ days</span>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
          ${idleAssets.length ? idleAssets.map(a => {
            const cat = DB.assetCategories.getById(a.category_id);
            const ageMs = Date.now() - new Date(a.acquisition_date||a.createdAt);
            const ageDays = Math.floor(ageMs / 86400000);
            return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <div>
                <div style="font-size:0.84rem;font-weight:600">${escHtml(a.name)}</div>
                <div style="font-size:0.74rem;color:var(--text-muted)">${escHtml(a.asset_tag)} · ${escHtml(cat?.name||'—')}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <span class="badge badge-grey">unused ${ageDays}d</span>
              </div>
            </div>`;
          }).join('') : `<div class="empty-state" style="padding:20px"><i data-lucide="moon"></i><p>No idle assets detected.</p></div>`}
        </div>
      </div>
    </div>

    <!-- Assets due for maintenance / nearing retirement (wireframe) -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><div class="card-title"><i data-lucide="alert-triangle"></i> Assets Due for Maintenance / Nearing Retirement</div></div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:6px">
        ${pendingMaint.length ? pendingMaint.slice(0,3).map(({req,asset}) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light)">
          <div>
            <span style="font-weight:600">${escHtml(asset?.asset_tag||'—')} ${escHtml(asset?.name||'—')}</span>
            <span style="font-size:0.78rem;color:var(--text-secondary);margin-left:8px">: ${escHtml(req.issue_description?.substring(0,60)||'maintenance pending')}</span>
          </div>
          ${badge(req.priority)}
        </div>`).join('') : ''}

        ${nearingRetirement.length ? nearingRetirement.slice(0,4).map(a => {
          const yrs = Math.floor((Date.now()-new Date(a.acquisition_date))/31536000000);
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light)">
            <div>
              <span style="font-weight:600">${escHtml(a.asset_tag)} ${escHtml(a.name)}</span>
              <span style="font-size:0.78rem;color:var(--text-muted);margin-left:8px">: ${yrs} years old · nearing retirement</span>
            </div>
            <span class="badge badge-grey">Aging</span>
          </div>`;
        }).join('') : ''}

        ${!pendingMaint.length && !nearingRetirement.length ? `<div class="empty-state" style="padding:20px"><i data-lucide="check-circle"></i><p>No assets flagged for maintenance or retirement.</p></div>` : ''}
      </div>
    </div>

    <!-- Summary KPIs row -->
    <div class="analytics-kpi-row">
      <div class="kpi-card primary"><div class="kpi-icon primary"><i data-lucide="indian-rupee"></i></div>
        <div class="kpi-body"><div class="kpi-value">₹${(totalValue/100000).toFixed(1)}L</div><div class="kpi-label">Total Asset Value</div></div>
      </div>
      <div class="kpi-card info"><div class="kpi-icon info"><i data-lucide="trending-up"></i></div>
        <div class="kpi-body"><div class="kpi-value">${utilRate}%</div><div class="kpi-label">Utilization Rate</div></div>
      </div>
      <div class="kpi-card warning"><div class="kpi-icon warning"><i data-lucide="wrench"></i></div>
        <div class="kpi-body"><div class="kpi-value">${mreqs.filter(m=>m.status==='Resolved').length}</div><div class="kpi-label">Maintenance Resolved</div></div>
      </div>
      <div class="kpi-card success"><div class="kpi-icon success"><i data-lucide="calendar-check"></i></div>
        <div class="kpi-body"><div class="kpi-value">${bookings.filter(b=>b.status!=='Cancelled').length}</div><div class="kpi-label">Total Bookings</div></div>
      </div>
    </div>
  </div>`;

  lucide.createIcons();

  // ── CHARTS ────────────────────────────────────────────────
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = 'Inter';
    Chart.defaults.color = '#666';

    // Dept Utilization Bar
    const deptAllocs = depts.map(d => DB.allocations.getByDept(d.id).filter(a=>a.status==='Active').length);
    new Chart(document.getElementById('chart-dept-util'), {
      type: 'bar',
      data: {
        labels: depts.map(d => d.name.split(' ')[0]),
        datasets: [{ label:'Assets', data:deptAllocs, backgroundColor:'rgba(135,90,123,0.75)', borderRadius:4 }]
      },
      options: { plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,grid:{color:'#f0eeee'}},x:{grid:{display:false}}}, maintainAspectRatio:false }
    });

    // Maintenance Frequency Line
    const months = Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-5+i);return d;});
    const mFreq  = months.map(m => mreqs.filter(r=>new Date(r.createdAt).getMonth()===m.getMonth()&&new Date(r.createdAt).getFullYear()===m.getFullYear()).length);
    new Chart(document.getElementById('chart-maint-freq'), {
      type: 'line',
      data: {
        labels: months.map(m=>m.toLocaleDateString('en-IN',{month:'short'})),
        datasets: [{ label:'Requests', data:mFreq, borderColor:'#dc3545', backgroundColor:'rgba(220,53,69,0.1)', tension:0.4, fill:true, pointRadius:4 }]
      },
      options: { plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,grid:{color:'#f0eeee'}},x:{grid:{display:false}}}, maintainAspectRatio:false }
    });
  }

  // Export Report (wireframe: red "Export report" button)
  document.getElementById('btn-export-report')?.addEventListener('click', _exportFullReport);

  function _exportFullReport() {
    const rows = [
      ['AssetFlow — Full Report'],
      [`Generated: ${new Date().toLocaleString('en-IN')}`],
      [],
      ['ASSET SUMMARY'],
      ['Total Assets', assets.length],
      ['Available', assets.filter(a=>a.status==='Available').length],
      ['Allocated', assets.filter(a=>a.status==='Allocated').length],
      ['Under Maintenance', assets.filter(a=>a.status==='Under Maintenance').length],
      ['Lost', assets.filter(a=>a.status==='Lost').length],
      ['Total Value (₹)', totalValue],
      ['Utilization Rate (%)', utilRate],
      [],
      ['MOST USED ASSETS'],
      ['Asset Tag','Asset Name','Category','Bookings'],
      ...mostUsed.map(x => [x.asset.asset_tag, x.asset.name, DB.assetCategories.getById(x.asset.category_id)?.name||'', x.count]),
      [],
      ['IDLE ASSETS (60+ days)'],
      ['Asset Tag','Asset Name','Location','Status'],
      ...idleAssets.map(a => [a.asset_tag, a.name, a.location||'', a.status]),
      [],
      ['NEARING RETIREMENT (5+ years)'],
      ['Asset Tag','Asset Name','Acquisition Date','Age (years)'],
      ...nearingRetirement.map(a => [a.asset_tag, a.name, a.acquisition_date||'', Math.floor((Date.now()-new Date(a.acquisition_date))/31536000000)]),
      [],
      ['MAINTENANCE SUMMARY'],
      ['Status','Count'],
      ...['Pending','Approved','In Progress','Resolved','Rejected'].map(s => [s, mreqs.filter(m=>m.status===s).length]),
      [],
      ['DEPARTMENT ALLOCATION SUMMARY'],
      ['Department','Active Allocations','Overdue'],
      ...depts.map(d => [d.name, DB.allocations.getByDept(d.id).filter(a=>a.status==='Active').length, Engine.getOverdueAllocations().filter(a=>a.department_id===d.id).length]),
    ];

    const csv = rows.map(r=>r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href=url; link.download=`AssetFlow_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click(); URL.revokeObjectURL(url);
    App.toast('Report exported successfully!','success');
  }
}
