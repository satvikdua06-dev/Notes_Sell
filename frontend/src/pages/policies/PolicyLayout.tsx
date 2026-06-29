import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  updated: string;
  children: React.ReactNode;
}

export default function PolicyLayout({ title, updated, children }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20">
      <Link to="/" className="btn-ghost inline-flex mb-10 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <div className="mb-10 pb-8 border-b border-white/[0.07]">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-text mb-3">{title}</h1>
        <p className="text-text-faint text-sm font-mono">Last updated: {updated}</p>
      </div>

      {/*
        Policy content uses .policy-content (index.css descendant selectors),
        not @tailwindcss/typography — no prose plugin needed, and the HTML
        is fully static so Razorpay's automated crawler sees real content.
      */}
      <div className="policy-content">
        {children}
      </div>
    </div>
  );
}
