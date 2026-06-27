import { Link } from 'react-router-dom';
import { Zap, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-violet/10 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-violet flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-lg">
                Study<span className="text-violet-light">Notes</span>
              </span>
            </Link>
            <p className="text-text-muted text-sm leading-relaxed max-w-xs">
              Chapter-wise Biology, Chemistry and Physics notes curated for NEET & JEE aspirants.
              Buy only what you need, study without distraction.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="mailto:support@studynotes.in" className="text-text-faint hover:text-violet-light transition-colors" aria-label="Email">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Study */}
          <div>
            <h3 className="font-display font-semibold text-sm text-text-muted uppercase tracking-wider mb-4">Study</h3>
            <ul className="space-y-2">
              {[
                { to: '/catalog', label: 'Browse Notes' },
                { to: '/catalog#biology', label: 'Biology' },
                { to: '/catalog#chemistry', label: 'Chemistry' },
                { to: '/catalog#physics', label: 'Physics' },
                { to: '/library', label: 'My Library' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-text-muted text-sm hover:text-text transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal — required for Razorpay activation */}
          <div>
            <h3 className="font-display font-semibold text-sm text-text-muted uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-2">
              {[
                { to: '/terms', label: 'Terms & Conditions' },
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/delivery', label: 'Delivery Policy' },
                { to: '/cancellation', label: 'Cancellation & Refunds' },
                { to: '/contact', label: 'Contact Us' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-text-muted text-sm hover:text-text transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-violet/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-text-faint text-xs">
            © {new Date().getFullYear()} StudyNotes. All rights reserved.
          </p>
          <p className="text-text-faint text-xs">
            Payments secured by <span className="text-text-muted">Razorpay</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
