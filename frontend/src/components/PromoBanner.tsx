import { ShoppingCart, Check } from 'lucide-react';
import { Subject, Chapter } from '../types';
import { useCart } from '../store/cart';

interface Props {
  subjects: Subject[];
  chapters: Record<string, Chapter[]>;
  purchases: Set<string>;
  megaBundlePrice: number;
}

interface BundleCard {
  id: string;
  label: string;
  title: string;
  priceInr: number;
  chapterSumInr: number;
  ownedCount: number;
  totalCount: number;
  isMega: boolean;
  subjectSlug: string;
  subjectName: string;
}

export default function PromoBanner({ subjects, chapters, purchases, megaBundlePrice }: Props) {
  const { add, hasBundle } = useCart();

  const megaChapterSumInr = subjects.reduce((sum, s) => sum + s.chapter_sum_inr, 0);
  const megaTotalCount = subjects.reduce((sum, s) => sum + (chapters[s.slug]?.length ?? 0), 0);
  const megaOwnedCount = subjects.reduce(
    (sum, s) => sum + (chapters[s.slug] ?? []).filter((c) => purchases.has(c.id)).length,
    0
  );

  const cards: BundleCard[] = [
    ...subjects.map((s) => {
      const chaps = chapters[s.slug] ?? [];
      return {
        id: s.id,
        label: s.name.toUpperCase(),
        title: `All ${chaps.length} chapters`,
        priceInr: s.bundle_price_inr,
        chapterSumInr: s.chapter_sum_inr,
        ownedCount: chaps.filter((c) => purchases.has(c.id)).length,
        totalCount: chaps.length,
        isMega: false,
        subjectSlug: s.slug,
        subjectName: s.name,
      };
    }),
    {
      id: '__mega__',
      label: 'ALL SUBJECTS',
      title: `Complete set — ${megaTotalCount} chapters`,
      priceInr: megaBundlePrice,
      chapterSumInr: megaChapterSumInr,
      ownedCount: megaOwnedCount,
      totalCount: megaTotalCount,
      isMega: true,
      subjectSlug: '',
      subjectName: 'All Subjects',
    },
  ];

  const handleAdd = (card: BundleCard) => {
    add({
      chapterId: card.id,
      title: card.isMega
        ? `All Subjects — ${card.totalCount} notes`
        : `${card.subjectName} — all ${card.totalCount} notes`,
      subjectName: card.subjectName,
      subjectSlug: card.subjectSlug,
      price: card.priceInr,
      bundleSubjectId: card.id,
    });
  };

  return (
    <div className="mb-10">
      <p className="text-text-faint text-[10px] font-body uppercase tracking-[0.14em] mb-3">
        Bundle deals
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const savingsPct = card.chapterSumInr > 0
            ? Math.round((1 - card.priceInr / card.chapterSumInr) * 100)
            : 0;
          const fullyOwned = card.totalCount > 0 && card.ownedCount === card.totalCount;
          const inCart = hasBundle(card.id);

          return (
            <div
              key={card.id}
              className={[
                'bg-card rounded-xl p-5 flex flex-col gap-3 transition-shadow duration-200 hover:shadow-card-hover',
                card.isMega
                  ? 'border-2 border-accent'
                  : 'border border-card-border border-l-[3px] border-l-accent',
              ].join(' ')}
            >
              {/* Label row */}
              <div className="flex items-center justify-between">
                <span
                  className="text-accent text-[10px] font-body tracking-[0.14em] font-semibold"
                  style={{ fontVariant: 'small-caps', textTransform: 'uppercase' }}
                >
                  {card.label}
                </span>
                {card.isMega === true && (
                  <span className="text-[10px] font-body font-semibold uppercase tracking-widest text-white bg-accent px-2 py-0.5 rounded">
                    Best value
                  </span>
                )}
              </div>

              {/* Savings — the dominant visual */}
              {savingsPct > 0 && (
                <div className="leading-none">
                  <span className="font-display italic font-bold text-4xl text-accent">
                    {savingsPct}%
                  </span>
                  <span className="font-body text-ink-muted text-sm ml-1.5">off</span>
                </div>
              )}

              {/* Title */}
              <p className="font-body text-ink text-sm font-medium leading-snug -mt-1">
                {card.title}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-2 mt-auto">
                <span className="font-mono font-bold text-xl text-ink">
                  ₹{card.priceInr}
                </span>
                {card.chapterSumInr > card.priceInr && (
                  <span className="font-mono text-xs text-ink-faint line-through">
                    ₹{card.chapterSumInr}
                  </span>
                )}
              </div>

              {/* Ownership hint */}
              {card.ownedCount > 0 && !fullyOwned && (
                <p className="text-[11px] font-body text-ink-muted -mt-1">
                  You own {card.ownedCount} of {card.totalCount}
                </p>
              )}

              {/* CTA */}
              {fullyOwned ? (
                <span className="text-xs font-body text-ink-faint pt-1">
                  All chapters owned
                </span>
              ) : inCart ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-body font-semibold text-accent pt-1">
                  <Check className="w-3.5 h-3.5" />
                  Added to cart
                </span>
              ) : card.isMega ? (
                <button
                  onClick={() => handleAdd(card)}
                  className="btn-primary justify-center text-xs py-2 mt-1"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Add everything
                </button>
              ) : (
                <button
                  onClick={() => handleAdd(card)}
                  className="btn-outline justify-center text-xs py-2 mt-1"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Add bundle
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
