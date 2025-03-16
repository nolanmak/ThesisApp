import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Blend, BarChart2, Settings, MessageSquare } from 'lucide-react';

const Layout: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'text-blue-500' : 'text-neutral-500 hover:text-blue-400';
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
            <ul className="flex space-x-3">
              <li>
                <Link
                  to="/"
                  className={`flex items-center px-2 py-1 text-sm rounded-md transition-colors duration-150 ease-in-out ${isActive('/')}`}
                >
                  <MessageSquare className="mr-1" size={14} />
                  <span>Feed</span>
                </Link>
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