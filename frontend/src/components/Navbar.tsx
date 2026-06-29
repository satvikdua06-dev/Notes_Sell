import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, BookOpen, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';

function NotesLogo() {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="8" height="17" rx="1" stroke="#B5651D" strokeWidth="1.4"/>
      <rect x="12.5" y="1.5" width="8" height="17" rx="1" stroke="#B5651D" strokeWidth="1.4"/>
      <path d="M4 5.5H7M4 8.5H7M4 11.5H6" stroke="#B5651D" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M15 5.5H18M15 8.5H18M15 11.5H17" stroke="#B5651D" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M9.5 2V18" stroke="#B5651D" strokeWidth="1.4"/>
    </svg>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { items } = useCart();
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-surface/95 border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <NotesLogo />
          <span className="font-display font-bold text-[17px] tracking-tight text-text group-hover:text-white transition-colors">
            Notarium
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/catalog" className="btn-ghost text-sm">Browse Notes</Link>
          {user && <Link to="/library" className="btn-ghost text-sm">My Library</Link>}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Link
            to="/cart"
            className="relative btn-ghost p-2 rounded-lg"
            aria-label={`Cart (${items.length} items)`}
          >
            <ShoppingCart className="w-5 h-5" />
            {items.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent rounded-full text-[9px] font-mono font-bold text-white flex items-center justify-center">
                {items.length}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden md:flex items-center gap-1">
              <Link to="/library" className="btn-ghost p-2 rounded-lg" aria-label="My Library">
                <BookOpen className="w-5 h-5" />
              </Link>
              <button onClick={logout} className="btn-ghost p-2 rounded-lg" aria-label="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="btn-ghost text-sm">Login</Link>
              <Link to="/signup" className="btn-primary text-sm py-2 px-4">Sign up</Link>
            </div>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden btn-ghost p-2 rounded-lg"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface border-t border-white/10 px-4 py-4 flex flex-col gap-1">
          <Link to="/catalog" className="btn-ghost justify-start">Browse Notes</Link>
          {user ? (
            <>
              <Link to="/library" className="btn-ghost justify-start">My Library</Link>
              <button onClick={logout} className="btn-ghost justify-start text-left">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost justify-start">Login</Link>
              <Link to="/signup" className="btn-primary justify-center mt-1">Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
