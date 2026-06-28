import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Chapter, Subject } from '../types';
import ChapterCard from './ChapterCard';
import { useCart } from '../store/cart';

gsap.registerPlugin(ScrollTrigger);

interface Props {
  subject: Subject;
  chapters: Chapter[];
  purchasedIds?: Set<string>;
}

export default function SubjectSection({ subject, chapters, purchasedIds = new Set() }: Props) {
  const cardsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { add, hasBundle } = useCart();

  const ownedCount = chapters.filter((c) => purchasedIds.has(c.id)).length;
  const totalCount = chapters.length;
  const fullyOwned = totalCount > 0 && ownedCount === totalCount;
  const bundleInCart = hasBundle(subject.id);

  const addBundle = () => {
    add({
      chapterId: subject.id,
      title: `${subject.name} — all ${totalCount} notes`,
      subjectName: subject.name,
      subjectSlug: subject.slug,
      price: subject.bundle_price_inr,
      bundleSubjectId: subject.id,
    });
  };

  useEffect(() => {
    if (!cardsRef.current) return;
    const cards = cardsRef.current.querySelectorAll('.chapter-card');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.05,
        duration: 0.45,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: cardsRef.current,
          start: 'top 88%',
          once: true,
        },
      }
    );
  }, []);

  const bundleButton = () => {
    if (fullyOwned) {
      return (
        <span className="text-xs text-text-faint font-body">All chapters owned</span>
      );
    }
    if (bundleInCart) {
      return (
        <span className="text-xs text-accent font-body">✓ Bundle in cart</span>
      );
    }
    return (
      <button
        onClick={addBundle}
        className="text-sm font-body text-accent hover:underline underline-offset-2 shrink-0 text-right"
      >
        Or get all {totalCount} for ₹{subject.bundle_price_inr} →
        {ownedCount > 0 && (
          <span className="block text-[11px] text-text-faint font-normal mt-0.5">
            {ownedCount} of {totalCount} already owned
          </span>
        )}
      </button>
    );
  };

  return (
    <section id={subject.slug} className="scroll-mt-20">
      <div className="flex items-end justify-between mb-4 pb-3 border-b border-white/10">
        <div>
          <h2 className="font-display font-bold text-2xl md:text-3xl text-text leading-none">
            {subject.name}
          </h2>
          <p className="text-text-faint text-sm font-body mt-1">
            {totalCount} notes · bundle ₹{subject.bundle_price_inr}
          </p>
        </div>
        {bundleButton()}
      </div>

      <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {chapters.map((chapter, index) => (
          <div key={chapter.id} className={index === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}>
            <ChapterCard
              chapter={chapter}
              subjectName={subject.name}
              subjectSlug={subject.slug}
              purchased={purchasedIds.has(chapter.id)}
              featured={index === 0}
              onView={() => navigate(`/viewer/${chapter.id}`)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
