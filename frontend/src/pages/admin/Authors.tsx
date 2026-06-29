import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import api from '../../api';

interface Author {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  chapter_count: number;
  created_at: string;
}

interface FormState { name: string; email: string; bio: string }
const EMPTY: FormState = { name: '', email: '', bio: '' };

export default function Authors() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null); // author id or 'new'
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/authors')
      .then(r => setAuthors(r.data.authors))
      .catch(() => setError('Failed to load authors'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startNew = () => { setForm(EMPTY); setEditing('new'); };
  const startEdit = (a: Author) => {
    setForm({ name: a.name, email: a.email, bio: a.bio ?? '' });
    setEditing(a.id);
  };
  const cancel = () => { setEditing(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      if (editing === 'new') {
        await api.post('/admin/authors', form);
      } else {
        await api.put(`/admin/authors/${editing}`, form);
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

  const remove = async (a: Author) => {
    if (a.chapter_count > 0) {
      alert(`Cannot delete "${a.name}" — they have ${a.chapter_count} chapter(s). Reassign first.`);
      return;
    }
    if (!confirm(`Delete author "${a.name}"?`)) return;
    await api.delete(`/admin/authors/${a.id}`);
    load();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-text">Authors</h1>
        <button onClick={startNew} className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5">
          <Plus className="w-4 h-4" /> Add author
        </button>
      </div>

      {/* Inline form */}
      {editing && (
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-text">{editing === 'new' ? 'New author' : 'Edit author'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-field"
              placeholder="Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input-field"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <textarea
            className="input-field w-full resize-none"
            rows={2}
            placeholder="Bio (optional)"
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          />
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
      {error && <p className="text-red-400">{error}</p>}

      <div className="space-y-2">
        {authors.map(a => (
          <div key={a.id} className="bg-surface border border-white/[0.07] rounded-xl px-5 py-3.5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-text font-medium truncate">{a.name}</p>
              <p className="text-text-faint text-xs truncate">{a.email} · {a.chapter_count} chapter{a.chapter_count !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => startEdit(a)} className="btn-ghost p-1.5 rounded-lg">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => remove(a)} className="btn-ghost p-1.5 rounded-lg text-red-400 hover:text-red-300">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!loading && authors.length === 0 && (
          <p className="text-text-faint text-sm">No authors yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
