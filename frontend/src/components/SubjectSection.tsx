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
  const { add, items } = useCart();

  const unpurchasedChapters = chapters.filter((c) => !purchasedIds.has(c.id));
  const allInCart = unpurchasedChapters.length > 0 &&
    unpurchasedChapters.every((c) => items.find((i) => i.chapterId === c.id));

  const addBundle = () => {
    chapters.forEach((c) => {
      if (!purchasedIds.has(c.id)) {
        add({
          chapterId: c.id,
          title: c.title,
          subjectName: subject.name,
          subjectSlug: subject.slug,
          price: c.price_inr,
        });
      }
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

  return (
    <section id={subject.slug} className="scroll-mt-20">
      {/* Subject header — typography-led, no colored banner */}
      <div className="flex items-end justify-between mb-4 pb-3 border-b border-white/10">
        <div>
          <h2 className="font-display font-bold text-2xl md:text-3xl text-text leading-none">
            {subject.name}
          </h2>
          <p className="text-text-faint text-sm font-body mt-1">
            {chapters.length} notes · bundle ₹{subject.bundle_price_inr}
          </p>
        </div>
        {!allInCart && unpurchasedChapters.length > 0 && (
          <button onClick={addBundle} className="btn-outline text-xs py-2 px-4 shrink-0">
            Add all — ₹{subject.bundle_price_inr}
          </button>
        )}
      </div>

      {/* Chapter grid — first card featured (wider on lg) */}
      <div
        ref={cardsRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            className={index === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}
          >
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
