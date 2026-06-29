import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, EyeOff, Eye, Check, X, Upload } from 'lucide-react';
import api from '../../api';

interface AdminChapter {
  id: string;
  title: string;
  price_inr: number;
  sort_order: number;
  is_active: boolean;
  page_count: number;
  subject_id: string;
  subject_name: string;
  author_id: string | null;
  author_name: string | null;
}

interface Author { id: string; name: string }
interface Subject { id: string; name: string }

interface FormState {
  subject_id: string; title: string; price_inr: string;
  sort_order: string; author_id: string; is_active: boolean;
}
const EMPTY: FormState = { subject_id: '', title: '', price_inr: '', sort_order: '0', author_id: '', is_active: true };

export default function Chapters() {
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/chapters'),
      api.get('/admin/authors'),
      api.get('/admin/subjects'),
    ]).then(([c, a, s]) => {
      setChapters(c.data.chapters);
      setAuthors(a.data.authors);
      setSubjects(s.data.subjects);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startNew = () => { setForm(EMPTY); setFile(null); setEditing('new'); };
  const startEdit = (c: AdminChapter) => {
    setForm({
      subject_id: c.subject_id, title: c.title,
      price_inr: String(c.price_inr), sort_order: String(c.sort_order),
      author_id: c.author_id ?? '', is_active: c.is_active,
    });
    setFile(null);
    setEditing(c.id);
  };
  const cancel = () => { setEditing(null); setForm(EMPTY); setFile(null); };

  const save = async () => {
    if (!form.title.trim() || !form.subject_id || form.price_inr === '') return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (file) fd.append('pdf', file);
      if (editing === 'new') {
        await api.post('/admin/chapters', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.put(`/admin/chapters/${editing}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
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

  const toggleActive = async (c: AdminChapter) => {
    const fd = new FormData();
    fd.append('is_active', String(!c.is_active));
    await api.put(`/admin/chapters/${c.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    load();
  };

  const filtered = filter
    ? chapters.filter(c =>
        c.title.toLowerCase().includes(filter.toLowerCase()) ||
        c.subject_name.toLowerCase().includes(filter.toLowerCase())
      )
    : chapters;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-text">Chapters</h1>
        <button onClick={startNew} className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5">
          <Plus className="w-4 h-4" /> Add chapter
        </button>
      </div>

      {editing && (
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-text">{editing === 'new' ? 'New chapter' : 'Edit chapter'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-text-faint">Subject</span>
              <select
                className="input-field w-full"
                value={form.subject_id}
                onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}
              >
                <option value="">— select subject —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-text-faint">Author</span>
              <select
                className="input-field w-full"
                value={form.author_id}
                onChange={e => setForm(f => ({ ...f, author_id: e.target.value }))}
              >
                <option value="">— unattributed —</option>
                {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          </div>
          <input
            className="input-field w-full"
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-text-faint">Price (₹)</span>
              <input
                className="input-field w-full"
                type="number"
                placeholder="0"
                value={form.price_inr}
                onChange={e => setForm(f => ({ ...f, price_inr: e.target.value }))}
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
          <div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              {file ? file.name : editing === 'new' ? 'Upload PDF (optional)' : 'Replace PDF'}
            </button>
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

      <input
        className="input-field w-full mb-4"
        placeholder="Filter by title or subject…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      {loading && <p className="text-text-faint animate-pulse">Loading…</p>}

      <div className="space-y-1.5">
        {filtered.map(c => (
          <div key={c.id} className={`bg-surface border border-white/[0.07] rounded-xl px-5 py-3 flex items-center gap-4 ${!c.is_active ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className="text-text text-sm font-medium truncate">{c.title}</p>
              <p className="text-text-faint text-xs truncate">
                {c.subject_name}
                {c.author_name ? ` · ${c.author_name}` : ''}
                {' · '}₹{c.price_inr}
                {c.page_count ? ` · ${c.page_count}pp` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => startEdit(c)} className="btn-ghost p-1.5 rounded-lg">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => toggleActive(c)} className="btn-ghost p-1.5 rounded-lg" title={c.is_active ? 'Deactivate' : 'Activate'}>
                {c.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-text-faint text-sm">No chapters found.</p>
        )}
      </div>
    </div>
  );
}
