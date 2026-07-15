// lib/roleAccess.js
// Sumber tunggal ("single source of truth") untuk matriks hak akses.
// Dipakai oleh middleware halaman (withRoleGuard) dan oleh komponen UI
// untuk menyembunyikan/menonaktifkan aksi yang tidak diizinkan.

export const ROLES = {
  ADMIN: 'admin',
  PIMPINAN: 'pimpinan',
  OPERATOR_OPD: 'operator_opd',
};

// Menu -> role yang boleh mengakses. Dipakai Sidebar & withRoleGuard.
export const MENU_ACCESS = {
  dashboard: [ROLES.ADMIN, ROLES.PIMPINAN, ROLES.OPERATOR_OPD],
  temuan: [ROLES.ADMIN, ROLES.PIMPINAN, ROLES.OPERATOR_OPD],
  tambahTemuan: [ROLES.ADMIN, ROLES.OPERATOR_OPD],
  editTemuan: [ROLES.ADMIN, ROLES.OPERATOR_OPD],
  uploadExcel: [ROLES.ADMIN, ROLES.OPERATOR_OPD],
  laporan: [ROLES.ADMIN, ROLES.PIMPINAN],
  log: [ROLES.ADMIN],
  pengguna: [ROLES.ADMIN],
};

// Aksi granular dipakai di dalam halaman (mis. tombol hapus, cetak, dsb.)
export const CAN = {
  deleteTemuan: (role) => role === ROLES.ADMIN,
  restoreTemuan: (role) => role === ROLES.ADMIN,
  editAnyOpd: (role) => role === ROLES.ADMIN,
  editOwnOpdOnly: (role) => role === ROLES.OPERATOR_OPD,
  uploadExcelAnyOpd: (role) => role === ROLES.ADMIN,
  uploadExcelOwnOpdOnly: (role) => role === ROLES.OPERATOR_OPD,
  manageUsers: (role) => role === ROLES.ADMIN,
  exportLaporan: (role) => role === ROLES.ADMIN || role === ROLES.PIMPINAN,
  printLHP: (role) => role === ROLES.ADMIN || role === ROLES.PIMPINAN,
  viewLog: (role) => role === ROLES.ADMIN,
};

export function hasMenuAccess(menuKey, role) {
  const allowed = MENU_ACCESS[menuKey];
  if (!allowed) return true; // menu tak terdaftar dianggap publik/terautentikasi
  return allowed.includes(role);
}

// Boleh mengedit baris temuan tertentu? Admin boleh mengedit semua baris;
// Operator OPD hanya boleh mengedit baris milik OPD-nya sendiri dan yang
// belum dihapus (soft delete). Dipakai di menu Data Temuan & halaman Edit
// — RLS di database (temuan_update_scoped) tetap jadi lapis pertahanan
// sesungguhnya, ini hanya untuk menyembunyikan/menonaktifkan tombol di UI.
export function canEditTemuan(profile, row) {
  if (!profile || !row) return false;
  if (row.deleted_at) return false;
  if (profile.role === ROLES.ADMIN) return true;
  if (profile.role === ROLES.OPERATOR_OPD) {
    return !!profile.opd_id && row.opd_id === profile.opd_id;
  }
  return false;
}

// Filter query Supabase agar operator_opd hanya melihat OPD-nya sendiri.
// Contoh: applyOpdScope(supabase.from('temuan_bpk').select('*'), profile)
export function applyOpdScope(query, profile) {
  if (!profile) return query;
  if (profile.role === ROLES.OPERATOR_OPD && profile.opd_id) {
    return query.eq('opd_id', profile.opd_id);
  }
  return query;
}
