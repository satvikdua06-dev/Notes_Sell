import { ShoppingCart, Check, BookOpen } from 'lucide-react';
import { Chapter } from '../types';
import { useCart } from '../store/cart';
import { clsx } from 'clsx';

interface Props {
  chapter: Chapter;
  subjectName: string;
  subjectSlug: string;
  purchased?: boolean;
  featured?: boolean;
  onView?: () => void;
}

export default function ChapterCard({
  chapter,
  subjectName,
  subjectSlug: _subjectSlug,
  purchased,
  featured,
  onView,
}: Props) {
  const { add, remove, has } = useCart();
  const inCart = has(chapter.id);

  const toggle = () => {
    if (inCart) {
      remove(chapter.id);
    } else {
      add({
        chapterId: chapter.id,
        title: chapter.title,
        subjectName,
        subjectSlug: _subjectSlug,
        price: chapter.price_inr,
      });
    }
  };

  return (
    <div
      className={clsx(
        'chapter-card flex flex-col',
        featured ? 'p-6' : 'p-4',
        purchased && 'opacity-90'
      )}
    >
      {/* Subject label — small caps, no badge */}
      <span
        className="text-ink-faint font-body text-[10px] tracking-[0.12em] mb-2 block"
        style={{ fontVariant: 'small-caps', textTransform: 'uppercase' }}
      >
        {subjectName}
      </span>

      {/* Title */}
      <h3
        className={clsx(
          'font-display text-ink leading-snug flex-1',
          featured ? 'text-xl font-bold mb-4' : 'text-[15px] font-semibold mb-3'
        )}
      >
        {chapter.title}
      </h3>

      {/* Footer row: page count + price + button */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-card-border mt-auto">
        <div className="flex items-baseline gap-3">
          {chapter.page_count > 0 && (
            <span className="text-ink-faint text-xs font-body flex items-center gap-1">
              <BookOpen className="w-3 h-3 inline" />
              {chapter.page_count}p
            </span>
          )}
          <span className="price text-sm font-semibold">₹{chapter.price_inr}</span>
        </div>

        {purchased ? (
          <button
            onClick={onView}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded
                       bg-ink text-card text-xs font-body font-semibold
                       hover:bg-ink-muted transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            Read
          </button>
        ) : (
          <button
            onClick={toggle}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-body font-semibold transition-colors',
              inCart
                ? 'bg-ink-faint/20 text-ink-muted border border-ink-faint/30 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                : 'bg-accent text-white hover:bg-accent-light'
            )}
          >
            {inCart ? (
              <>
                <Check className="w-3 h-3" />
                Added
              </>
            ) : (
              <>
                <ShoppingCart className="w-3 h-3" />
                Add
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
