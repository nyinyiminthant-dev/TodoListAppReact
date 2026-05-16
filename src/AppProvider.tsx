import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { FirestoreProvider } from './contexts/FirestoreContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Loading from './components/Loading';
import { LayoutDashboard, CheckSquare, BarChart3, Target, User } from 'lucide-react';

const mobileNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/plans', icon: Target, label: 'Plans' },
  { path: '/analytics', icon: BarChart3, label: 'Stats' },
  { path: '/profile', icon: User, label: 'Profile' },
];

interface AppProviderProps { children: ReactNode; }

export default function AppProvider({ children }: AppProviderProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthContent>{children}</AuthContent>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AuthContent({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <Loading />;
  if (!user) return <Login />;

  return (
    <FirestoreProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        {/* Desktop sidebar spacer */}
        <div className="hidden lg:block w-72 shrink-0" aria-hidden="true" />

        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <Header />

        <main className="flex-1 min-h-screen overflow-auto">
          <div className="max-w-6xl mx-auto px-6 pt-20 pb-32 lg:px-12 lg:py-12">
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40"
          style={{
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div className="flex relative">
            {mobileNavItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className="flex-1 flex flex-col items-center gap-1.5 py-4 transition-all duration-200 relative"
              >
                {({ isActive }) => (
                  <>
                    <div className="absolute inset-x-2 top-2 h-8 rounded-full transition-opacity duration-200"
                      style={{
                        background: `linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)`,
                        opacity: isActive ? 1 : 0,
                      }}
                    />
                    <item.icon className="w-5 h-5 relative z-10" style={{ color: isActive ? '#fff' : 'var(--text-3)' }} />
                    <span className="text-xs font-medium relative z-10" style={{ color: isActive ? '#fff' : 'var(--text-3)' }}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </FirestoreProvider>
  );
}
