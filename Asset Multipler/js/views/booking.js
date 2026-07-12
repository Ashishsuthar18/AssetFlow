// ============================================================
// js/views/booking.js — Wireframe Screen 6
// Resource selector → Daily time-slot view → conflict in red dotted
// All events via addEventListener (no inline onclick)
// ============================================================
function renderBookings(container) {
  const user = Auth.getCurrentUser();
  const today = new Date();
  let viewDate = new Date(today);
  let selectedAssetId = null;

  function render() {
    if (!RBAC.can(user, 'bookings:view')) {
      container.innerHTML = `<div class="access-denied"><i data-lucide="lock"></i><h3>Access Denied</h3></div>`;
      lucide.createIcons(); return;
    }

    // Only shared resources can be booked
    const resources = DB.assets.where(a => a.is_shared_resource && !['Retired','Disposed'].includes(a.status));
    if (!selectedAssetId && resources.length) selectedAssetId = resources[0].id;
    const selAsset = selectedAssetId ? DB.assets.getById(selectedAssetId) : null;

    const myBookings = DB.bookings.getByUser(user.id)
      .filter(b => b.status !== 'Cancelled')
      .sort((a,b) => new Date(a.start_time)-new Date(b.start_time));

    container.innerHTML = `
    <div class="o-view-header">
      <div>
        <div class="o-view-title">Resource Booking</div>
        <div class="o-view-sub">Book shared resources — rooms, projectors, vehicles. Conflicts shown in real-time.</div>
      </div>
      ${RBAC.can(user,'bookings:create') ? `<div class="o-view-actions"><button class="btn btn-primary btn-sm" id="btn-quick-book"><i data-lucide="plus"></i> Book a Slot</button></div>` : ''}
    </div>

    <div class="view-body">
      <div class="grid-2" style="align-items:start">

        <!-- LEFT: Resource selector + Day view (wireframe Screen 6) -->
        <div>
          <!-- Resource picker (wireframe: dropdown showing "Conference room B2 - Tue, 7 Jul") -->
          <div class="card" style="margin-bottom:12px">
            <div class="card-header"><div class="card-title"><i data-lucide="layers"></i> Resource</div></div>
            <div class="card-body">
              <select class="input" id="resource-select">
                <option value="">— Select a resource —</option>
                ${resources.map(a => {
                  const cat = DB.assetCategories.getById(a.category_id);
                  return `<option value="${a.id}" ${a.id===selectedAssetId?'selected':''}>
                    ${escHtml(a.name)} · ${viewDate.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}
                  </option>`;
                }).join('')}
              </select>
              ${resources.length===0 ? `<p class="field-note" style="margin-top:8px">No shared resources found. Mark assets as "Shared Resource" to enable booking.</p>` : ''}
            </div>
          </div>

          <!-- Day view time slots (wireframe style) -->
          ${selAsset ? renderDayView(selAsset, viewDate) : `<div class="card"><div class="empty-state" style="padding:40px"><i data-lucide="calendar"></i><p>Select a resource above.</p></div></div>`}

          <!-- Date nav -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:0 2px">
            <button class="btn btn-secondary btn-sm" id="btn-prev-day"><i data-lucide="chevron-left"></i> Prev</button>
            <span style="font-size:0.84rem;font-weight:600;color:var(--text)">
              ${viewDate.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </span>
            <button class="btn btn-secondary btn-sm" id="btn-next-day">Next <i data-lucide="chevron-right"></i></button>
          </div>
        </div>

        <!-- RIGHT: My bookings + resource list -->
        <div>
          <div class="card" style="margin-bottom:12px">
            <div class="card-header">
              <div class="card-title"><i data-lucide="calendar-check"></i> My Bookings</div>
              <span style="font-size:0.76rem;color:var(--text-muted)">${myBookings.length} upcoming</span>
            </div>
            <div style="max-height:300px;overflow-y:auto">
              ${myBookings.length ? myBookings.map(b => {
                const asset = DB.assets.getById(b.asset_id);
                const isToday = new Date(b.start_time).toDateString() === today.toDateString();
                return `<div style="padding:11px 16px;border-bottom:1px solid var(--border-light);display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
                  <div>
                    <div style="font-size:0.84rem;font-weight:600">${escHtml(asset?.name||'—')}</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">
                      ${isToday?'<span style="color:var(--green);font-weight:600">Today</span> · ':''}${fmtDate(b.start_time)} · ${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}
                    </div>
                    ${b.purpose?`<div style="font-size:0.76rem;color:var(--text-secondary);margin-top:2px">${escHtml(b.purpose)}</div>`:''}
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
                    ${badge(b.status)}
                    ${(RBAC.can(user,'bookings:cancel')||b.user_id===user.id)&&b.status==='Upcoming' ? `<button class="btn btn-xs btn-danger-outline btn-cancel-booking" data-id="${b.id}"><i data-lucide="x"></i> Cancel</button>` : ''}
                  </div>
                </div>`;
              }).join('') : `<div class="empty-state" style="padding:30px"><i data-lucide="calendar"></i><p>No upcoming bookings.</p></div>`}
            </div>
          </div>

          <!-- All shared resources list -->
          <div class="card">
            <div class="card-header"><div class="card-title"><i data-lucide="layers"></i> Available Resources</div></div>
            <div>
              ${resources.map(r => {
                const cat = DB.assetCategories.getById(r.category_id);
                const todayBooks = DB.bookings.getByAsset(r.id).filter(b => !['Cancelled','Completed'].includes(b.status) && new Date(b.start_time).toDateString()===today.toDateString());
                return `<div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border-light);cursor:pointer" class="resource-row" data-rid="${r.id}">
                  <div style="width:36px;height:36px;border-radius:var(--radius-sm);background:var(--primary-bg);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <i data-lucide="${cat?.name?.includes('Room')||cat?.name?.includes('room')?'door-open':cat?.name?.includes('Project')?'projector':cat?.name?.includes('Vehicle')?'car':'layers'}"></i>
                  </div>
                  <div style="flex:1">
                    <div style="font-weight:600;font-size:0.84rem">${escHtml(r.name)}</div>
                    <div style="font-size:0.74rem;color:var(--text-muted)">${escHtml(cat?.name||'')} · ${escHtml(r.location||'—')}</div>
                  </div>
                  <div>
                    ${todayBooks.length ? `<span class="badge badge-allocated">${todayBooks.length} booked today</span>` : `<span class="badge badge-available">Free today</span>`}
                  </div>
                </div>`;
              }).join('') || `<div class="empty-state" style="padding:30px"><i data-lucide="layers"></i><p>No shared resources yet.</p></div>`}
            </div>
          </div>
        </div>
      </div>
    </div>`;

    lucide.createIcons();

    // Events
    document.getElementById('resource-select')?.addEventListener('change', e => { selectedAssetId=parseInt(e.target.value)||null; render(); });
    document.getElementById('btn-prev-day')?.addEventListener('click', () => { viewDate.setDate(viewDate.getDate()-1); render(); });
    document.getElementById('btn-next-day')?.addEventListener('click', () => { viewDate.setDate(viewDate.getDate()+1); render(); });
    document.getElementById('btn-quick-book')?.addEventListener('click', () => showBookModal(selectedAssetId, viewDate));

    document.querySelectorAll('.resource-row[data-rid]').forEach(el => {
      el.addEventListener('click', () => { selectedAssetId=parseInt(el.dataset.rid); render(); });
    });
    document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); _cancelBooking(parseInt(btn.dataset.id)); });
    });
    document.querySelectorAll('.time-slot-bookable').forEach(btn => {
      btn.addEventListener('click', () => {
        const hr = parseInt(btn.dataset.hour);
        showBookModal(selectedAssetId, viewDate, hr);
      });
    });
  }

  // ── DAY VIEW (wireframe: time-slot rows, booked=blue, conflict=red dotted) ─────────
  function renderDayView(asset, date) {
    const dayStart = 8; // 8:00 AM
    const dayEnd   = 19; // 7:00 PM
    const dayStr   = date.toDateString();
    const dayBooks = DB.bookings.getByAsset(asset.id)
      .filter(b => !['Cancelled','Completed'].includes(b.status) && new Date(b.start_time).toDateString()===dayStr);

    function getBookingAt(hour) {
      return dayBooks.filter(b => {
        const s = new Date(b.start_time).getHours();
        const e = new Date(b.end_time).getHours() + (new Date(b.end_time).getMinutes()>0?1:0);
        return hour >= s && hour < e;
      });
    }

    const slots = [];
    for (let h = dayStart; h < dayEnd; h++) {
      const books = getBookingAt(h);
      const isMyBook = books.some(b => b.user_id === user.id);
      const isOtherBook = books.some(b => b.user_id !== user.id);
      slots.push({ hour:h, books, isMyBook, isOtherBook });
    }

    return `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i data-lucide="calendar"></i> ${escHtml(asset.name)}</div>
        <span style="font-size:0.78rem;color:var(--text-muted)">${date.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span>
      </div>
      <div class="day-view">
        ${slots.map(s => {
          const t = `${s.hour}:00`;
          const books = s.books;
          if (books.length === 0) {
            // Free slot — clickable if user can book
            return `<div class="day-slot day-slot-free ${RBAC.can(user,'bookings:create')?'time-slot-bookable':''}" data-hour="${s.hour}">
              <span class="day-slot-time">${t}</span>
              <span class="day-slot-label" style="color:var(--text-light);font-size:0.78rem">${RBAC.can(user,'bookings:create')?'Click to book':'Free'}</span>
            </div>`;
          }
          return books.map(b => {
            const who = DB.users.getById(b.user_id);
            const isMine = b.user_id===user.id;
            const cls = isMine ? 'day-slot-mine' : 'day-slot-booked';
            return `<div class="day-slot ${cls}" data-hour="${s.hour}">
              <span class="day-slot-time">${t}</span>
              <span class="day-slot-label">${escHtml(b.purpose||'Booked')}${who?' — '+escHtml(who.name):''} · ${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}</span>
              ${isMine && b.status==='Upcoming' ? `<button class="btn btn-xs btn-danger-outline btn-cancel-booking" data-id="${b.id}" style="margin-left:auto;flex-shrink:0"><i data-lucide="x"></i></button>` : ''}
            </div>`;
          }).join('');
        }).join('')}
      </div>
      <div style="padding:10px 16px;border-top:1px solid var(--border-light);display:flex;gap:14px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;font-size:0.76rem;color:var(--text-muted)"><div style="width:14px;height:10px;background:var(--blue-bg);border-left:3px solid var(--blue);border-radius:2px"></div> Booked</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:0.76rem;color:var(--text-muted)"><div style="width:14px;height:10px;background:var(--green-bg);border-left:3px solid var(--green);border-radius:2px"></div> My booking</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:0.76rem;color:var(--text-muted)"><div style="width:14px;height:10px;background:var(--red-bg);border:1px dashed var(--red);border-radius:2px"></div> Conflict</div>
      </div>
    </div>`;
  }

  // ── BOOK MODAL ────────────────────────────────────────────
  function showBookModal(assetId, date, defaultHour = null) {
    if (!RBAC.can(user,'bookings:create')) { App.toast('You don\'t have permission to book resources.','error'); return; }
    const resources = DB.assets.where(a => a.is_shared_resource && !['Retired','Disposed'].includes(a.status));
    const dateStr = date.toISOString().split('T')[0];
    const defStart = defaultHour ? `${dateStr}T${String(defaultHour).padStart(2,'0')}:00` : `${dateStr}T09:00`;
    const defEnd   = defaultHour ? `${dateStr}T${String(defaultHour+1).padStart(2,'0')}:00` : `${dateStr}T10:00`;

    showModal(
      `<i data-lucide="calendar-plus"></i> Book a Resource`,
      `<div class="form-stack">
        <div class="form-group"><label class="form-label required">Resource</label>
          <select class="input" id="bm-asset">
            <option value="">— Select —</option>
            ${resources.map(a=>`<option value="${a.id}" ${a.id===assetId?'selected':''}>${escHtml(a.name)}</option>`).join('')}
          </select>
        </div>
        <div id="bm-conflict-box"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label required">Start Time</label>
            <input class="input" type="datetime-local" id="bm-start" value="${defStart}" min="${dateStr}T00:00">
          </div>
          <div class="form-group"><label class="form-label required">End Time</label>
            <input class="input" type="datetime-local" id="bm-end" value="${defEnd}" min="${dateStr}T00:00">
          </div>
        </div>
        <div class="form-group"><label class="form-label">Purpose / Title</label>
          <input class="input" id="bm-purpose" placeholder="e.g. Team Standup, Client Meeting…">
        </div>
        <div class="form-group"><label class="form-label">Notes</label>
          <textarea class="input" id="bm-notes" rows="2" placeholder="Any additional notes…"></textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" id="bm-cancel">Cancel</button>
       <button class="btn btn-primary" id="bm-confirm"><i data-lucide="check"></i> Confirm Booking</button>`
    );

    // Live conflict check
    function checkConflict() {
      const aid  = parseInt(document.getElementById('bm-asset')?.value);
      const s    = document.getElementById('bm-start')?.value;
      const e    = document.getElementById('bm-end')?.value;
      const box  = document.getElementById('bm-conflict-box');
      if (!aid || !s || !e || !box) return;
      if (new Date(e) <= new Date(s)) { box.innerHTML=`<div class="alert alert-danger"><i data-lucide="alert-circle"></i> End time must be after start time.</div>`; lucide.createIcons({nodes:[box]}); return; }
      const res = Engine.checkBookingOverlap(aid, s, e);
      if (res.overlap) {
        box.innerHTML=`<div class="day-slot day-slot-conflict" style="border-radius:var(--radius-sm);padding:8px 12px;margin-top:4px"><i data-lucide="alert-triangle" style="width:14px;height:14px;color:var(--red)"></i> <span style="font-size:0.82rem;color:var(--red)">Conflict · slot is unavailable. ${res.message}</span></div>`;
      } else {
        box.innerHTML=`<div class="success-box" style="margin-top:4px"><i data-lucide="check-circle"></i> Slot is available.</div>`;
      }
      lucide.createIcons({nodes:[box]});
    }

    setTimeout(() => {
      document.getElementById('bm-asset')?.addEventListener('change', checkConflict);
      document.getElementById('bm-start')?.addEventListener('change', checkConflict);
      document.getElementById('bm-end')?.addEventListener('change', checkConflict);
      if (assetId) checkConflict();

      document.getElementById('bm-cancel')?.addEventListener('click', closeModal);
      document.getElementById('bm-confirm')?.addEventListener('click', () => {
        const aid  = parseInt(document.getElementById('bm-asset')?.value);
        const s    = document.getElementById('bm-start')?.value;
        const e    = document.getElementById('bm-end')?.value;
        if (!aid || !s || !e) { App.toast('Resource and times are required.','error'); return; }
        if (new Date(e) <= new Date(s)) { App.toast('End time must be after start.','error'); return; }
        const res = Engine.checkBookingOverlap(aid, s, e);
        if (res.overlap) { App.toast('Slot conflict — choose a different time.','error'); return; }
        const asset = DB.assets.getById(aid);
        DB.bookings.create({
          asset_id:aid, user_id:user.id, department_id:user.department_id,
          start_time:new Date(s).toISOString(), end_time:new Date(e).toISOString(),
          status:'Upcoming', purpose:document.getElementById('bm-purpose')?.value||'',
          notes:document.getElementById('bm-notes')?.value||''
        });
        Engine._notify('booking','Booking Confirmed',`${asset.name} booked ${fmtDate(s)} ${fmtTime(s)}–${fmtTime(e)}.`,user.id);
        Engine._log(user,`Booking Created: ${asset.name} on ${fmtDate(s)}`);
        App.toast('Booking confirmed!','success');
        closeModal(); render();
      });
    }, 80);
  }

  function _cancelBooking(bookingId) {
    DB.bookings.update(bookingId, { status:'Cancelled', updatedAt:new Date().toISOString() });
    App.toast('Booking cancelled.','info'); render();
  }

  render();
}
