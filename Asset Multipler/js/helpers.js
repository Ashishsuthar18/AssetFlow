// ============================================================
// js/helpers.js — Global UI helpers (badge, escHtml, fmt*)
// Must be loaded BEFORE all view scripts
// ============================================================

// ── HTML ESCAPE ──────────────────────────────────────────────
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── DATE / TIME ──────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
       + ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}
function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)   return 'Just now';
  if (diff < 3600000) return Math.floor(diff/60000)  + 'm ago';
  if (diff < 86400000)return Math.floor(diff/3600000)+ 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}

// ── BADGE GENERATOR ──────────────────────────────────────────
// Maps value → CSS class (matches Odoo design system)
const BADGE_MAP = {
  // Asset Status
  'Available':          'available',
  'Allocated':          'allocated',
  'Reserved':           'reserved',
  'Under Maintenance':  'maintenance',
  'Lost':               'lost',
  'Retired':            'retired',
  'Disposed':           'disposed',
  // Allocation
  'Active':             'active',
  'Returned':           'resolved',
  'Cancelled':          'cancelled',
  // Booking
  'Upcoming':           'upcoming',
  'Ongoing':            'ongoing',
  'Completed':          'completed',
  // Maintenance
  'Pending':            'pending',
  'Approved':           'approved',
  'In Progress':        'inprogress',
  'Resolved':           'resolved',
  'Rejected':           'rejected',
  // Transfer
  'Transfer':           'transfer',
  // Roles
  'Admin':              'admin',
  'AssetManager':       'assetmanager',
  'DeptHead':           'depthead',
  'Employee':           'employee',
  // Conditions
  'Excellent':          'excellent',
  'Good':               'good',
  'Fair':               'fair',
  'Poor':               'poor',
  'Damaged':            'damaged',
  // Audit states
  'Missing':            'missing',
  'Verified':           'verified',
  // Priority
  'Low':                'low',
  'Medium':             'medium',
  'High':               'high',
  'Critical':           'critical',
  // Overdue
  'Overdue':            'overdue',
};

function badge(value, size = '') {
  if (!value) return '';
  const cls = BADGE_MAP[value] || 'grey';
  const sizeClass = size === 'sm' ? ' badge-sm' : '';
  return `<span class="badge badge-${cls}${sizeClass}">${escHtml(value)}</span>`;
}

function condBadge(cond) {
  return badge(cond);
}

// Status color map for calendar events
const STATUS_COLORS = {
  'Upcoming':  { bg: 'var(--blue-bg)',   color: 'var(--blue)'   },
  'Ongoing':   { bg: 'var(--green-bg)',  color: 'var(--green)'  },
  'Completed': { bg: 'var(--grey-bg)',   color: 'var(--grey)'   },
  'Cancelled': { bg: 'var(--red-bg)',    color: 'var(--red)'    },
  // Priority
  'Low':       { bg: 'var(--grey-bg)',   color: 'var(--grey)'   },
  'Medium':    { bg: 'var(--yellow-bg)', color: 'var(--yellow)' },
  'High':      { bg: 'var(--orange-bg)', color: 'var(--orange)' },
  'Critical':  { bg: 'var(--red-bg)',    color: 'var(--red)'    },
};
