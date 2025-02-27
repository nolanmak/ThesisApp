import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Database, BarChart2, Settings, Calendar } from 'lucide-react';

const Layout: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-blue-700' : '';
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-48 bg-blue-800 text-white">
        <div className="p-2">
          <h1 className="text-lg font-bold flex items-center">
            <Database className="mr-2" />
            Earnings Manager
          </h1>
        </div>
        <nav className="mt-6">
          <ul>
            <li>
              <Link
                to="/"
                className={`flex items-center px-4 py-3 hover:bg-blue-700 ${isActive('/')}`}
              >
                <Calendar className="mr-2" />
                <span>Calendar</span>
              </Link>
            </li>
            <li>
              <Link
                to="/historical-metrics"
                className={`flex items-center px-4 py-3 hover:bg-blue-700 ${isActive('/historical-metrics')}`}
              >
                <BarChart2 className="mr-2" />
                <span>Metrics</span>
              </Link>
            </li>
            <li>
              <Link
                to="/company-config"
                className={`flex items-center px-4 py-3 hover:bg-blue-700 ${isActive('/company-config')}`}
              >
                <Settings className="mr-2" />
                <span>Configurations</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;