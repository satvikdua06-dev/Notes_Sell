import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import Library from './pages/Library';
import Viewer from './pages/Viewer';
import Login from './pages/Login';
import Signup from './pages/Signup';

import Terms from './pages/policies/Terms';
import Privacy from './pages/policies/Privacy';
import Delivery from './pages/policies/Delivery';
import Contact from './pages/policies/Contact';
import Cancellation from './pages/policies/Cancellation';

import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Authors from './pages/admin/Authors';
import Subjects from './pages/admin/Subjects';
import Chapters from './pages/admin/Chapters';
import Bundles from './pages/admin/Bundles';
import Orders from './pages/admin/Orders';
import AdminUsers from './pages/admin/AdminUsers';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
  );
}

export default function App() {
  const { fetchMe } = useAuth();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<ErrorBoundary><Catalog /></ErrorBoundary>} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Policy pages — no login required (Razorpay requirement) */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cancellation" element={<Cancellation />} />

          {/* Auth-gated */}
          <Route path="/library" element={<RequireAuth><Library /></RequireAuth>} />
          <Route path="/viewer/:chapterId" element={<RequireAuth><Viewer /></RequireAuth>} />

          {/* Admin — role guard is inside AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="authors"  element={<Authors />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="chapters" element={<Chapters />} />
            <Route path="bundles"  element={<Bundles />} />
            <Route path="orders"   element={<Orders />} />
            <Route path="users"    element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
