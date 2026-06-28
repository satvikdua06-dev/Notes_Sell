import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import api, { apiUrl } from '../api';

interface ViewerSession {
  token: string;
  pageCount: number;
  expiresIn: number;
}

interface ChapterInfo {
  id: string;
  title: string;
  page_count: number;
}

// Frontend deterrents — these are friction, NOT security.
// The actual security boundary is server-side:
//   1. requireAuth (JWT verification)
//   2. requirePurchase (DB purchase check)
//   3. Server-side watermarking baked into pixels
//   4. Short-lived signed viewer token validated server-side
// Screenshots and photos of the screen cannot be blocked from a website.
function installDeterrents() {
  // Disable right-click context menu
  const noContext = (e: MouseEvent) => e.preventDefault();
  document.addEventListener('contextmenu', noContext);

  // Block Ctrl+P (print) and Ctrl+S (save)
  const noKeys = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
      e.preventDefault();
    }
  };
  document.addEventListener('keydown', noKeys);

  // CSS print block
  const style = document.createElement('style');
  style.id = 'viewer-deterrents';
  style.textContent = `
    @media print { body { display: none !important; } }
    .viewer-content { user-select: none; -webkit-user-select: none; }
  `;
  document.head.appendChild(style);

  return () => {
    document.removeEventListener('contextmenu', noContext);
    document.removeEventListener('keydown', noKeys);
    document.getElementById('viewer-deterrents')?.remove();
  };
}

export default function Viewer() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<ViewerSession | null>(null);
  const [chapter, setChapter] = useState<ChapterInfo | null>(null);
  const [page, setPage] = useState(1);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState('');
  const tokenRef = useRef<string>('');
  const tokenExpiryRef = useRef<number>(0);

  // Install deterrents for the duration of viewer session
  useEffect(() => {
    const cleanup = installDeterrents();
    return cleanup;
  }, []);

  // Fetch viewer session token
  const fetchSession = useCallback(async () => {
    if (!chapterId) return;
    try {
      const [sessionRes, infoRes] = await Promise.all([
        api.get(`/chapters/${chapterId}/viewer-session`),
        api.get(`/chapters/${chapterId}/info`),
      ]);
      const s: ViewerSession = sessionRes.data;
      setSession(s);
      setChapter(infoRes.data.chapter);
      tokenRef.current = s.token;
      tokenExpiryRef.current = Date.now() + s.expiresIn * 1000;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) navigate('/login');
      else if (status === 403) {
        setError('You have not purchased this chapter.');
      } else {
        setError('Failed to load chapter. Please try again.');
      }
    }
  }, [chapterId, navigate]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!session) return;
    const refreshMs = (session.expiresIn - 60) * 1000; // refresh 1 min before expiry
    const timer = setTimeout(fetchSession, refreshMs);
    return () => clearTimeout(timer);
  }, [session, fetchSession]);

  // Load page image
  useEffect(() => {
    if (!session || !chapterId) return;
    setPageLoading(true);
    setImgSrc('');

    // Use token from ref (always current after refresh)
    const url = apiUrl(`/chapters/${chapterId}/page/${page}?token=${encodeURIComponent(tokenRef.current)}`);
    const img = new Image();
    img.onload = () => {
      setImgSrc(url);
      setPageLoading(false);
    };
    img.onerror = () => {
      setError('Failed to load page. Your session may have expired.');
      setPageLoading(false);
    };
    img.src = url;
  }, [session, chapterId, page]);

  const prev = () => setPage((p) => Math.max(1, p - 1));
  const next = () => setPage((p) => Math.min(session?.pageCount || 1, p + 1));

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4 pt-16">
        <div>
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="font-display font-bold text-xl text-text mb-2">Access denied</h1>
          <p className="text-text-muted mb-6 text-sm">{error}</p>
          <button onClick={() => navigate('/catalog')} className="btn-primary">Browse Notes</button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <div className="fixed top-0 inset-x-0 z-50 bg-surface/95 backdrop-blur border-b border-violet/10 h-14 flex items-center px-4 gap-4">
        <button onClick={() => navigate('/library')} className="btn-ghost p-2 rounded-xl">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-text text-sm font-display font-semibold truncate">{chapter?.title}</p>
          <p className="text-text-faint text-xs font-mono">Page {page} of {session.pageCount}</p>
        </div>
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            disabled={page <= 1}
            className="btn-ghost p-2 rounded-xl disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-sm text-text-muted w-16 text-center">
            {page} / {session.pageCount}
          </span>
          <button
            onClick={next}
            disabled={page >= session.pageCount}
            className="btn-ghost p-2 rounded-xl disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Page image — viewer-content class adds user-select:none via deterrents style */}
      <div className="viewer-content flex-1 flex items-center justify-center pt-14 px-2 pb-8">
        {pageLoading ? (
          <div className="flex flex-col items-center gap-3 text-text-muted">
            <Loader2 className="w-8 h-8 text-violet animate-spin" />
            <span className="text-sm font-mono">Loading page {page}…</span>
          </div>
        ) : imgSrc ? (
          <div className="relative max-w-3xl w-full">
            <img
              src={imgSrc}
              alt={`Page ${page}`}
              className="w-full rounded-xl shadow-card select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        ) : null}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-surface/90 backdrop-blur border-t border-violet/10 py-3 px-4 flex items-center justify-center gap-4">
        <button onClick={prev} disabled={page <= 1} className="btn-outline py-2 px-5 disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <span className="font-mono text-sm text-text-muted">
          {page} / {session.pageCount}
        </span>
        <button onClick={next} disabled={page >= session.pageCount} className="btn-primary py-2 px-5 disabled:opacity-50">
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
