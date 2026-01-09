
import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile } from './types';
import { authService } from './services/authService';
import LandingPage from './pages/LandingPage';
import FarmerDashboard from './pages/FarmerDashboard';
import DistributorDashboard from './pages/DistributorDashboard';
import RetailerDashboard from './pages/RetailerDashboard';
import CustomerTrace from './pages/CustomerTrace';
import { LogOut, Package, User, ShoppingCart, Truck, Search } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'landing' | 'dashboard' | 'trace'>('landing');
  const [traceId, setTraceId] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setView('dashboard');
    }

    // Handle hash routing for QR scans (e.g., /#trace/123)
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#trace/')) {
        const id = hash.replace('#trace/', '');
        setTraceId(id);
        setView('trace');
      } else if (hash === '#landing') {
        setView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogin = async (email: string, role: UserRole) => {
    const loggedInUser = await authService.login(email, role);
    setUser(loggedInUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setView('landing');
  };

  const navigateToTrace = (id: string) => {
    window.location.hash = `trace/${id}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => { window.location.hash = '#landing'; setView('landing'); }}
          >
            <div className="bg-green-600 p-2 rounded-lg">
              <Package className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">AgriChain</span>
          </div>

          <nav className="flex items-center space-x-4">
            <button 
              onClick={() => setView('trace')}
              className="hidden md:flex items-center space-x-1 text-gray-600 hover:text-green-600 px-3 py-2 rounded-md font-medium"
            >
              <Search size={18} />
              <span>Trace Batch</span>
            </button>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
                  <User size={16} className="text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">{user.role}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-red-600 hover:bg-red-50 px-3 py-2 rounded-md font-medium"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setView('landing')}
                className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold shadow-sm hover:bg-green-700 transition"
              >
                Login
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {view === 'landing' && <LandingPage onLogin={handleLogin} />}
        {view === 'trace' && <CustomerTrace batchId={traceId} />}
        {view === 'dashboard' && user && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            {user.role === UserRole.FARMER && <FarmerDashboard user={user} onTrace={navigateToTrace} />}
            {user.role === UserRole.DISTRIBUTOR && <DistributorDashboard user={user} onTrace={navigateToTrace} />}
            {user.role === UserRole.RETAILER && <RetailerDashboard user={user} onTrace={navigateToTrace} />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">© 2024 AgriChain Protocol. Powered by Web3 & Transparency.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
