import { useEffect, useState } from 'react';
import { Pencil, Check, X, EyeOff, Eye } from 'lucide-react';
import api from '../../api';

interface Bundle {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  bundle_price_inr: number;
  sort_order: number;
  chapter_count: number;
  active_sum_inr: number;
}

export default function Bundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/bundles')
      .then(r => setBundles(r.data.bundles))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startEdit = (b: Bundle) => {
    setPrice(String(b.bundle_price_inr));
    setEditing(b.id);
  };
  const cancel = () => { setEditing(null); setPrice(''); };

  const save = async (b: Bundle) => {
    setSaving(true);
    try {
      await api.put(`/admin/bundles/${b.id}`, { bundle_price_inr: parseInt(price) || 0 });
      cancel();
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: Bundle) => {
    await api.put(`/admin/bundles/${b.id}`, { is_active: !b.is_active });
    load();
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-text">Bundles</h1>
        <p className="text-text-faint text-sm mt-1">Per-subject bundle pricing. Deactivating a subject here hides it from the storefront.</p>
      </div>

      {loading && <p className="text-text-faint animate-pulse">Loading…</p>}

      <div className="space-y-2">
        {bundles.map(b => (
          <div key={b.id} className={`bg-surface border border-white/[0.07] rounded-xl px-5 py-3.5 flex items-center gap-4 ${!b.is_active ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className="text-text font-medium truncate">{b.name}</p>
              <p className="text-text-faint text-xs">
                {b.chapter_count} active chapters · chapters sum ₹{b.active_sum_inr}
              </p>
            </div>

            {editing === b.id ? (
              <div className="flex items-center gap-2">
                <span className="text-text-faint text-sm">₹</span>
                <input
                  className="input-field w-24 py-1 text-sm"
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  autoFocus
                />
                <button onClick={() => save(b)} disabled={saving} className="btn-primary text-xs px-2 py-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {saving ? '…' : 'Save'}
                </button>
                <button onClick={cancel} className="btn-ghost text-xs px-2 py-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-text font-semibold">₹{b.bundle_price_inr}</span>
                <button onClick={() => startEdit(b)} className="btn-ghost p-1.5 rounded-lg">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleActive(b)} className="btn-ghost p-1.5 rounded-lg" title={b.is_active ? 'Deactivate' : 'Activate'}>
                  {b.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        ))}
        {!loading && bundles.length === 0 && (
          <p className="text-text-faint text-sm">No subjects yet.</p>
        )}
      </div>
    </div>
  );
}
