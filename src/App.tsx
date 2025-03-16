import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import CompanyConfig from './components/CompanyConfig';
import Messages from './components/Messages/index';
import LandingPage from './components/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Protected routes - require beta access */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<Messages />} />
            <Route path="company-config" element={<CompanyConfig />} />
          </Route>
        </Route>
        
        {/* Catch-all route for 404 pages */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;