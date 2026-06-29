import { useEffect, useState } from 'react';
import { Plus, Pencil, EyeOff, Eye, Check, X } from 'lucide-react';
import api from '../../api';

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bundle_price_inr: number;
  sort_order: number;
  is_active: boolean;
  chapter_count: number;
  chapters_sum_inr: number;
}

interface FormState {
  name: string; slug: string; description: string;
  bundle_price_inr: string; sort_order: string; is_active: boolean;
}
const EMPTY: FormState = { name: '', slug: '', description: '', bundle_price_inr: '', sort_order: '0', is_active: true };

function toSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/subjects')
      .then(r => setSubjects(r.data.subjects))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startNew = () => { setForm(EMPTY); setEditing('new'); };
  const startEdit = (s: Subject) => {
    setForm({
      name: s.name, slug: s.slug,
      description: s.description ?? '',
      bundle_price_inr: String(s.bundle_price_inr),
      sort_order: String(s.sort_order),
      is_active: s.is_active,
    });
    setEditing(s.id);
  };
  const cancel = () => { setEditing(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      if (editing === 'new') {
        await api.post('/admin/subjects', form);
      } else {
        await api.put(`/admin/subjects/${editing}`, form);
      }
      cancel();
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Subject) => {
    await api.put(`/admin/subjects/${s.id}`, { ...s, is_active: !s.is_active });
    load();
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-text">Subjects</h1>
        <button onClick={startNew} className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5">
          <Plus className="w-4 h-4" /> Add subject
        </button>
      </div>

      {editing && (
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-text">{editing === 'new' ? 'New subject' : 'Edit subject'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-field"
              placeholder="Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: editing === 'new' ? toSlug(e.target.value) : f.slug }))}
            />
            <input
              className="input-field font-mono text-sm"
              placeholder="slug"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))}
            />
          </div>
          <textarea
            className="input-field w-full resize-none"
            rows={2}
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-text-faint">Bundle price (₹)</span>
              <input
                className="input-field w-full"
                type="number"
                placeholder="0"
                value={form.bundle_price_inr}
                onChange={e => setForm(f => ({ ...f, bundle_price_inr: e.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-text-faint">Sort order</span>
              <input
                className="input-field w-full"
                type="number"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
              />
            </label>
            <label className="flex items-end gap-2 pb-0.5">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 accent-violet"
              />
              <span className="text-sm text-text-faint">Active</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel} className="btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-text-faint animate-pulse">Loading…</p>}

      <div className="space-y-2">
        {subjects.map(s => (
          <div key={s.id} className={`bg-surface border border-white/[0.07] rounded-xl px-5 py-3.5 flex items-center gap-4 ${!s.is_active ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-text font-medium truncate">{s.name}</p>
                <span className="text-xs font-mono text-text-faint">{s.slug}</span>
              </div>
              <p className="text-text-faint text-xs">
                {s.chapter_count} chapters · ₹{s.bundle_price_inr} bundle · sort {s.sort_order}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => startEdit(s)} className="btn-ghost p-1.5 rounded-lg">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => toggleActive(s)} className="btn-ghost p-1.5 rounded-lg" title={s.is_active ? 'Deactivate' : 'Activate'}>
                {s.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
        {!loading && subjects.length === 0 && (
          <p className="text-text-faint text-sm">No subjects yet.</p>
        )}
      </div>
    </div>
  );
}
