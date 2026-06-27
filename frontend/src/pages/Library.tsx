import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { BookOpen, ArrowRight, ShoppingCart } from 'lucide-react';
import api from '../api';
import { Purchase } from '../types';
import { Link } from 'react-router-dom';

export default function Library() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );

    api.get('/library').then(({ data }) => {
      setPurchases(data.purchases);
      setLoading(false);
      setTimeout(() => {
        if (gridRef.current) {
          gsap.fromTo(
            gridRef.current.querySelectorAll('.lib-card'),
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, stagger: 0.06, duration: 0.4, ease: 'power2.out' }
          );
        }
      }, 50);
    }).catch(() => setLoading(false));
  }, []);

  // Group by subject
  const grouped = purchases.reduce<Record<string, Purchase[]>>((acc, p) => {
    const key = p.subject_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      <div ref={headerRef} className="mb-10" style={{ opacity: 0 }}>
        <h1 className="section-title flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-violet-light" />
          My Library
        </h1>
        <p className="section-sub">Your purchased notes, ready to read.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl shimmer" />
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-text-faint mx-auto mb-4" />
          <h2 className="font-display font-semibold text-text text-xl mb-2">No notes yet</h2>
          <p className="text-text-muted mb-6">Browse the catalog and buy your first chapter.</p>
          <Link to="/catalog" className="btn-primary">
            <ShoppingCart className="w-4 h-4" />
            Browse Notes
          </Link>
        </div>
      ) : (
        <div ref={gridRef} className="space-y-10">
          {Object.entries(grouped).map(([subject, items]) => (
            <div key={subject}>
              <h2 className="font-display font-bold text-xl text-text mb-4 flex items-center gap-2">
                {subject}
                <span className="badge-violet">{items.length}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((p) => (
                  <button
                    key={p.chapter_id}
                    onClick={() => navigate(`/viewer/${p.chapter_id}`)}
                    className="lib-card card text-left group hover:border-violet/40 hover:shadow-violet transition-all duration-200"
                    style={{ opacity: 0 }}
                  >
                    <div className="badge-amber text-[10px] mb-3">{p.subject_name}</div>
                    <h3 className="font-display font-semibold text-text text-sm mb-3 leading-snug">
                      {p.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-text-faint mt-auto pt-3 border-t border-violet/10">
                      <span className="font-mono">{p.page_count} pages</span>
                      <span className="flex items-center gap-1 text-violet-light group-hover:gap-2 transition-all font-medium">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
