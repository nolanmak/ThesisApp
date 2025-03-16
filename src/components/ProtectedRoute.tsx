import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has beta access
    const hasAccess = localStorage.getItem('beta_access') === 'granted';
    setIsAuthenticated(hasAccess);
  }, []);

  // While checking authentication status, show nothing
  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If not authenticated, redirect to landing page
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If authenticated, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
