import { useState } from 'react';
import PolicyLayout from './PolicyLayout';
import { Send, Mail, Clock } from 'lucide-react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Opens default mail client with pre-filled content
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:support@studynotes.in?subject=StudyNotes Support&body=${body}`;
    setSent(true);
  };

  return (
    <PolicyLayout title="Contact Us" updated="28 June 2026">
      <p>
        Have a question, a payment issue, or feedback? We're happy to help.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose my-6">
        {[
          { icon: <Mail className="w-5 h-5 text-violet-light" />, label: 'Email', value: 'support@studynotes.in', href: 'mailto:support@studynotes.in' },
          { icon: <Clock className="w-5 h-5 text-amber" />, label: 'Response time', value: 'Within 24 hours', href: null },
        ].map((c, i) => (
          <div key={i} className="card p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
              {c.icon}
            </div>
            <div>
              <p className="text-text-muted text-xs mb-0.5">{c.label}</p>
              {c.href ? (
                <a href={c.href} className="text-text text-sm font-medium hover:text-violet-light transition-colors">{c.value}</a>
              ) : (
                <p className="text-text text-sm font-medium">{c.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <h2>Send us a message</h2>
      {sent ? (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-emerald-400 text-sm">
          Your mail client should have opened. If not, email us directly at{' '}
          <a href="mailto:support@studynotes.in" className="underline">support@studynotes.in</a>.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 not-prose">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Priya Patel"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Your email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input min-h-[120px] resize-none"
              placeholder="Describe your question or issue…"
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            <Send className="w-4 h-4" />
            Send message
          </button>
        </form>
      )}

      <h2>Common questions</h2>
      <p><strong>I paid but my library didn't update.</strong><br />
        Wait 5–10 minutes — occasionally webhooks from Razorpay are slightly delayed. If it still
        hasn't updated, email us with your Razorpay payment ID and we'll resolve it manually.
      </p>
      <p><strong>I want to report a technical issue with a chapter.</strong><br />
        Email us with the chapter name and a description of the issue. We'll investigate and, where
        necessary, update the content.
      </p>
      <p><strong>I want to request a refund.</strong><br />
        Please read our <a href="/cancellation">Cancellation & Refunds policy</a> first, then email us.
      </p>
    </PolicyLayout>
  );
}
