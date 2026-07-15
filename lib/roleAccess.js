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
// Catatan (permintaan Inspektorat Sumba Barat): menu Tambah Temuan,
// Upload Excel, dan Edit Data Temuan HANYA boleh diakses admin utama.
// Operator OPD hanya boleh melihat data & mengunggah bukti setoran.
export const MENU_ACCESS = {
  dashboard: [ROLES.ADMIN, ROLES.PIMPINAN, ROLES.OPERATOR_OPD],
  temuan: [ROLES.ADMIN, ROLES.PIMPINAN, ROLES.OPERATOR_OPD],
  tambahTemuan: [ROLES.ADMIN],
  editTemuan: [ROLES.ADMIN],
  uploadExcel: [ROLES.ADMIN],
  laporan: [ROLES.ADMIN, ROLES.PIMPINAN],
  log: [ROLES.ADMIN],
  pengguna: [ROLES.ADMIN],
};

// Aksi granular dipakai di dalam halaman (mis. tombol hapus, cetak, dsb.)
// editOwnOpdOnly & uploadExcelOwnOpdOnly sengaja selalu false: Operator
// OPD tidak lagi diberi akses tambah/edit temuan maupun upload Excel,
// sesuai permintaan -- menu-menu itu eksklusif untuk admin utama.
// Fungsinya tetap dipertahankan (bukan dihapus) agar pemanggilnya di
// UI tidak perlu diubah dan supaya mudah diaktifkan kembali di masa depan.
export const CAN = {
  deleteTemuan: (role) => role === ROLES.ADMIN,
  restoreTemuan: (role) => role === ROLES.ADMIN,
  editAnyOpd: (role) => role === ROLES.ADMIN,
  editOwnOpdOnly: () => false,
  uploadExcelAnyOpd: (role) => role === ROLES.ADMIN,
  uploadExcelOwnOpdOnly: () => false,
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

// Boleh mengedit baris temuan tertentu? Hanya admin utama -- Operator OPD
// tidak lagi diberi akses edit sama sekali (hanya boleh melihat data &
// mengunggah bukti setoran), sesuai permintaan. Dipakai di menu Data
// Temuan & halaman Edit -- RLS di database (temuan_update_scoped) tetap
// jadi lapis pertahanan sesungguhnya, ini hanya untuk menyembunyikan/
// menonaktifkan tombol di UI.
export function canEditTemuan(profile, row) {
  if (!profile || !row) return false;
  if (row.deleted_at) return false;
  return profile.role === ROLES.ADMIN;
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
