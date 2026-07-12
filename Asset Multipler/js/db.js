// ============================================================
// js/db.js — AssetFlow localStorage Relational Database Layer
// ============================================================

const DB_PREFIX = 'af_';

function _getTable(name) {
  try { return JSON.parse(localStorage.getItem(DB_PREFIX + name) || '[]'); }
  catch { return []; }
}
function _setTable(name, data) {
  localStorage.setItem(DB_PREFIX + name, JSON.stringify(data));
}
function _nextId(name) {
  const rows = _getTable(name);
  return rows.length ? Math.max(...rows.map(r => r.id || 0)) + 1 : 1;
}
function _nextAssetTag() {
  const c = parseInt(localStorage.getItem(DB_PREFIX + 'atc') || '0') + 1;
  localStorage.setItem(DB_PREFIX + 'atc', c);
  return 'AF-' + String(c).padStart(4, '0');
}
function _now() { return new Date().toISOString(); }
function _daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0];
}

// ────────────────── GENERIC CRUD FACTORY ──────────────────
function makeTable(name, extraMethods = {}) {
  return Object.assign({
    getAll() { return _getTable(name); },
    getById(id) { return _getTable(name).find(r => r.id === id) || null; },
    create(data) {
      const rows = _getTable(name);
      const row = { id: _nextId(name), createdAt: _now(), updatedAt: _now(), ...data };
      rows.push(row); _setTable(name, rows); return row;
    },
    update(id, data) {
      const rows = _getTable(name);
      const idx = rows.findIndex(r => r.id === id);
      if (idx < 0) return null;
      rows[idx] = { ...rows[idx], ...data, updatedAt: _now() };
      _setTable(name, rows); return rows[idx];
    },
    delete(id) {
      _setTable(name, _getTable(name).filter(r => r.id !== id));
    },
    where(predicate) { return _getTable(name).filter(predicate); },
    first(predicate) { return _getTable(name).find(predicate) || null; },
  }, extraMethods);
}

