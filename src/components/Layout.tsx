import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, MessageCircle, Menu, List, Settings, TrendingUp, Activity, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ui/ThemeToggle';
import SettingsModal from './ui/Settings';
import GlobalAudioControls from './ui/GlobalAudioControls';

const Layout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAlphaTooltip, setShowAlphaTooltip] = useState(false);
  
  const isAdmin = user?.email === 'nolanmak7@gmail.com';
  
  // Check if the device is mobile based on screen width
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'text-blue-500 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400 hover:text-blue-400 dark:hover:text-blue-300';
  };
  
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  return (
    <div className="flex flex-col h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Top Navigation Bar */}
      <div className="text-neutral-100">
        <div className="max-w-7xl mx-auto px-4 py-4 pb-2">
          {/* Mobile: Stack vertically */}
          <div className="md:hidden">
            {/* Top row: Logo and controls */}
            <div className="flex justify-between items-center mb-3">
              <h1 className="text-lg font-light flex items-center text-neutral-900 dark:text-neutral-100">
                <img src="/favicon.svg" alt="Logo" className="mr-2" width={30} height={30} />
                EarningsOwl
              </h1>
              
              <div className="flex items-center gap-2">
                <GlobalAudioControls size="sm" />
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center justify-center p-2 rounded-md transition-colors duration-200 ease-in-out text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label="Settings"
                >
                  <Settings size={18} />
                </button>
                <ThemeToggle />
                <button
                  onClick={toggleMenu}
                  className="flex items-center text-neutral-500 dark:text-neutral-400"
                  style={{ zIndex: 30 }}
                >
                  <Menu size={24} />
                </button>
              </div>
            </div>

            {/* Alpha version info icon */}
            <div className="relative flex justify-center">
              <button
                onMouseEnter={() => setShowAlphaTooltip(true)}
                onMouseLeave={() => setShowAlphaTooltip(false)}
                className="flex items-center justify-center p-1 rounded-full transition-colors duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                aria-label="Alpha version info"
              >
                <Info size={16} />
              </button>

              {/* Tooltip */}
              {showAlphaTooltip && (
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 w-64 bg-red-50 dark:bg-red-900/90 text-red-600 dark:text-red-400 px-3 py-2 text-xs rounded-md border border-red-200 dark:border-red-800 shadow-lg z-50">
                  This is an alpha version. Please validate any data through other sources.
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-red-200 dark:border-b-red-800"></div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop: Horizontal layout */}
          <div className="hidden md:flex justify-between items-center">
            <h1 className="text-lg font-light flex items-center text-neutral-900 dark:text-neutral-100">
              <img src="/favicon.svg" alt="Logo" className="mr-2" width={30} height={30} />
              EarningsOwl
            </h1>
            
            {/* Right side controls */}
            <div className="flex items-center gap-4">
              {/* Alpha version info icon */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowAlphaTooltip(true)}
                  onMouseLeave={() => setShowAlphaTooltip(false)}
                  className="flex items-center justify-center p-1 rounded-full transition-colors duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label="Alpha version info"
                >
                  <Info size={16} />
                </button>

                {/* Tooltip */}
                {showAlphaTooltip && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-red-50 dark:bg-red-900/90 text-red-600 dark:text-red-400 px-3 py-2 text-xs rounded-md border border-red-200 dark:border-red-800 shadow-lg z-50">
                    This is an alpha version. Please validate any data through other sources.
                    <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-red-200 dark:border-b-red-800"></div>
                  </div>
                )}
              </div>

              {/* Theme Toggle and Settings (desktop only) */}
              <div className="flex items-center gap-2">
                <GlobalAudioControls size="sm" />
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center justify-center p-2 rounded-md transition-colors duration-200 ease-in-out text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label="Settings"
                >
                  <Settings size={18} />
                </button>
                <ThemeToggle />
              </div>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          {!isMobile && (
            <nav>
              <ul className="flex space-x-3 items-center">
                <li>
                  <Link
                    to="/dashboard/earnings"
                    className={`flex items-center px-2 py-1 text-sm rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard/earnings')}`}
                  >
                    <MessageCircle className="mr-1" size={14} />
                    <span>Real Time Feed</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard/realtime-grid"
                    className={`flex items-center px-2 py-1 text-sm rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard/realtime-grid')}`}
                  >
                    <Activity className="mr-1" size={14} />
                    <span>Real Time Grid</span>
                  </Link>
                </li>
                {isAdmin && (
                  <li>
                    <Link
                      to="/dashboard/calendar"
                      className={`flex items-center px-2 py-1 text-sm rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard/calendar')}`}
                    >
                      <Calendar className="mr-1" size={14} />
                      <span>Admin</span>
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to="/dashboard/watchlist"
                    className={`flex items-center px-2 py-1 text-sm rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard/watchlist')}`}
                  >
                    <List className="mr-1" size={14} />
                    <span>Watch List</span>
                  </Link>
                </li>
              </ul>
            </nav>
          )}
          
          {/* Mobile Navigation Overlay */}
          {isMobile && menuOpen && (
            <div 
              className="fixed inset-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm z-20 flex flex-col justify-center items-center pt-15"
            >
              <nav>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                  <li>
                    <Link
                      to="/dashboard/earnings"
                      className={`flex items-center px-3 py-2 text-base rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard/earnings')}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <MessageCircle className="mr-2" size={18} />
                      <span>Real Time Feed</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/realtime-grid"
                      className={`flex items-center px-3 py-2 text-base rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard/realtime-grid')}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Activity className="mr-2" size={18} />
                      <span>Real Time Grid</span>
                    </Link>
                  </li>
                  {isAdmin && (
                    <li>
                      <Link
                        to="/dashboard/calendar"
                        className={`flex items-center px-3 py-2 text-base rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard/calendar')}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <Calendar className="mr-2" size={18} />
                        <span>Admin</span>
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link
                      to="/dashboard/watchlist"
                      className={`flex items-center px-3 py-2 text-base rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard/watchlist')}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <List className="mr-2" size={18} />
                      <span>Watch List</span>
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default Layout;