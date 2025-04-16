import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Calendar, MessageCircle, Menu } from 'lucide-react';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
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
    return location.pathname === path ? 'text-blue-500' : 'text-neutral-500 hover:text-blue-400';
  };
  
  const handleLogout = () => {
    // Clear the beta access from local storage
    localStorage.removeItem('beta_access');
    // Redirect to landing page
    navigate('/');
  };
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      {/* Top Navigation Bar */}
      <div className="text-neutral-100">
        <div className="max-w-7xl mx-auto px-4 py-4 pb-2 flex justify-between items-center">
          <h1 className="text-lg font-light flex items-center text-neutral-900">
            <img src="/favicon.svg" alt="Logo" className="mr-2" width={30} height={30} />
            Thesis
          </h1>
          
          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={toggleMenu}
              className="flex items-center text-neutral-500"
              style={{ zIndex: 30 }}
            >
              <Menu size={24} />
            </button>
          )}
          
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
                    <span>Earnings</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard/calendar"
                    className={`flex items-center px-2 py-1 text-sm rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard/calendar')}`}
                  >
                    <Calendar className="mr-1" size={14} />
                    <span>Calendar</span>
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-2 py-1 text-sm rounded-md transition-colors duration-150 ease-in-out text-neutral-500 hover:text-red-500"
                  >
                    <LogOut className="mr-1" size={14} />
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </nav>
          )}
          
          {/* Mobile Navigation Overlay */}
          {isMobile && menuOpen && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                paddingTop: '60px'
              }}
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
                      <span>Earnings</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/calendar"
                      className={`flex items-center px-3 py-2 text-base rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard/calendar')}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Calendar className="mr-2" size={18} />
                      <span>Calendar</span>
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center px-3 py-2 text-base rounded-md transition-colors duration-150 ease-in-out text-neutral-500 hover:text-red-500"
                    >
                      <LogOut className="mr-2" size={18} />
                      <span>Logout</span>
                    </button>
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
    </div>
  );
};

export default Layout;