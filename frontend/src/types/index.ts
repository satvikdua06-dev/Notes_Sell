export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bundle_price_inr: number;
  chapter_count: string;
}

export interface Chapter {
  id: string;
  title: string;
  price_inr: number;
  page_count: number;
  sort_order: number;
  subject_slug?: string;
  subject_name?: string;
}

export interface CartItem {
  chapterId: string;
  title: string;
  subjectName: string;
  subjectSlug: string;
  price: number;
}

export interface Order {
  id: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface Purchase {
  chapter_id: string;
  title: string;
  page_count: number;
  subject_name: string;
  subject_slug: string;
  purchased_at: string;
}
