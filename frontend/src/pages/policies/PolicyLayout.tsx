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
      <Link to="/" className="btn-ghost inline-flex mb-8 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-text mb-2">{title}</h1>
        <p className="text-text-faint text-sm font-mono">Last updated: {updated}</p>
      </div>

      {/*
        Policy content is plain readable HTML, not JS-rendered content,
        to satisfy Razorpay's automated crawl checks.
      */}
      <div className="prose prose-invert prose-sm sm:prose-base max-w-none
        prose-headings:font-display prose-headings:font-bold prose-headings:text-text
        prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
        prose-p:text-text-muted prose-p:leading-relaxed
        prose-li:text-text-muted
        prose-a:text-violet-light prose-a:no-underline hover:prose-a:underline
        prose-strong:text-text
        prose-ol:text-text-muted prose-ul:text-text-muted">
        {children}
      </div>
    </div>
  );
}
