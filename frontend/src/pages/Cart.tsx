import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '../store/cart';
import { useAuth } from '../store/auth';
import api from '../api';

type PaymentStatus = 'idle' | 'creating' | 'waiting' | 'paid' | 'failed';

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('rzp-script')) return resolve(true);
    const s = document.createElement('script');
    s.id = 'rzp-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Cart() {
  const { items, remove, clear, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [orderId, setOrderId] = useState<string>('');
  const [error, setError] = useState('');
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(pageRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  // Poll order status while waiting for webhook
  useEffect(() => {
    if (status !== 'waiting' || !orderId) return;
    let cancelled = false;
    let done = false;
    const poll = async () => {
      while (!cancelled && !done) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const { data } = await api.get(`/orders/${orderId}/status`);
          if (data.status === 'paid') {
            done = true;
            setStatus('paid');
            clear();
            setTimeout(() => navigate('/library'), 2000);
            return;
          }
          if (data.status === 'failed') {
            done = true;
            setStatus('failed');
            setError('Payment failed. Please try again.');
            return;
          }
        } catch { /* keep polling */ }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [status, orderId, clear, navigate]);

  const checkout = async () => {
    if (!user) return navigate('/login');
    if (items.length === 0) return;

    setStatus('creating');
    setError('');

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Could not load Razorpay');

      const megaItem = items.find((i) => i.bundleSubjectId === '__mega__');
      const bundleItems = items.filter((i) => i.bundleSubjectId && i.bundleSubjectId !== '__mega__');
      const chapterItems = items.filter((i) => !i.bundleSubjectId);
      const { data } = await api.post('/orders', {
        chapterIds: chapterItems.map((i) => i.chapterId),
        bundleSubjectIds: bundleItems.map((i) => i.bundleSubjectId!),
        megaBundle: !!megaItem,
      });
      setOrderId(data.orderId);

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpayOrderId,
        name: 'Notarium',
        description: `${items.length} chapter note${items.length > 1 ? 's' : ''}`,
        image: '/favicon.svg',
        prefill: { email: user.email, name: user.name },
        theme: { color: '#7C3AED' },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setStatus('waiting');
          try {
            // Verify signature server-side — safe fallback when webhook tunnel is unreliable
            await api.post(`/orders/${data.orderId}/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setStatus('paid');
            clear();
            setTimeout(() => navigate('/library'), 2000);
          } catch {
            // Verification failed or server error — fall back to webhook polling
          }
        },
        modal: {
          ondismiss: () => {
            setStatus((prev) => prev === 'creating' ? 'idle' : prev);
          },
        },
      });

      rzp.open();
      setStatus('waiting');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not start checkout');
      setStatus('idle');
    }
  };

  if (status === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4 pt-16">
        <div>
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="font-display font-bold text-2xl text-text mb-2">Payment confirmed!</h1>
          <p className="text-text-muted">Redirecting you to your library…</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16" style={{ opacity: 0 }}>
      <h1 className="section-title mb-8 flex items-center gap-3">
        <ShoppingCart className="w-7 h-7 text-violet-light" />
        Your cart
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingCart className="w-12 h-12 text-text-faint mx-auto mb-4" />
          <h2 className="font-display font-semibold text-text text-xl mb-2">Cart is empty</h2>
          <p className="text-text-muted mb-6">Browse our notes and add what you need.</p>
          <Link to="/catalog" className="btn-primary">Browse Notes</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={item.chapterId} className="card flex items-center justify-between gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-text-muted text-xs font-mono mb-0.5">{item.subjectName}</p>
                  <p className="font-display font-semibold text-text text-sm leading-snug truncate">
                    {item.title}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="price-tag font-bold">₹{item.price}</span>
                  <button
                    onClick={() => remove(item.chapterId)}
                    className="text-text-faint hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="font-display font-semibold text-text mb-4">Order summary</h2>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-text-muted">
                  <span>{items.length} item{items.length > 1 ? 's' : ''}</span>
                  <span>₹{total()}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Delivery</span>
                  <span className="text-emerald-400">Instant digital</span>
                </div>
              </div>

              <div className="flex justify-between font-display font-bold text-text text-lg border-t border-violet/10 pt-4 mb-6">
                <span>Total</span>
                <span className="price-tag text-xl">₹{total()}</span>
              </div>

              {error && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}

              {!user && (
                <p className="text-text-muted text-xs mb-3 text-center">
                  You'll be asked to log in before checkout.
                </p>
              )}

              <button
                onClick={checkout}
                disabled={status !== 'idle'}
                className="btn-primary w-full justify-center py-3"
              >
                {status === 'creating' ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : status === 'waiting' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Waiting for payment…
                  </>
                ) : (
                  <>
                    Pay ₹{total()}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-text-faint text-xs text-center mt-3">
                Secured by Razorpay · UPI, Cards, NetBanking
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
