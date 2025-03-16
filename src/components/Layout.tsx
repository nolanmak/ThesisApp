import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Blend, MessageSquare, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'text-blue-500' : 'text-neutral-500 hover:text-blue-400';
  };
  
  const handleLogout = () => {
    // Clear the beta access from local storage
    localStorage.removeItem('beta_access');
    toast.info('You have been logged out');
    // Redirect to landing page
    navigate('/');
  };
  
  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      {/* Top Navigation Bar */}
      <div className="text-neutral-100">
        <div className="max-w-7xl mx-auto px-4 py-4 pb-2 flex justify-between items-center">
          <h1 className="text-lg font-light flex items-center text-neutral-900">
            <Blend className="mr-2 text-primary-400" size={18} />
              Thesis
            </h1>
          
          {/* Horizontal Navigation */}
          <nav>
            <ul className="flex space-x-3 items-center">
              <li>
                <Link
                  to="/dashboard"
                  className={`flex items-center px-2 py-1 text-sm rounded-md transition-colors duration-150 ease-in-out ${isActive('/dashboard')}`}
                >
                  <MessageSquare className="mr-1" size={14} />
                  <span>Feed</span>
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