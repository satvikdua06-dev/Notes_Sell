import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search } from 'lucide-react';
import api from '../api';
import { Subject, Chapter, Purchase } from '../types';
import SubjectSection from '../components/SubjectSection';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';

gsap.registerPlugin(ScrollTrigger);

type ChapterMap = Record<string, Chapter[]>;

export default function Catalog() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<ChapterMap>({});
  const [purchases, setPurchases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const headerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { add } = useCart();
  const location = useLocation();

  useEffect(() => {
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', delay: 0.05 }
    );

    async function load() {
      try {
        const { data } = await api.get('/subjects');
        const subs: Subject[] = data.subjects;
        setSubjects(subs);

        const chapMap: ChapterMap = {};
        await Promise.all(
          subs.map(async (s) => {
            const r = await api.get(`/subjects/${s.slug}/chapters`);
            chapMap[s.slug] = r.data.chapters;
          })
        );
        setChapters(chapMap);

        if (user) {
          const lib = await api.get('/library');
          const ids = new Set<string>(lib.data.purchases.map((p: Purchase) => p.chapter_id));
          setPurchases(ids);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    }
  }, [location.hash, loading]);

  const addAll = () => {
    subjects.forEach((s) => {
      (chapters[s.slug] || []).forEach((c) => {
        if (!purchases.has(c.id)) {
          add({ chapterId: c.id, title: c.title, subjectName: s.name, subjectSlug: s.slug, price: c.price_inr });
        }
      });
    });
  };

  const filtered = (slug: string) => {
    const q = search.toLowerCase();
    return (chapters[slug] || []).filter((c) => !q || c.title.toLowerCase().includes(q));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20">
      {/* Header */}
      <div ref={headerRef} className="mb-10" style={{ opacity: 0 }}>
        <h1 className="font-display font-bold text-4xl md:text-5xl text-text leading-tight mb-3">
          Browse Notes
        </h1>
        <p className="font-body text-text-muted text-lg max-w-lg">
          Pick individual chapters or grab a subject bundle — Biology, Chemistry, Physics.
        </p>
      </div>

      {/* All-subjects banner */}
      <div className="mb-10 rounded-xl border border-accent/30 bg-accent-faint px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-text-faint text-xs font-body uppercase tracking-widest mb-1">Best value</p>
          <h2 className="font-display font-bold text-xl text-text">All subjects · 35 notes</h2>
          <p className="text-text-muted text-sm font-body mt-0.5">
            Biology (17) + Chemistry (5) + Physics (13)
          </p>
        </div>
        <button onClick={addAll} className="btn-primary shrink-0">
          Add everything — ₹59
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-10 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chapters..."
          className="input pl-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`h-36 rounded-xl shimmer ${i === 0 ? 'sm:col-span-2' : ''}`} />
          ))}
        </div>
      ) : (
        <div className="space-y-14">
          {subjects.map((s) => {
            const chaps = filtered(s.slug);
            if (!chaps.length && search) return null;
            return (
              <SubjectSection
                key={s.id}
                subject={s}
                chapters={chaps}
                purchasedIds={purchases}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
