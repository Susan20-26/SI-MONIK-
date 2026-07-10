import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabaseClient';

export default function ManajemenPengguna() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from('profiles').select('*').order('created_at');
      if (data) setUsers(data);
    }
    loadData();
  }, []);

  async function ubahRole(id, role) {
    await supabase.from('profiles').update({ role }).eq('id', id);
    setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 min-h-screen">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Manajemen Pengguna</h2>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr className="text-left">
                <th className="py-3 px-4">Nama</th>
                <th>NIP</th>
                <th>Jabatan</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-3 px-4">{u.nama}</td>
                  <td>{u.nip}</td>
                  <td>{u.jabatan}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => ubahRole(u.id, e.target.value)}
                      className="border rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="pimpinan">Pimpinan</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
