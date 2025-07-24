import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      if (isAuthenticated && !isLoading) {
        setIsValidating(true);
        await checkAuthStatus();
        setIsValidating(false);
        
        // If session is invalid, checkAuthStatus will handle the redirect
        // so we don't need to do anything here
      }
    };

    validateSession();
  }, [isAuthenticated, isLoading, checkAuthStatus]);

  // While checking authentication status or validating session, show loading
  if (isLoading || isValidating) {
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
