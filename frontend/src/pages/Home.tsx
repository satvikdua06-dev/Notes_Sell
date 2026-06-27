import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Shield, BookOpen, Banknote } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const SUBJECTS = [
  { label: 'Biology', count: 17, price: 49, slug: 'biology', tag: 'Most popular' },
  { label: 'Chemistry', count: 5, price: 6, slug: 'chemistry', tag: null },
  { label: 'Physics', count: 13, price: 12, slug: 'physics', tag: null },
];

const FEATURES = [
  {
    icon: <Banknote className="w-5 h-5 text-accent" />,
    title: 'Pay only for what you need',
    body: 'Individual chapters from ₹2. No subscriptions, no forced bundles.',
  },
  {
    icon: <Shield className="w-5 h-5 text-accent" />,
    title: 'Secure browser viewer',
    body: 'Notes open in a protected viewer with your name watermarked. No raw PDF downloads.',
  },
  {
    icon: <BookOpen className="w-5 h-5 text-accent" />,
    title: 'Permanent access',
    body: 'One-time purchase. Come back before every exam — your notes are always there.',
  },
];

export default function Home() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.1 });
    tl.fromTo(headlineRef.current,
      { opacity: 0, y: 36 },
      { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }
    )
    .fromTo(subRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
      '-=0.4'
    )
    .fromTo(ctaRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      '-=0.3'
    );

    if (statsRef.current) {
      gsap.fromTo(
        statsRef.current.querySelectorAll('.stat-item'),
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0,
          stagger: 0.1,
          duration: 0.45,
          ease: 'power2.out',
          scrollTrigger: { trigger: statsRef.current, start: 'top 80%', once: true },
        }
      );
    }

    if (featuresRef.current) {
      gsap.fromTo(
        featuresRef.current.querySelectorAll('.feature-card'),
        { opacity: 0, y: 32 },
        {
          opacity: 1, y: 0,
          stagger: 0.1,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: { trigger: featuresRef.current, start: 'top 82%', once: true },
        }
      );
    }
  }, []);

  return (
    <div className="overflow-hidden">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center text-center px-4 bg-bg">
        {/* Subtle warm vignette — not violet, not dramatic */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 30%, rgba(181,101,29,0.07) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-3xl mx-auto pt-28 pb-16">
          <p className="text-accent text-xs font-body uppercase tracking-[0.18em] mb-6">
            NEET &amp; Board Exam Prep
          </p>

          <h1
            ref={headlineRef}
            className="font-display font-bold text-5xl sm:text-6xl md:text-[68px] leading-[1.05] text-text mb-6"
            style={{ opacity: 0 }}
          >
            Every chapter.
            <br />
            <em className="not-italic text-accent">Only what you need.</em>
          </h1>

          <p
            ref={subRef}
            className="text-text-muted text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed font-body"
            style={{ opacity: 0 }}
          >
            Handcrafted Biology, Chemistry, and Physics notes for NEET and board exams.
            Buy single chapters, pay once, read any time.
          </p>

          <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-3" style={{ opacity: 0 }}>
            <Link to="/catalog" className="btn-primary text-base px-8 py-3">
              Browse Notes
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/catalog" className="btn-outline text-base px-8 py-3">
              All subjects — ₹59
            </Link>
          </div>

          {/* Subject anchors */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-12">
            {SUBJECTS.map((s) => (
              <Link
                key={s.slug}
                to={`/catalog#${s.slug}`}
                className="px-4 py-2 rounded-md bg-surface border border-white/10 text-sm font-body
                           text-text-muted hover:text-text hover:border-accent/40 transition-colors"
              >
                {s.label} — from{' '}
                <span className="text-accent font-mono font-medium">₹{
                  s.slug === 'biology' ? 12 : 2
                }</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-faint text-xs">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-accent/30" />
          scroll
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="py-14 px-4 border-y border-white/10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '35+', label: 'Chapter notes' },
            { value: '₹2', label: 'Starting price' },
            { value: '3', label: 'Subjects' },
            { value: '100%', label: 'Digital access' },
          ].map((s, i) => (
            <div key={i} className="stat-item text-center" style={{ opacity: 0 }}>
              <div className="font-display font-bold text-3xl sm:text-4xl text-accent">{s.value}</div>
              <div className="text-text-muted text-sm font-body mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Subject cards ───────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-text">What's inside</h2>
            <p className="text-text-muted text-lg font-body mt-2 max-w-md">
              Curated for the highest-yield chapters — diagrams, flowcharts, key points included.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SUBJECTS.map((s) => (
              <Link
                key={s.slug}
                to={`/catalog#${s.slug}`}
                className="bg-card border border-card-border border-l-[3px] border-l-accent
                           rounded-xl p-6 group hover:shadow-card-hover transition-shadow"
              >
                {s.tag && (
                  <span className="text-accent text-[10px] font-body uppercase tracking-widest mb-2 block">
                    {s.tag}
                  </span>
                )}
                <h3 className="font-display font-bold text-2xl text-ink mb-1">{s.label}</h3>
                <p className="text-ink-muted text-sm font-body mb-5">
                  {s.count} notes · bundle <span className="font-mono font-medium text-accent">₹{s.price}</span>
                </p>
                <div className="flex items-center gap-1 text-accent text-sm font-body font-semibold
                                group-hover:gap-2 transition-all duration-150">
                  Browse chapters <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display font-bold text-3xl text-text mb-10">Why StudyNotes</h2>
          <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card bg-surface border border-white/10 rounded-xl p-6" style={{ opacity: 0 }}>
                <div className="mb-4">{f.icon}</div>
                <h3 className="font-display font-semibold text-lg text-text mb-2">{f.title}</h3>
                <p className="text-text-muted text-sm font-body leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center bg-surface border border-accent/25 rounded-2xl p-12">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-text mb-3">
            All 35 notes — <span className="text-accent">₹59</span>
          </h2>
          <p className="text-text-muted font-body mb-8">
            Biology, Chemistry and Physics. One-time purchase. Study for any exam, any time.
          </p>
          <Link to="/catalog" className="btn-primary text-base px-10 py-3">
            Get all notes — ₹59
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}
