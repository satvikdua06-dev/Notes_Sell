import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  purchase_count: number;
  total_spend: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [email, setEmail] = useState('');
  const [activeEmail, setActiveEmail] = useState('');

  const load = (pg: number, emailFilter: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (emailFilter) params.set('email', emailFilter);
    api.get(`/admin/users?${params}`)
      .then(r => {
        setUsers(r.data.users);
        setPage(r.data.page);
        setPages(r.data.pages);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1, ''); }, []);

  const search = () => { setActiveEmail(email); load(1, email); };
  const goPage = (pg: number) => load(pg, activeEmail);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display font-bold text-2xl text-text mb-6">Users</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="input-field flex-1"
          placeholder="Filter by email…"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button onClick={search} className="btn-primary text-sm px-4">Filter</button>
      </div>

      <p className="text-text-faint text-xs mb-3">{total} user{total !== 1 ? 's' : ''}</p>

      {loading && <p className="text-text-faint animate-pulse">Loading…</p>}

      <div className="space-y-1.5 mb-4">
        {users.map(u => (
          <div key={u.id} className="bg-surface border border-white/[0.07] rounded-xl px-5 py-3.5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-text text-sm font-medium truncate">{u.email}</p>
                {u.role === 'admin' && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-violet-500/20 text-violet-300">admin</span>
                )}
              </div>
              <p className="text-text-faint text-xs">{u.name || '—'}</p>
            </div>
            <div className="text-right flex-shrink-0 space-y-0.5">
              <p className="text-text text-sm">{u.purchase_count} purchase{u.purchase_count !== 1 ? 's' : ''}</p>
              <p className="text-text-faint text-xs">₹{u.total_spend.toLocaleString('en-IN')} spent</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-text-faint text-xs font-mono">
                {new Date(u.created_at).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
        ))}
        {!loading && users.length === 0 && (
          <p className="text-text-faint text-sm">No users found.</p>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button onClick={() => goPage(page - 1)} disabled={page <= 1} className="btn-ghost p-1.5 rounded-lg disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-text-faint text-sm">Page {page} of {pages}</span>
          <button onClick={() => goPage(page + 1)} disabled={page >= pages} className="btn-ghost p-1.5 rounded-lg disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
