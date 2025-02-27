import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Database, BarChart2, Settings, Calendar, MessageSquare } from 'lucide-react';

const Layout: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-primary-600 text-white' : 'text-neutral-300 hover:bg-primary-700/20 hover:text-white';
  };
  
  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-900 text-neutral-100 shadow-lg">
        <div className="p-4 border-b border-neutral-800">
          <h1 className="text-xl font-light flex items-center">
            <Database className="mr-3 text-primary-400" />
            Earnings Manager
          </h1>
        </div>
        <nav className="mt-6 px-2">
          <ul className="space-y-1">
          <li>
              <Link
                to="/messages"
                className={`flex items-center px-4 py-3 rounded-md transition-colors duration-150 ease-in-out ${isActive('/messages')}`}
              >
                <MessageSquare className="mr-3" size={18} />
                <span>Feed</span>
              </Link>
            </li>
            <li>
              <Link
                to="/"
                className={`flex items-center px-4 py-3 rounded-md transition-colors duration-150 ease-in-out ${isActive('/')}`}
              >
                <Calendar className="mr-3" size={18} />
                <span>Calendar</span>
              </Link>
            </li>
            <li>
              <Link
                to="/historical-metrics"
                className={`flex items-center px-4 py-3 rounded-md transition-colors duration-150 ease-in-out ${isActive('/historical-metrics')}`}
              >
                <BarChart2 className="mr-3" size={18} />
                <span>Metrics</span>
              </Link>
            </li>
            <li>
              <Link
                to="/company-config"
                className={`flex items-center px-4 py-3 rounded-md transition-colors duration-150 ease-in-out ${isActive('/company-config')}`}
              >
                <Settings className="mr-3" size={18} />
                <span>Configurations</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;