// ────────────────── TABLE DEFINITIONS ──────────────────────
const DB = {
  users: makeTable('users', {
    getByEmail(email) { return _getTable('users').find(u => u.email.toLowerCase() === email.toLowerCase()) || null; },
  }),

  departments: makeTable('departments'),

  assetCategories: makeTable('assetCategories'),

  assets: makeTable('assets', {
    createWithTag(data) {
      const rows = _getTable('assets');
      const row = { id: _nextId('assets'), asset_tag: _nextAssetTag(), createdAt: _now(), updatedAt: _now(), ...data };
      rows.push(row); _setTable('assets', rows); return row;
    },
    getByTag(tag) { return _getTable('assets').find(a => a.asset_tag === tag) || null; },
  }),

  allocations: makeTable('allocations', {
    getActiveByAsset(assetId) { return _getTable('allocations').find(a => a.asset_id === assetId && a.status === 'Active') || null; },
    getByUser(userId) { return _getTable('allocations').filter(a => a.user_id === userId); },
    getByDept(deptId) { return _getTable('allocations').filter(a => a.department_id === deptId); },
  }),

  bookings: makeTable('bookings', {
    getByAsset(assetId) { return _getTable('bookings').filter(b => b.asset_id === assetId); },
    getByUser(userId) { return _getTable('bookings').filter(b => b.user_id === userId); },
    getActive() { return _getTable('bookings').filter(b => ['Upcoming','Ongoing'].includes(b.status)); },
  }),

  maintenanceRequests: makeTable('maintenanceRequests', {
    getByAsset(assetId) { return _getTable('maintenanceRequests').filter(m => m.asset_id === assetId); },
  }),

  audits: makeTable('audits'),

  auditCycles: makeTable('auditCycles'),

  auditItems: makeTable('auditItems', {
    getByCycle(cycleId) { return _getTable('auditItems').filter(i => i.cycle_id === cycleId); },
  }),

  notifications: makeTable('notifications', {
    getForUser(userId) {
      return _getTable('notifications')
        .filter(n => n.user_id === null || n.user_id === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    getUnreadCount(userId) {
      return _getTable('notifications').filter(n => !n.read && (n.user_id === null || n.user_id === userId)).length;
    },
    markAllRead(userId) {
      const rows = _getTable('notifications');
      rows.forEach(n => { if (n.user_id === null || n.user_id === userId) n.read = true; });
      _setTable('notifications', rows);
    },
  }),

  activityLogs: makeTable('activityLogs'),

  transferRequests: makeTable('transferRequests', {
    getPendingByAsset(assetId) { return _getTable('transferRequests').find(t => t.asset_id === assetId && t.status === 'Pending') || null; },
  }),
};

// ────────────────── SEED DATA ──────────────────────────────
function seedDatabase() {
  if (localStorage.getItem(DB_PREFIX + 'seeded_v6')) return;

  // Clear all tables
  ['users','departments','assetCategories','assets','allocations','bookings',
   'maintenanceRequests','audits','notifications','activityLogs','transferRequests'].forEach(t => {
    localStorage.removeItem(DB_PREFIX + t);
  });
  localStorage.setItem(DB_PREFIX + 'atc', '0');

  // ── DEPARTMENTS ──
  const depts = [
    { id: 1, name: 'IT Department',    head_user_id: 2, parent_department_id: null, status: 'Active', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 2, name: 'Operations',       head_user_id: 3, parent_department_id: null, status: 'Active', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 3, name: 'Human Resources',  head_user_id: null, parent_department_id: null, status: 'Active', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 4, name: 'Finance',          head_user_id: null, parent_department_id: null, status: 'Active', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 5, name: 'IT Support',       head_user_id: null, parent_department_id: 1,    status: 'Active', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
    { id: 6, name: 'Marketing',        head_user_id: null, parent_department_id: null, status: 'Inactive', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ];
  _setTable('departments', depts);

  // ── USERS (password stored as btoa(plain)) ──
  const users = [
    { id: 1, name: 'Parth Chovatiya',  email: 'admin@assetflow.com',   password: btoa('Admin@123'),   role: 'Admin',        department_id: 1, is_active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 2, name: 'Ashish Sudhar',    email: 'manager@assetflow.com', password: btoa('Manager@123'), role: 'AssetManager', department_id: 1, is_active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 3, name: 'Rohan Desai',      email: 'head@assetflow.com',    password: btoa('Head@123'),    role: 'DeptHead',     department_id: 2, is_active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 4, name: 'Priya Sharma',     email: 'emp@assetflow.com',     password: btoa('Emp@123'),     role: 'Employee',     department_id: 2, is_active: true, createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
    { id: 5, name: 'Raj Mehta',        email: 'raj@assetflow.com',     password: btoa('Emp@123'),     role: 'Employee',     department_id: 3, is_active: true, createdAt: '2024-01-20T00:00:00Z', updatedAt: '2024-01-20T00:00:00Z' },
    { id: 6, name: 'Ananya Iyer',      email: 'ananya@assetflow.com',  password: btoa('Emp@123'),     role: 'Employee',     department_id: 2, is_active: true, createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
    { id: 7, name: 'Vivek Kumar',      email: 'vivek@assetflow.com',   password: btoa('Emp@123'),     role: 'Employee',     department_id: 1, is_active: true, createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-02-15T00:00:00Z' },
    { id: 8, name: 'Neha Joshi',       email: 'neha@assetflow.com',    password: btoa('Emp@123'),     role: 'Employee',     department_id: 4, is_active: true, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
    { id: 9, name: 'Arjun Singh',      email: 'arjun@assetflow.com',   password: btoa('Emp@123'),     role: 'Employee',     department_id: 1, is_active: false, createdAt: '2024-03-10T00:00:00Z', updatedAt: '2024-03-10T00:00:00Z' },
  ];
  _setTable('users', users);

  // ── ASSET CATEGORIES ──
  const cats = [
    { id: 1, name: 'Electronics',      custom_attributes: { warranty_period_months: 'number', power_rating_watts: 'number' }, icon: '💻', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 2, name: 'Furniture',        custom_attributes: { material: 'text', weight_capacity_kg: 'number' },                icon: '🪑', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 3, name: 'Vehicles',         custom_attributes: { fuel_type: 'text', mileage_km: 'number' },                       icon: '🚗', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 4, name: 'Office Equipment', custom_attributes: { voltage_volts: 'number' },                                       icon: '🖨️', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 5, name: 'Meeting Rooms',    custom_attributes: { capacity_people: 'number', floor_number: 'number' },             icon: '🏢', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ];
  _setTable('assetCategories', cats);

  // ── ASSETS (set tag counter first) ──
  localStorage.setItem(DB_PREFIX + 'atc', '20');
  const todayStr = new Date().toISOString().split('T')[0];
  const assets = [
    { id: 1,  asset_tag:'AF-0001', name:'Dell Laptop Pro',        category_id:1, serial_number:'DL-2024-001', acquisition_date:'2024-01-15', acquisition_cost:85000,   condition:'Good',      location:'IT Dept - Rack A',    is_shared_resource:false, status:'Allocated',         createdAt:'2024-01-15T00:00:00Z', updatedAt:'2024-01-15T00:00:00Z' },
    { id: 2,  asset_tag:'AF-0002', name:'MacBook Air M2',         category_id:1, serial_number:'MB-2024-002', acquisition_date:'2024-01-20', acquisition_cost:110000,  condition:'Excellent', location:'IT Dept - Rack A',    is_shared_resource:false, status:'Allocated',         createdAt:'2024-01-20T00:00:00Z', updatedAt:'2024-01-20T00:00:00Z' },
    { id: 3,  asset_tag:'AF-0003', name:'HP LaserJet Pro',        category_id:4, serial_number:'HP-2024-003', acquisition_date:'2024-02-01', acquisition_cost:25000,   condition:'Good',      location:'IT Dept',             is_shared_resource:true,  status:'Available',         createdAt:'2024-02-01T00:00:00Z', updatedAt:'2024-02-01T00:00:00Z' },
    { id: 4,  asset_tag:'AF-0004', name:'Conference Room B2',     category_id:5, serial_number:'CR-B2-001',  acquisition_date:'2023-06-01', acquisition_cost:500000,  condition:'Excellent', location:'Floor 2 - Block B',   is_shared_resource:true,  status:'Available',         createdAt:'2023-06-01T00:00:00Z', updatedAt:'2023-06-01T00:00:00Z' },
    { id: 5,  asset_tag:'AF-0005', name:'Toyota Innova',          category_id:3, serial_number:'VH-2023-001', acquisition_date:'2023-08-15', acquisition_cost:1800000, condition:'Good',      location:'Parking - Slot 12',   is_shared_resource:true,  status:'Reserved',          createdAt:'2023-08-15T00:00:00Z', updatedAt:'2023-08-15T00:00:00Z' },
    { id: 6,  asset_tag:'AF-0006', name:'Ergonomic Chair Set(10)',category_id:2, serial_number:'EC-2024-006', acquisition_date:'2024-02-15', acquisition_cost:45000,   condition:'Good',      location:'HR Floor',            is_shared_resource:false, status:'Available',         createdAt:'2024-02-15T00:00:00Z', updatedAt:'2024-02-15T00:00:00Z' },
    { id: 7,  asset_tag:'AF-0007', name:'Dell Monitor 27"',       category_id:1, serial_number:'DM-2024-007', acquisition_date:'2024-01-25', acquisition_cost:22000,   condition:'Fair',      location:'IT Dept - Rack B',    is_shared_resource:false, status:'Under Maintenance',  createdAt:'2024-01-25T00:00:00Z', updatedAt:'2024-01-25T00:00:00Z' },
    { id: 8,  asset_tag:'AF-0008', name:'Epson 4K Projector',     category_id:4, serial_number:'PJ-2024-008', acquisition_date:'2024-03-01', acquisition_cost:65000,   condition:'Excellent', location:'Floor 1 - Room 101',  is_shared_resource:true,  status:'Available',         createdAt:'2024-03-01T00:00:00Z', updatedAt:'2024-03-01T00:00:00Z' },
    { id: 9,  asset_tag:'AF-0009', name:'HP Desktop Workstation', category_id:1, serial_number:'HW-2024-009', acquisition_date:'2024-02-10', acquisition_cost:75000,   condition:'Good',      location:'Operations Floor',    is_shared_resource:false, status:'Allocated',         createdAt:'2024-02-10T00:00:00Z', updatedAt:'2024-02-10T00:00:00Z' },
    { id: 10, asset_tag:'AF-0010', name:'Canon DSLR Camera',      category_id:4, serial_number:'CN-2024-010', acquisition_date:'2024-03-15', acquisition_cost:55000,   condition:'Excellent', location:'Media Room',          is_shared_resource:false, status:'Available',         createdAt:'2024-03-15T00:00:00Z', updatedAt:'2024-03-15T00:00:00Z' },
    { id: 11, asset_tag:'AF-0011', name:'Height-Adjust Desk',     category_id:2, serial_number:'SD-2024-011', acquisition_date:'2024-01-10', acquisition_cost:18000,   condition:'Good',      location:'IT Dept',             is_shared_resource:false, status:'Allocated',         createdAt:'2024-01-10T00:00:00Z', updatedAt:'2024-01-10T00:00:00Z' },
    { id: 12, asset_tag:'AF-0012', name:'iPhone 15 Pro',          category_id:1, serial_number:'IP-2024-012', acquisition_date:'2024-04-01', acquisition_cost:135000,  condition:'Excellent', location:'Operations',          is_shared_resource:false, status:'Available',         createdAt:'2024-04-01T00:00:00Z', updatedAt:'2024-04-01T00:00:00Z' },
    { id: 13, asset_tag:'AF-0013', name:'Maruti Swift',           category_id:3, serial_number:'VH-2024-013', acquisition_date:'2024-02-28', acquisition_cost:750000,  condition:'Good',      location:'Parking - Slot 5',    is_shared_resource:true,  status:'Available',         createdAt:'2024-02-28T00:00:00Z', updatedAt:'2024-02-28T00:00:00Z' },
    { id: 14, asset_tag:'AF-0014', name:'Cisco IP Phone',         category_id:4, serial_number:'CP-2024-014', acquisition_date:'2023-12-01', acquisition_cost:8000,    condition:'Good',      location:'Reception',           is_shared_resource:false, status:'Allocated',         createdAt:'2023-12-01T00:00:00Z', updatedAt:'2023-12-01T00:00:00Z' },
    { id: 15, asset_tag:'AF-0015', name:'Samsung Smart TV 55"',  category_id:1, serial_number:'ST-2024-015', acquisition_date:'2024-01-05', acquisition_cost:45000,   condition:'Poor',      location:'Meeting Room A',      is_shared_resource:false, status:'Lost',              createdAt:'2024-01-05T00:00:00Z', updatedAt:'2024-01-05T00:00:00Z' },
    { id: 16, asset_tag:'AF-0016', name:'APC UPS 10KVA',         category_id:4, serial_number:'UPS-2024-016',acquisition_date:'2023-11-15', acquisition_cost:32000,   condition:'Fair',      location:'Server Room',         is_shared_resource:false, status:'Under Maintenance',  createdAt:'2023-11-15T00:00:00Z', updatedAt:'2023-11-15T00:00:00Z' },
    { id: 17, asset_tag:'AF-0017', name:'Conference Room A1',     category_id:5, serial_number:'CR-A1-001',  acquisition_date:'2023-06-01', acquisition_cost:400000,  condition:'Good',      location:'Floor 1 - Block A',   is_shared_resource:true,  status:'Available',         createdAt:'2023-06-01T00:00:00Z', updatedAt:'2023-06-01T00:00:00Z' },
    { id: 18, asset_tag:'AF-0018', name:'Lenovo ThinkPad X1',    category_id:1, serial_number:'LT-2024-018', acquisition_date:'2024-03-20', acquisition_cost:95000,   condition:'Excellent', location:'HR Dept',             is_shared_resource:false, status:'Available',         createdAt:'2024-03-20T00:00:00Z', updatedAt:'2024-03-20T00:00:00Z' },
    { id: 19, asset_tag:'AF-0019', name:'Color Laser Printer',    category_id:4, serial_number:'LP-2024-019', acquisition_date:'2024-02-05', acquisition_cost:38000,   condition:'Good',      location:'Operations',          is_shared_resource:true,  status:'Available',         createdAt:'2024-02-05T00:00:00Z', updatedAt:'2024-02-05T00:00:00Z' },
    { id: 20, asset_tag:'AF-0020', name:'External SSD 2TB',       category_id:1, serial_number:'ES-2024-020', acquisition_date:'2024-04-10', acquisition_cost:12000,   condition:'Excellent', location:'IT Dept',             is_shared_resource:false, status:'Retired',           createdAt:'2024-04-10T00:00:00Z', updatedAt:'2024-04-10T00:00:00Z' },
  ];
  _setTable('assets', assets);

  // ── ALLOCATIONS ──
  const allocations = [
    { id:1, asset_id:1,  user_id:4, department_id:2, expected_return_date:_daysFromNow(30),  check_in_notes:null,                      status:'Active',   allocated_by:2, createdAt:new Date(Date.now()-30*864e5).toISOString(), updatedAt:new Date(Date.now()-30*864e5).toISOString() },
    { id:2, asset_id:2,  user_id:6, department_id:2, expected_return_date:_daysFromNow(-5),  check_in_notes:null,                      status:'Active',   allocated_by:2, createdAt:new Date(Date.now()-35*864e5).toISOString(), updatedAt:new Date(Date.now()-35*864e5).toISOString() },
    { id:3, asset_id:9,  user_id:3, department_id:2, expected_return_date:_daysFromNow(15),  check_in_notes:null,                      status:'Active',   allocated_by:2, createdAt:new Date(Date.now()-20*864e5).toISOString(), updatedAt:new Date(Date.now()-20*864e5).toISOString() },
    { id:4, asset_id:11, user_id:7, department_id:1, expected_return_date:_daysFromNow(-3),  check_in_notes:null,                      status:'Active',   allocated_by:2, createdAt:new Date(Date.now()-25*864e5).toISOString(), updatedAt:new Date(Date.now()-25*864e5).toISOString() },
    { id:5, asset_id:14, user_id:5, department_id:3, expected_return_date:_daysFromNow(45),  check_in_notes:null,                      status:'Active',   allocated_by:2, createdAt:new Date(Date.now()-10*864e5).toISOString(), updatedAt:new Date(Date.now()-10*864e5).toISOString() },
    { id:6, asset_id:1,  user_id:7, department_id:1, expected_return_date:'2024-03-01',       check_in_notes:'Returned in good condition.', status:'Returned', allocated_by:2, createdAt:'2024-01-15T00:00:00Z', updatedAt:'2024-03-01T00:00:00Z' },
    { id:7, asset_id:18, user_id:8, department_id:4, expected_return_date:_daysFromNow(60),  check_in_notes:null,                      status:'Active',   allocated_by:2, createdAt:new Date(Date.now()-5*864e5).toISOString(),  updatedAt:new Date(Date.now()-5*864e5).toISOString()  },
  ];
  _setTable('allocations', allocations);

  // ── BOOKINGS ──
  const td = new Date().toISOString().split('T')[0];
  const tm = _daysFromNow(1);
  const da = _daysFromNow(2);
  const bookings = [
    { id:1, asset_id:4,  user_id:3, start_time:`${td}T09:00:00`, end_time:`${td}T10:00:00`,  purpose:'Team standup',         status:'Ongoing',   createdAt:new Date(Date.now()-864e5).toISOString(),    updatedAt:new Date(Date.now()-864e5).toISOString() },
    { id:2, asset_id:4,  user_id:4, start_time:`${td}T10:00:00`, end_time:`${td}T11:30:00`,  purpose:'Client presentation',  status:'Upcoming',  createdAt:new Date(Date.now()-864e5).toISOString(),    updatedAt:new Date(Date.now()-864e5).toISOString() },
    { id:3, asset_id:17, user_id:5, start_time:`${tm}T14:00:00`, end_time:`${tm}T16:00:00`,  purpose:'Training session',     status:'Upcoming',  createdAt:new Date(Date.now()-2*864e5).toISOString(), updatedAt:new Date(Date.now()-2*864e5).toISOString() },
    { id:4, asset_id:5,  user_id:6, start_time:`${tm}T09:00:00`, end_time:`${tm}T13:00:00`,  purpose:'Site visit',           status:'Upcoming',  createdAt:new Date(Date.now()-2*864e5).toISOString(), updatedAt:new Date(Date.now()-2*864e5).toISOString() },
    { id:5, asset_id:4,  user_id:7, start_time:`${da}T11:00:00`, end_time:`${da}T12:00:00`,  purpose:'Design review',        status:'Upcoming',  createdAt:new Date(Date.now()-864e5).toISOString(),    updatedAt:new Date(Date.now()-864e5).toISOString() },
    { id:6, asset_id:8,  user_id:3, start_time:`${da}T14:00:00`, end_time:`${da}T15:00:00`,  purpose:'Product demo',         status:'Upcoming',  createdAt:new Date(Date.now()-864e5).toISOString(),    updatedAt:new Date(Date.now()-864e5).toISOString() },
    { id:7, asset_id:13, user_id:2, start_time:`${td}T08:00:00`, end_time:`${td}T12:00:00`,  purpose:'Vendor pickup',        status:'Completed', createdAt:new Date(Date.now()-2*864e5).toISOString(), updatedAt:new Date(Date.now()-2*864e5).toISOString() },
  ];
  _setTable('bookings', bookings);

  // ── MAINTENANCE REQUESTS ──
  const maint = [
    { id:1, asset_id:7,  user_id:7, description:'Screen flickering intermittently. Display shows artifacts and random flickers. Affects productivity severely.', priority:'High',     status:'Approved',    technician:'John Tech',  createdAt:new Date(Date.now()-7*864e5).toISOString(),  updatedAt:new Date(Date.now()-6*864e5).toISOString() },
    { id:2, asset_id:16, user_id:2, description:'UPS battery not holding charge. Drops to 0% within minutes of power cut. Needs immediate replacement.', priority:'Critical', status:'In Progress',  technician:'Mike Fix',   createdAt:new Date(Date.now()-14*864e5).toISOString(), updatedAt:new Date(Date.now()-12*864e5).toISOString() },
    { id:3, asset_id:3,  user_id:4, description:'Paper jam occurring every 5-10 prints. Paper feed mechanism seems worn out.', priority:'Medium',   status:'Pending',     technician:null,         createdAt:new Date(Date.now()-2*864e5).toISOString(),  updatedAt:new Date(Date.now()-2*864e5).toISOString() },
    { id:4, asset_id:8,  user_id:3, description:'Remote control missing and HDMI port 1 not working properly. Need replacement parts.', priority:'Low',      status:'Pending',     technician:null,         createdAt:new Date(Date.now()-864e5).toISOString(),    updatedAt:new Date(Date.now()-864e5).toISOString() },
    { id:5, asset_id:6,  user_id:5, description:'Two chairs have broken armrests. Ergonomic support compromised.', priority:'Medium',   status:'Resolved',    technician:'Sam Repair', resolvedAt:new Date(Date.now()-3*864e5).toISOString(), createdAt:new Date(Date.now()-10*864e5).toISOString(), updatedAt:new Date(Date.now()-3*864e5).toISOString() },
    { id:6, asset_id:10, user_id:6, description:'Camera lens autofocus malfunctioning. Photos are blurry.', priority:'Medium',   status:'Rejected',    technician:null, rejection_reason:'Covered under warranty. Sent to manufacturer.', createdAt:new Date(Date.now()-5*864e5).toISOString(), updatedAt:new Date(Date.now()-4*864e5).toISOString() },
  ];
  _setTable('maintenanceRequests', maint);

  // ── AUDIT CYCLES & ITEMS ──
  const auditCycles = [
    {
      id: 1, name: 'Q2 2024 IT Asset Audit', department_id: 1,
      start_date: '2024-06-01', end_date: '2024-06-30',
      auditor_ids: [2, 3], status: 'Active',
      createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z'
    },
    {
      id: 2, name: 'Annual Physical Audit 2024', department_id: null,
      start_date: '2024-01-01', end_date: '2024-01-31',
      auditor_ids: [2], status: 'Completed',
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-31T00:00:00Z'
    },
  ];
  _setTable('auditCycles', auditCycles);

  const auditItems = [
    { id: 1, cycle_id: 1, asset_id: 1, status: 'Verified', notes: 'Verified on desk', auditor_id: 2, createdAt: '2024-06-02T10:00:00Z', updatedAt: '2024-06-02T10:00:00Z' },
    { id: 2, cycle_id: 1, asset_id: 2, status: 'Verified', notes: 'Verified on desk', auditor_id: 2, createdAt: '2024-06-02T10:10:00Z', updatedAt: '2024-06-02T10:10:00Z' },
    { id: 3, cycle_id: 1, asset_id: 3, status: 'Verified', notes: 'Verified in rack', auditor_id: 2, createdAt: '2024-06-02T10:20:00Z', updatedAt: '2024-06-02T10:20:00Z' },
    { id: 4, cycle_id: 1, asset_id: 7, status: 'Damaged', notes: 'Screen flickering', auditor_id: 2, createdAt: '2024-06-02T10:30:00Z', updatedAt: '2024-06-02T10:30:00Z' },
    { id: 5, cycle_id: 1, asset_id: 11, status: 'Missing', notes: 'Not found at expected location', auditor_id: 3, createdAt: '2024-06-03T11:00:00Z', updatedAt: '2024-06-03T11:00:00Z' },
  ];
  _setTable('auditItems', auditItems);

  // ── TRANSFER REQUESTS ──
  const transfers = [
    { id: 1, asset_id: 1, from_user_id: 4, to_user_id: 7, requested_by: 7, department_id: 1, reason: 'Need for new project', status: 'Pending', createdAt: new Date(Date.now()-864e5).toISOString(), updatedAt: new Date(Date.now()-864e5).toISOString() },
  ];
  _setTable('transferRequests', transfers);

  // ── NOTIFICATIONS ──
  const overdue1 = _daysFromNow(-5);
  const overdue2 = _daysFromNow(-3);
  const notifs = [
    { id: 1, user_id: null, type: 'overdue', title: 'Overdue Return Alert', message: 'MacBook Air M2 (AF-0002) held by Ananya Iyer is overdue since ' + overdue1, read: false, createdAt: new Date(Date.now()-864e5).toISOString() },
    { id: 2, user_id: null, type: 'overdue', title: 'Overdue Return Alert', message: 'Height-Adjust Desk (AF-0011) held by Vivek Kumar is overdue since ' + overdue2, read: false, createdAt: new Date(Date.now()-864e5).toISOString() },
    { id: 3, user_id: 4, type: 'allocation', title: 'Asset Assigned to You', message: 'Dell Laptop Pro (AF-0001) has been allocated to you by Ashish Sudhar.', read: true, createdAt: new Date(Date.now()-30*864e5).toISOString() },
    { id: 4, user_id: 4, type: 'booking', title: 'Booking Confirmed', message: 'Conference Room B2 (AF-0004) booked today 10:00–11:30.', read: false, createdAt: new Date(Date.now()-864e5).toISOString() },
    { id: 5, user_id: null, type: 'maintenance', title: 'Maintenance Approved', message: 'Dell Monitor 27" (AF-0007) maintenance request approved. Asset sent for repair.', read: false, createdAt: new Date(Date.now()-6*864e5).toISOString() },
    { id: 6, user_id: null, type: 'maintenance', title: 'New Maintenance Request', message: 'HP LaserJet Pro (AF-0003) — Paper jam issue raised by Priya Sharma. Priority: Medium.', read: false, createdAt: new Date(Date.now()-2*864e5).toISOString() },
    { id: 7, user_id: null, type: 'audit', title: 'Audit Discrepancy Flagged', message: 'Q2 IT Audit: Height-Adjust Desk (AF-0011) marked as Missing by auditor.', read: false, createdAt: new Date(Date.now()-864e5).toISOString() },
    { id: 8, user_id: null, type: 'transfer', title: 'Transfer Request Received', message: 'Vivek Kumar has requested transfer of Dell Laptop Pro (AF-0001) from Priya Sharma.', read: false, createdAt: new Date(Date.now()-864e5).toISOString() },
    { id: 9, user_id: 7, type: 'booking', title: 'Booking Reminder', message: 'Your booking for Conference Room B2 starts in 30 minutes (11:00–12:00).', read: false, createdAt: new Date(Date.now()-1800*1000).toISOString() },
    { id: 10, user_id: null, type: 'maintenance', title: 'Maintenance Rejected', message: 'Canon DSLR Camera (AF-0010) maintenance rejected. Covered under manufacturer warranty.', read: true, createdAt: new Date(Date.now()-4*864e5).toISOString() },
  ];
  _setTable('notifications', notifs);

  // ── ACTIVITY LOGS ──
  const logs = [
    { id: 1, user_id: 2, action: 'Asset Allocated', description: 'Allocated Dell Laptop Pro (AF-0001) to Priya Sharma (Operations)', createdAt: new Date(Date.now()-30*864e5).toISOString() },
    { id: 2, user_id: 2, action: 'Asset Allocated', description: 'Allocated MacBook Air M2 (AF-0002) to Ananya Iyer (Operations)', createdAt: new Date(Date.now()-35*864e5).toISOString() },
    { id: 3, user_id: 2, action: 'Maintenance Approved', description: 'Approved maintenance for Dell Monitor 27" (AF-0007) — High priority', createdAt: new Date(Date.now()-6*864e5).toISOString() },
    { id: 4, user_id: 1, action: 'Audit Created', description: 'Created Q2 2024 IT Asset Audit cycle (Dept: IT Department)', createdAt: new Date(Date.now()-10*864e5).toISOString() },
    { id: 5, user_id: 3, action: 'Booking Created', description: 'Booked Conference Room B2 (AF-0004) for Team Standup', createdAt: new Date(Date.now()-864e5).toISOString() },
    { id: 6, user_id: 4, action: 'Maintenance Raised', description: 'Raised maintenance request for HP LaserJet Pro (AF-0003) — Medium', createdAt: new Date(Date.now()-2*864e5).toISOString() },
    { id: 7, user_id: 7, action: 'Transfer Requested', description: 'Requested transfer of Dell Laptop Pro (AF-0001) from Priya Sharma', createdAt: new Date(Date.now()-864e5).toISOString() },
    { id: 8, user_id: 2, action: 'Asset Registered', description: 'Registered new asset: Lenovo ThinkPad X1 (AF-0018) in HR Dept', createdAt: new Date(Date.now()-5*864e5).toISOString() },
    { id: 9, user_id: 1, action: 'Role Promoted', description: 'Promoted Ashish Sudhar (manager@assetflow.com) to Asset Manager', createdAt: '2024-01-01T00:00:00Z' },
    { id: 10, user_id: 2, action: 'Asset Returned', description: 'Dell Laptop Pro (AF-0001) returned by Vivek Kumar — Good condition', createdAt: '2024-03-01T00:00:00Z' },
    { id: 11, user_id: 5, action: 'Booking Created', description: 'Booked Conference Room A1 (AF-0017) for Training Session', createdAt: new Date(Date.now()-2*864e5).toISOString() },
    { id: 12, user_id: 3, action: 'Transfer Approved', description: 'Approved transfer of HP Desktop Workstation (AF-0009) to Rohan Desai', createdAt: new Date(Date.now()-3*864e5).toISOString() },
  ];
  _setTable('activityLogs', logs);

  localStorage.setItem(DB_PREFIX + 'seeded_v6', 'true');
  console.log('[AssetFlow] DB seeded v6 — Odoo Enterprise UI ready.');
}

// Init on load
seedDatabase();
