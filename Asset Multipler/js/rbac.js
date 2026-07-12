// ============================================================
// js/rbac.js — Role-Based Access Control
// ============================================================

const RBAC = {
  ROLES: {
    Admin:        { label: 'Admin',         color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: 'shield' },
    AssetManager: { label: 'Asset Manager', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: 'briefcase' },
    DeptHead:     { label: 'Dept. Head',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',  icon: 'users' },
    Employee:     { label: 'Employee',      color: '#10b981', bg: 'rgba(16,185,129,0.15)',  icon: 'user' },
  },

  // Navigation items with role visibility
  NAV: [
    { id: 'dashboard',     label: 'Dashboard',              icon: 'layout-dashboard',  roles: ['Admin','AssetManager','DeptHead','Employee'] },
    { id: 'org-setup',     label: 'Organization Setup',     icon: 'building-2',        roles: ['Admin'] },
    { id: 'assets',        label: 'Assets',                 icon: 'package',           roles: ['Admin','AssetManager','DeptHead','Employee'] },
    { id: 'allocations',   label: 'Allocation &amp; Transfer', icon: 'git-branch',    roles: ['Admin','AssetManager','DeptHead'] },
    { id: 'bookings',      label: 'Resource Booking',       icon: 'calendar',          roles: ['Admin','AssetManager','DeptHead','Employee'] },
    { id: 'maintenance',   label: 'Maintenance',            icon: 'wrench',            roles: ['Admin','AssetManager','DeptHead','Employee'] },
    { id: 'audit',         label: 'Audit',                  icon: 'clipboard-check',   roles: ['Admin','AssetManager'] },
    { id: 'analytics',     label: 'Reports',                icon: 'bar-chart-2',       roles: ['Admin','AssetManager','DeptHead'] },
    { id: 'notifications', label: 'Notifications',          icon: 'bell',              roles: ['Admin','AssetManager','DeptHead','Employee'] },
  ],

  PERMISSIONS: {
    Admin:        ['*'],
    AssetManager: [
      'assets:view','assets:register','assets:edit','assets:export',
      'allocations:view','allocations:create','allocations:return','allocations:approve_transfer',
      'bookings:view','bookings:create','bookings:cancel',
      'maintenance:view','maintenance:create','maintenance:approve','maintenance:update','maintenance:resolve',
      'audit:view','audit:create','audit:update',
      'analytics:view','notifications:view',
    ],
    DeptHead: [
      'assets:view','assets:export',
      'allocations:view_dept','allocations:approve_transfer',
      'bookings:view','bookings:create','bookings:cancel',
      'maintenance:view','maintenance:create',
      'analytics:view','notifications:view',
    ],
    Employee: [
      'assets:view',
      'bookings:view','bookings:create','bookings:cancel_own',
      'maintenance:view','maintenance:create',
      'notifications:view',
    ],
  },

  can(user, perm) {
    if (!user) return false;
    const perms = this.PERMISSIONS[user.role] || [];
    return perms.includes('*') || perms.includes(perm);
  },

  navFor(user) {
    if (!user) return [];
    return this.NAV.filter(n => n.roles.includes(user.role));
  },

  roleInfo(role) {
    return this.ROLES[role] || { label: role, color: '#6b7280', bg: 'rgba(107,114,128,0.15)', icon: 'user' };
  },
};
