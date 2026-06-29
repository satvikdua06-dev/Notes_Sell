import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import {
  LayoutDashboard, Users, BookOpen, Library,
  ShoppingBag, Receipt, UserCircle, ChevronRight,
} from 'lucide-react';

const NAV = [
  { to: '/admin',         label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/authors', label: 'Authors',    icon: UserCircle },
  { to: '/admin/subjects',label: 'Subjects',   icon: Library },
  { to: '/admin/chapters',label: 'Chapters',   icon: BookOpen },
  { to: '/admin/bundles', label: 'Bundles',    icon: ShoppingBag },
  { to: '/admin/orders',  label: 'Orders',     icon: Receipt },
  { to: '/admin/users',   label: 'Users',      icon: Users },
];

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );
}

export default function AdminLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-white/[0.07] flex flex-col pt-20 pb-6">
        <p className="px-5 mb-3 text-[0.68rem] font-mono tracking-widest uppercase text-text-faint">
          Admin
        </p>
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ` +
                (isActive
                  ? 'bg-surface text-text font-medium'
                  : 'text-text-faint hover:text-text hover:bg-white/[0.04]')
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              <ChevronRight className="w-3 h-3 ml-auto opacity-30" />
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-5">
          <p className="text-text-faint text-xs font-mono">{user.email}</p>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto pt-20 pb-12 px-8">
        <Outlet />
      </main>
    </div>
  );
}
