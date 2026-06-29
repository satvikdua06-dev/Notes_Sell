import { useEffect, useState } from 'react';
import api from '../../api';

interface Stats {
  revenue: { all_time: number; last_30_days: number };
  order_count: number;
  active_user_count: number;
  revenue_by_author: { author_name: string; revenue: number }[];
  top_chapters: { title: string; subject_name: string; purchase_count: number }[];
  recent_orders: { id: string; amount_inr: number; status: string; created_at: string; user_email: string }[];
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
      <p className="text-text-faint text-xs font-mono uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-display font-bold text-text">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => setError('Failed to load stats'));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!stats) return <p className="text-text-faint animate-pulse">Loading…</p>;

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="max-w-5xl">
      <h1 className="font-display font-bold text-2xl text-text mb-6">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="All-time revenue" value={fmt(stats.revenue.all_time)} />
        <StatCard label="Last 30 days" value={fmt(stats.revenue.last_30_days)} />
        <StatCard label="Paid orders" value={stats.order_count.toLocaleString()} />
        <StatCard label="Buyers" value={stats.active_user_count.toLocaleString()} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Revenue by author */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-3">Revenue by author</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-faint text-xs border-b border-white/[0.06]">
                <th className="text-left pb-2">Author</th>
                <th className="text-right pb-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {stats.revenue_by_author.map(a => (
                <tr key={a.author_name} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-1.5 text-text-faint">{a.author_name}</td>
                  <td className="py-1.5 text-right text-text">{fmt(a.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top chapters */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-3">Top chapters by sales</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-faint text-xs border-b border-white/[0.06]">
                <th className="text-left pb-2">Chapter</th>
                <th className="text-right pb-2">Sales</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_chapters.map(c => (
                <tr key={c.title} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-1.5 text-text-faint">
                    <span className="text-text">{c.title}</span>
                    <span className="ml-1 text-xs opacity-50">· {c.subject_name}</span>
                  </td>
                  <td className="py-1.5 text-right text-text">{c.purchase_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-text mb-3">Recent orders</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-faint text-xs border-b border-white/[0.06]">
              <th className="text-left pb-2">User</th>
              <th className="text-left pb-2">Amount</th>
              <th className="text-left pb-2">Status</th>
              <th className="text-left pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent_orders.map(o => (
              <tr key={o.id} className="border-b border-white/[0.04] last:border-0">
                <td className="py-1.5 text-text-faint">{o.user_email}</td>
                <td className="py-1.5 text-text">{fmt(o.amount_inr)}</td>
                <td className="py-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                    o.status === 'paid'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}>{o.status}</span>
                </td>
                <td className="py-1.5 text-text-faint font-mono text-xs">
                  {new Date(o.created_at).toLocaleDateString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
