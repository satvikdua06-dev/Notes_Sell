import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api';

interface AdminOrder {
  id: string;
  amount_inr: number;
  status: string;
  created_at: string;
  razorpay_order_id: string;
  user_email: string;
  user_name: string;
  chapter_titles: string[];
}

export default function Orders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState({ email: '', status: '' });

  const load = (pg: number, filters: { email: string; status: string }) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (filters.status) params.set('status', filters.status);
    if (filters.email) params.set('email', filters.email);
    api.get(`/admin/orders?${params}`)
      .then(r => {
        setOrders(r.data.orders);
        setPage(r.data.page);
        setPages(r.data.pages);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1, { email: '', status: '' }); }, []);

  const applySearch = () => {
    const f = { email, status };
    setSearch(f);
    load(1, f);
  };

  const goPage = (pg: number) => load(pg, search);

  return (
    <div className="max-w-5xl">
      <h1 className="font-display font-bold text-2xl text-text mb-6">Orders</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input
          className="input-field flex-1"
          placeholder="Filter by email…"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applySearch()}
        />
        <select
          className="input-field"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
        <button onClick={applySearch} className="btn-primary text-sm px-4">Filter</button>
      </div>

      <p className="text-text-faint text-xs mb-3">{total} order{total !== 1 ? 's' : ''}</p>

      {loading && <p className="text-text-faint animate-pulse">Loading…</p>}

      <div className="space-y-1.5 mb-4">
        {orders.map(o => (
          <div key={o.id} className="bg-surface border border-white/[0.07] rounded-xl px-5 py-3.5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-text text-sm font-medium">{o.user_email}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    o.status === 'paid'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}>{o.status}</span>
                </div>
                <p className="text-text-faint text-xs truncate">
                  {o.chapter_titles.slice(0, 3).join(', ')}
                  {o.chapter_titles.length > 3 ? ` +${o.chapter_titles.length - 3} more` : ''}
                </p>
                <p className="text-text-faint text-xs font-mono mt-0.5">{o.razorpay_order_id}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-text font-semibold">₹{o.amount_inr}</p>
                <p className="text-text-faint text-xs font-mono">
                  {new Date(o.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        ))}
        {!loading && orders.length === 0 && (
          <p className="text-text-faint text-sm">No orders found.</p>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => goPage(page - 1)}
            disabled={page <= 1}
            className="btn-ghost p-1.5 rounded-lg disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-text-faint text-sm">Page {page} of {pages}</span>
          <button
            onClick={() => goPage(page + 1)}
            disabled={page >= pages}
            className="btn-ghost p-1.5 rounded-lg disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
