import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from "react-oidc-context";

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const auth = useAuth();

  useEffect(() => {
    // Check Cognito authentication first
    if (auth.isAuthenticated) {
      setIsAuthenticated(true);
      return;
    }
    
    // Fallback to beta access check
    const hasAccess = localStorage.getItem('beta_access') === 'granted';
    setIsAuthenticated(hasAccess);
  }, [auth.isAuthenticated]);

  // While checking authentication status, show loading
  if (isAuthenticated === null || auth.isLoading) {
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
