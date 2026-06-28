import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { Search } from 'lucide-react';
import api from '../api';
import { Subject, Chapter, Purchase } from '../types';
import SubjectSection from '../components/SubjectSection';
import PromoBanner from '../components/PromoBanner';
import { useAuth } from '../store/auth';

type ChapterMap = Record<string, Chapter[]>;

export default function Catalog() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<ChapterMap>({});
  const [purchases, setPurchases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const headerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

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
        if (subs.length) setActiveTab(subs[0].slug);

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

  const MEGA_BUNDLE_PRICE = 59;

  const activeSubject = subjects.find((s) => s.slug === activeTab);
  const filteredChapters = (() => {
    const q = search.toLowerCase();
    return (chapters[activeTab] || []).filter((c) => !q || c.title.toLowerCase().includes(q));
  })();

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

      {/* Bundle deals row */}
      {!loading && subjects.length > 0 && (
        <PromoBanner
          subjects={subjects}
          chapters={chapters}
          purchases={purchases}
          megaBundlePrice={MEGA_BUNDLE_PRICE}
        />
      )}

      {/* Tabs + Search row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl bg-surface border border-white/5">
          {subjects.map((s) => (
            <button
              key={s.slug}
              onClick={() => { setActiveTab(s.slug); setSearch(''); }}
              className={`relative px-5 py-2 rounded-lg text-sm font-body font-medium transition-colors duration-150 ${
                activeTab === s.slug
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {s.name}
              {activeTab === s.slug && activeSubject && (
                <span className="ml-1.5 text-xs opacity-70">{chapters[s.slug]?.length ?? 0}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:ml-auto max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeSubject?.name ?? ''} chapters…`}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`h-36 rounded-xl shimmer ${i === 0 ? 'sm:col-span-2' : ''}`} />
          ))}
        </div>
      ) : activeSubject ? (
        <SubjectSection
          key={activeTab}
          subject={activeSubject}
          chapters={filteredChapters}
          purchasedIds={purchases}
        />
      ) : null}
    </div>
  );
}
