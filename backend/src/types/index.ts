export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  created_at: Date;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bundle_price_inr: number;
}

export interface Chapter {
  id: string;
  subject_id: string;
  title: string;
  price_inr: number;
  source_file_key: string | null;
  page_count: number;
  sort_order: number;
}

export interface Order {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  amount_inr: number;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  created_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  chapter_id: string;
  price_at_purchase: number;
}

export interface Purchase {
  id: string;
  user_id: string;
  chapter_id: string;
  order_id: string;
  status: 'paid';
  purchased_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: 'user' | 'admin' };
      purchase?: { orderId: string };
    }
  }
}
