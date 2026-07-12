// ============================================================
// js/views/assetDirectory.js — Asset Directory + CSV Import
// New: Import CSV button, file picker, template download
// ============================================================
function renderAssetDirectory(container) {
  const user = Auth.getCurrentUser();
  let filter = { status:'', category:'', search:'' };
  let selected = new Set();

  function render() {
    const categories = DB.assetCategories.getAll();
    let assets = DB.assets.getAll();
    if (filter.status)   assets = assets.filter(a => a.status === filter.status);
    if (filter.category) assets = assets.filter(a => a.category_id === parseInt(filter.category));
    if (filter.search) {
      const q = filter.search.toLowerCase();
      assets = assets.filter(a => (a.name+a.asset_tag+(a.serial_number||'')).toLowerCase().includes(q));
    }
    assets.sort((a, b) => a.asset_tag.localeCompare(b.asset_tag));

    container.innerHTML = `
    <div class="o-view-header">
      <div>
        <div class="o-view-title">Asset Directory</div>
        <div class="o-view-sub">${assets.length} of ${DB.assets.getAll().length} assets shown</div>
      </div>
      <div class="o-view-actions">
        ${RBAC.can(user,'assets:register') ? `
          <button class="btn btn-secondary btn-sm" id="btn-import-asset" title="Import CSV"><i data-lucide="upload"></i> Import CSV</button>
          <button class="btn btn-secondary btn-sm" id="btn-dl-template" title="Download CSV template"><i data-lucide="file-spreadsheet"></i> Template</button>
        ` : ''}
        ${RBAC.can(user,'assets:export') ? `<button class="btn btn-secondary btn-sm" id="btn-export-asset"><i data-lucide="download"></i> Export CSV</button>` : ''}
        ${RBAC.can(user,'assets:register') ? `<button class="btn btn-primary btn-sm" id="btn-new-asset"><i data-lucide="plus"></i> Register Asset</button>` : ''}
      </div>
    </div>

    <!-- Hidden file input for import -->
    <input type="file" id="asset-import-input" accept=".csv" style="display:none">

    <div class="filter-bar">
      <div class="search-wrap">
        <i data-lucide="search"></i>
        <input class="input search-input" type="text" placeholder="Search name, tag, serial…"
          value="${escHtml(filter.search)}" id="asset-search">
      </div>
      <select class="input filter-select" id="asset-status-filter">
        <option value="">All Statuses</option>
        ${['Available','Allocated','Reserved','Under Maintenance','Lost','Retired','Disposed'].map(s=>`<option value="${s}" ${filter.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
      <select class="input filter-select" id="asset-cat-filter">
        <option value="">All Categories</option>
        ${categories.map(c=>`<option value="${c.id}" ${filter.category==c.id?'selected':''}>${escHtml(c.name)}</option>`).join('')}
      </select>
      ${filter.status||filter.category||filter.search ? `<button class="btn btn-ghost btn-sm" id="btn-clear-filter"><i data-lucide="x"></i> Clear</button>` : ''}
    </div>

    <div class="o-list-view">
      <div class="table-wrap"><table class="o-table">
        <thead><tr>
          <th class="cb-col"><input type="checkbox" id="asset-cb-all"></th>
          <th>Tag</th><th>Name</th><th>Category</th><th>Serial No.</th>
          <th>Status</th><th>Condition</th><th>Location</th><th>Holder</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${assets.length ? assets.map(a => {
            const cat   = DB.assetCategories.getById(a.category_id);
            const alloc = DB.allocations.getActiveByAsset(a.id);
            const holder= alloc ? DB.users.getById(alloc.user_id) : null;
            return `<tr>
              <td class="cb-col"><input type="checkbox" class="asset-cb" value="${a.id}" ${selected.has(a.id)?'checked':''}></td>
              <td><span class="tag-chip">${escHtml(a.asset_tag)}</span></td>
              <td style="font-weight:600;max-width:180px">${escHtml(a.name)}</td>
              <td style="color:var(--text-muted);font-size:0.82rem">${escHtml(cat?.name||'—')}</td>
              <td><span style="font-family:monospace;font-size:0.78rem;color:var(--text-secondary)">${escHtml(a.serial_number||'—')}</span></td>
              <td>${badge(a.status)}</td>
              <td>${badge(a.condition||'Good')}</td>
              <td style="font-size:0.82rem;color:var(--text-muted)">${escHtml(a.location||'—')}</td>
              <td>${holder ? `<div class="user-chip-xs"><div class="avatar-xs">${holder.name[0]}</div><span style="font-size:0.79rem">${escHtml(holder.name)}</span></div>` : `<span style="color:var(--text-light);font-size:0.8rem">—</span>`}</td>
              <td><div class="action-btns">
                <button class="btn btn-xs btn-ghost asset-view-btn" data-id="${a.id}" title="View"><i data-lucide="eye"></i></button>
                ${RBAC.can(user,'assets:register') ? `<button class="btn btn-xs btn-ghost asset-edit-btn" data-id="${a.id}" title="Edit"><i data-lucide="pencil"></i></button>` : ''}
                ${RBAC.can(user,'allocations:create') && a.status==='Available' ? `<button class="btn btn-xs btn-primary asset-alloc-btn" data-id="${a.id}" title="Allocate"><i data-lucide="git-branch"></i></button>` : ''}
                ${RBAC.can(user,'maintenance:create') && !['Retired','Disposed'].includes(a.status) ? `<button class="btn btn-xs btn-secondary asset-maint-btn" data-id="${a.id}" title="Maintenance"><i data-lucide="wrench"></i></button>` : ''}
              </div></td>
            </tr>`;
          }).join('') : `<tr><td colspan="10"><div class="empty-state">
            <i data-lucide="package"></i><h3>No assets found</h3>
            <p>${filter.search||filter.status||filter.category?'Try clearing filters.':'Register your first asset or import a CSV.'}</p>
            ${RBAC.can(user,'assets:register') ? `<div style="display:flex;gap:8px;margin-top:8px;justify-content:center"><button class="btn btn-primary btn-sm" id="empty-new-btn"><i data-lucide="plus"></i> Register</button><button class="btn btn-secondary btn-sm" id="empty-import-btn"><i data-lucide="upload"></i> Import CSV</button></div>` : ''}
          </div></td></tr>`}
        </tbody>
      </table></div>
      <div class="o-table-footer">
        <span id="asset-sel-count">${selected.size} selected</span>
        <span style="font-size:0.78rem;color:var(--text-muted)">${assets.length} records</span>
      </div>
    </div>`;

    lucide.createIcons();

    // ── Attach all events via addEventListener ───────────────
    document.getElementById('asset-search')?.addEventListener('input', e => { filter.search = e.target.value; render(); });
    document.getElementById('asset-status-filter')?.addEventListener('change', e => { filter.status = e.target.value; render(); });
    document.getElementById('asset-cat-filter')?.addEventListener('change', e => { filter.category = e.target.value; render(); });
    document.getElementById('btn-clear-filter')?.addEventListener('click', () => { filter={status:'',category:'',search:''}; render(); });
    document.getElementById('asset-cb-all')?.addEventListener('change', e => {
      document.querySelectorAll('.asset-cb').forEach(el => { el.checked = e.target.checked; selected[e.target.checked?'add':'delete'](parseInt(el.value)); });
      document.getElementById('asset-sel-count').textContent = `${selected.size} selected`;
    });
    document.querySelectorAll('.asset-cb').forEach(el => {
      el.addEventListener('change', e => { parseInt(e.target.value); e.target.checked ? selected.add(parseInt(e.target.value)) : selected.delete(parseInt(e.target.value)); document.getElementById('asset-sel-count').textContent = `${selected.size} selected`; });
    });

    document.getElementById('btn-new-asset')?.addEventListener('click', _assetNew);
    document.getElementById('btn-export-asset')?.addEventListener('click', _assetExport);
    document.getElementById('btn-import-asset')?.addEventListener('click', () => document.getElementById('asset-import-input')?.click());
    document.getElementById('btn-dl-template')?.addEventListener('click', _assetDownloadTemplate);
    document.getElementById('empty-new-btn')?.addEventListener('click', _assetNew);
    document.getElementById('empty-import-btn')?.addEventListener('click', () => document.getElementById('asset-import-input')?.click());

    document.getElementById('asset-import-input')?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) _assetImportCSV(file);
      e.target.value = ''; // reset so same file can be re-selected
    });

    document.querySelectorAll('.asset-view-btn').forEach(btn => btn.addEventListener('click', () => _assetView(parseInt(btn.dataset.id))));
    document.querySelectorAll('.asset-edit-btn').forEach(btn => btn.addEventListener('click', () => _assetEdit(parseInt(btn.dataset.id))));
    document.querySelectorAll('.asset-alloc-btn').forEach(btn => btn.addEventListener('click', () => App.navigate('allocations', { preAssetId: parseInt(btn.dataset.id) })));
    document.querySelectorAll('.asset-maint-btn').forEach(btn => btn.addEventListener('click', () => _assetMaintenance(parseInt(btn.dataset.id))));
  }

  // ── VIEW ASSET ────────────────────────────────────────────
  function _assetView(id) {
    const a = DB.assets.getById(id);
    const cat = DB.assetCategories.getById(a.category_id);
    const alloc = DB.allocations.getActiveByAsset(id);
    const holder = alloc ? DB.users.getById(alloc.user_id) : null;
    showModal(
      `<i data-lucide="package"></i> ${escHtml(a.name)}`,
      `<div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Asset Tag</div><span class="tag-chip">${escHtml(a.asset_tag)}</span></div>
        <div class="detail-item"><div class="detail-label">Status</div>${badge(a.status)}</div>
        <div class="detail-item"><div class="detail-label">Category</div><span>${escHtml(cat?.name||'—')}</span></div>
        <div class="detail-item"><div class="detail-label">Condition</div>${badge(a.condition||'Good')}</div>
        <div class="detail-item"><div class="detail-label">Serial Number</div><code style="font-size:0.82rem">${escHtml(a.serial_number||'—')}</code></div>
        <div class="detail-item"><div class="detail-label">Location</div>${escHtml(a.location||'—')}</div>
        <div class="detail-item"><div class="detail-label">Acquisition Date</div>${fmtDate(a.acquisition_date)}</div>
        <div class="detail-item"><div class="detail-label">Acquisition Cost</div>${a.acquisition_cost ? `₹${Number(a.acquisition_cost).toLocaleString('en-IN')}` : '—'}</div>
        <div class="detail-item"><div class="detail-label">Shared Resource</div>${badge(a.is_shared_resource?'Reserved':'Available')}</div>
        <div class="detail-item"><div class="detail-label">Current Holder</div>${holder ? `<div class="user-chip-xs"><div class="avatar-xs">${holder.name[0]}</div>${escHtml(holder.name)}</div>` : '—'}</div>
      </div>`,
      `<button class="btn btn-secondary" id="m-close">Close</button>
       ${RBAC.can(user,'assets:register') ? `<button class="btn btn-primary" id="m-edit"><i data-lucide="pencil"></i> Edit</button>` : ''}`
    );
    document.getElementById('m-close')?.addEventListener('click', closeModal);
    document.getElementById('m-edit')?.addEventListener('click', () => { closeModal(); _assetEdit(id); });
  }

  // ── EDIT ASSET ────────────────────────────────────────────
  function _assetEdit(id) {
    const a = DB.assets.getById(id);
    const categories = DB.assetCategories.getAll();
    showModal(
      `<i data-lucide="pencil"></i> Edit Asset — ${escHtml(a.name)}`,
      `<div class="form-stack">
        <div class="form-row">
          <div class="form-group"><label class="form-label required">Asset Name</label><input class="input" id="e-name" value="${escHtml(a.name)}" required></div>
          <div class="form-group"><label class="form-label">Category</label>
            <select class="input" id="e-cat">
              ${categories.map(c=>`<option value="${c.id}" ${c.id===a.category_id?'selected':''}>${escHtml(c.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Status</label>
            <select class="input" id="e-status">
              ${['Available','Allocated','Reserved','Under Maintenance','Lost','Retired','Disposed'].map(s=>`<option ${s===a.status?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Condition</label>
            <select class="input" id="e-cond">
              ${['Excellent','Good','Fair','Poor','Damaged'].map(c=>`<option ${c===a.condition?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Serial Number</label><input class="input" id="e-serial" value="${escHtml(a.serial_number||'')}"></div>
          <div class="form-group"><label class="form-label">Location</label><input class="input" id="e-loc" value="${escHtml(a.location||'')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Acquisition Cost (₹)</label><input class="input" type="number" id="e-cost" value="${a.acquisition_cost||''}"></div>
          <div class="form-group"><label class="form-label">Acquisition Date</label><input class="input" type="date" id="e-date" value="${a.acquisition_date||''}"></div>
        </div>
        <label class="checkbox-label"><input type="checkbox" id="e-shared" ${a.is_shared_resource?'checked':''}> Mark as Shared Resource (bookable)</label>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-save"><i data-lucide="save"></i> Save</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-save')?.addEventListener('click', () => {
      DB.assets.update(id, {
        name: document.getElementById('e-name')?.value,
        category_id: parseInt(document.getElementById('e-cat')?.value),
        status: document.getElementById('e-status')?.value,
        condition: document.getElementById('e-cond')?.value,
        serial_number: document.getElementById('e-serial')?.value,
        location: document.getElementById('e-loc')?.value,
        acquisition_cost: document.getElementById('e-cost')?.value||null,
        acquisition_date: document.getElementById('e-date')?.value||null,
        is_shared_resource: document.getElementById('e-shared')?.checked,
        updatedAt: new Date().toISOString()
      });
      App.toast('Asset updated!','success'); closeModal(); render();
    });
  }

  // ── REGISTER NEW ASSET ────────────────────────────────────
  function _assetNew() {
    const categories = DB.assetCategories.getAll();
    showModal(
      `<i data-lucide="plus"></i> Register New Asset`,
      `<div class="form-stack">
        <div class="form-row">
          <div class="form-group"><label class="form-label required">Asset Name</label><input class="input" id="n-name" placeholder="e.g. Dell Latitude 7420" required></div>
          <div class="form-group"><label class="form-label required">Category</label>
            <select class="input" id="n-cat">
              <option value="">— Select —</option>
              ${categories.map(c=>`<option value="${c.id}">${escHtml(c.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Serial Number</label><input class="input" id="n-serial" placeholder="SN-XXXX"></div>
          <div class="form-group"><label class="form-label">Location</label><input class="input" id="n-loc" placeholder="Office / Floor / Desk"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Acquisition Cost (₹)</label><input class="input" type="number" id="n-cost" min="0" placeholder="e.g. 45000"></div>
          <div class="form-group"><label class="form-label">Acquisition Date</label><input class="input" type="date" id="n-date" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Condition</label>
            <select class="input" id="n-cond">
              <option value="Good" selected>Good</option><option value="Excellent">Excellent</option>
              <option value="Fair">Fair</option><option value="Poor">Poor</option>
            </select>
          </div>
          <div class="form-group" style="justify-content:flex-end;padding-top:18px">
            <label class="checkbox-label"><input type="checkbox" id="n-shared"> Shared Resource (bookable)</label>
          </div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-create"><i data-lucide="save"></i> Register</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-create')?.addEventListener('click', () => {
      const name = document.getElementById('n-name')?.value?.trim();
      const cat  = document.getElementById('n-cat')?.value;
      if (!name || !cat) { App.toast('Name and category are required.','error'); return; }
      const asset = DB.assets.createWithTag({
        name, category_id: parseInt(cat),
        serial_number: document.getElementById('n-serial')?.value || null,
        location: document.getElementById('n-loc')?.value || null,
        acquisition_cost: document.getElementById('n-cost')?.value || null,
        acquisition_date: document.getElementById('n-date')?.value || null,
        condition: document.getElementById('n-cond')?.value || 'Good',
        is_shared_resource: document.getElementById('n-shared')?.checked || false,
        status: 'Available',
      });
      Engine._log(user, `Asset Registered: ${asset.name} (${asset.asset_tag})`);
      App.toast(`Asset registered as ${asset.asset_tag}!`, 'success'); closeModal(); render(); });
  }

  // ── EXPORT CSV ────────────────────────────────────────────
  function _assetExport() {
    const assets = DB.assets.getAll();
    const rows = [
      ['AssetFlow — Asset Export', `Generated: ${new Date().toLocaleString('en-IN')}`],
      [],
      ['Tag','Name','Category','Serial No.','Status','Condition','Location','Acquisition Cost (₹)','Acquisition Date','Shared Resource'],
    ];
    assets.forEach(a => {
      const cat = DB.assetCategories.getById(a.category_id);
      rows.push([
        a.asset_tag, a.name, cat?.name||'', a.serial_number||'',
        a.status, a.condition||'Good', a.location||'',
        a.acquisition_cost||'', a.acquisition_date||'',
        a.is_shared_resource?'Yes':'No'
      ]);
    });
    _downloadCSV(rows, `AssetFlow_Assets_${new Date().toISOString().split('T')[0]}.csv`);
    App.toast(`Exported ${assets.length} assets!`, 'success');
  }

  // ── DOWNLOAD TEMPLATE ─────────────────────────────────────
  function _assetDownloadTemplate() {
    const rows = [
      ['# AssetFlow CSV Import Template'],
      ['# Required: Name, Category'],
      ['# Category must match an existing category name (case-sensitive)'],
      ['# Status: Available | Reserved | Under Maintenance | Lost | Retired | Disposed'],
      ['# Condition: Excellent | Good | Fair | Poor | Damaged'],
      ['# Shared Resource: Yes | No'],
      [],
      ['Name','Category','Serial No.','Location','Acquisition Cost (₹)','Acquisition Date (YYYY-MM-DD)','Condition','Shared Resource'],
      ['Dell Latitude 7420','Laptops & Computers','SN-DL7420-001','IT Dept Floor 2','62000','2024-01-15','Good','No'],
      ['HP LaserJet Pro M404','Printers','SN-HP404-002','Admin Block Room 3','18500','2024-02-10','Excellent','Yes'],
      ['Conference Room A2','Rooms & Spaces','','Building B Floor 1','','','Excellent','Yes'],
    ];
    _downloadCSV(rows, 'AssetFlow_Import_Template.csv');
    App.toast('Template downloaded! Fill it and re-import.', 'info');
  }

  // ── IMPORT CSV ────────────────────────────────────────────
  function _assetImportCSV(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text  = e.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        if (lines.length < 2) { App.toast('CSV appears empty or has only headers.','error'); return; }

        // Parse header row
        const headers = _parseCSVRow(lines[0]).map(h => h.toLowerCase().replace(/[\s()₹\-\/]/g,''));
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const catIdx  = headers.findIndex(h => h.includes('category') || h.includes('cat'));
        if (nameIdx === -1 || catIdx === -1) {
          App.toast('CSV must have "Name" and "Category" columns.','error'); return;
        }

        const serialIdx  = headers.findIndex(h => h.includes('serial'));
        const locIdx     = headers.findIndex(h => h.includes('location') || h.includes('loc'));
        const costIdx    = headers.findIndex(h => h.includes('cost') || h.includes('price'));
        const dateIdx    = headers.findIndex(h => h.includes('date') || h.includes('acq'));
        const condIdx    = headers.findIndex(h => h.includes('condition') || h.includes('cond'));
        const sharedIdx  = headers.findIndex(h => h.includes('shared'));

        const categories = DB.assetCategories.getAll();
        let imported = 0, skipped = 0, errors = [];

        lines.slice(1).forEach((line, idx) => {
          if (!line.trim()) return;
          const cols = _parseCSVRow(line);
          const name = cols[nameIdx]?.trim();
          const catName = cols[catIdx]?.trim();
          if (!name) { skipped++; return; }

          // Find or create category
          let cat = categories.find(c => c.name.toLowerCase() === catName?.toLowerCase());
          if (!cat && catName) {
            cat = DB.assetCategories.create({ name: catName, icon:'📦' });
            categories.push(cat);
          }
          if (!cat) { errors.push(`Row ${idx+2}: Category "${catName}" could not be resolved.`); skipped++; return; }

          const condVal = cols[condIdx]?.trim();
          const validConds = ['Excellent','Good','Fair','Poor','Damaged'];
          const condition = validConds.includes(condVal) ? condVal : 'Good';

          const isShared = sharedIdx>=0 && ['yes','true','1'].includes((cols[sharedIdx]||'').toLowerCase().trim());

          DB.assets.createWithTag({
            name,
            category_id: cat.id,
            serial_number: serialIdx>=0 ? (cols[serialIdx]?.trim()||null) : null,
            location: locIdx>=0 ? (cols[locIdx]?.trim()||null) : null,
            acquisition_cost: costIdx>=0 ? (parseFloat(cols[costIdx]?.replace(/[^0-9.]/g,''))||null) : null,
            acquisition_date: dateIdx>=0 ? (cols[dateIdx]?.trim()||null) : null,
            condition, is_shared_resource: isShared, status: 'Available',
          });
          imported++;
        });

        Engine._log(user, `CSV Import: ${imported} assets imported, ${skipped} skipped`);

        if (errors.length) {
          showModal(
            `<i data-lucide="alert-triangle"></i> Import Complete (${imported} imported, ${skipped} skipped)`,
            `<div class="form-stack">
              <div class="success-box"><i data-lucide="check-circle"></i> <strong>${imported} assets imported successfully!</strong></div>
              <div class="alert alert-warning"><i data-lucide="alert-triangle"></i> ${errors.length} rows had issues:</div>
              <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;font-size:0.78rem;max-height:150px;overflow-y:auto">
                ${errors.map(e=>escHtml(e)).join('<br>')}
              </div>
            </div>`,
            `<button class="btn btn-primary" id="m-ok">OK</button>`
          );
          document.getElementById('m-ok')?.addEventListener('click', closeModal);
        } else {
          App.toast(`✓ ${imported} assets imported successfully!`, 'success');
        }
        render();
      } catch(err) {
        App.toast('Failed to parse CSV: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  // Parse a single CSV line (handles quoted fields with commas)
  function _parseCSVRow(line) {
    const result = [];
    let cur = '', inQ = false;
    for (let i=0; i<line.length; i++) {
      const ch = line[i];
      if (ch==='"') { inQ=!inQ; }
      else if (ch===',' && !inQ) { result.push(cur); cur=''; }
      else { cur += ch; }
    }
    result.push(cur);
    return result.map(v => v.replace(/^"|"$/g,'').trim());
  }

  function _downloadCSV(rows, filename) {
    const csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  }

  // ── MAINTENANCE SHORTCUT ─────────────────────────────────
  function _assetMaintenance(id) {
    const asset = DB.assets.getById(id);
    showModal(
      `<i data-lucide="wrench"></i> Raise Maintenance — ${escHtml(asset?.name||'')}`,
      `<div class="form-stack">
        <div class="form-group"><label class="form-label required">Priority</label>
          <select class="input" id="qm-priority">
            <option value="Low">Low</option><option value="Medium" selected>Medium</option>
            <option value="High">High</option><option value="Critical">Critical</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label required">Issue Description</label>
          <textarea class="input" id="qm-desc" rows="4" placeholder="Describe the fault…" required></textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" id="m-cancel">Cancel</button>
       <button class="btn btn-primary" id="m-submit"><i data-lucide="send"></i> Submit</button>`
    );
    document.getElementById('m-cancel')?.addEventListener('click', closeModal);
    document.getElementById('m-submit')?.addEventListener('click', () => {
      const desc = document.getElementById('qm-desc')?.value?.trim();
      const pri  = document.getElementById('qm-priority')?.value;
      if (!desc) { App.toast('Description required.','error'); return; }
      const res = Engine.raiseMaintenance(id, desc, pri);
      if (res.ok) { App.toast('Maintenance request submitted!','success'); closeModal(); render(); }
      else App.toast(res.error,'error');
    });
  }

  render();
}
