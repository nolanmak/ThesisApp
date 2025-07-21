import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user } = useAuth();
  
  const isAdmin = user?.email === 'nolanmak7@gmail.com';
  
  if (!isAdmin) {
    return <Navigate to="/dashboard/earnings" replace />;
  }
  
  return <>{children}</>;
};

export default AdminRoute;