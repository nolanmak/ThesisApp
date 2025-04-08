import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import Calendar from './components/Calendar';
import Earnings from './components/Earnings';
import LandingPage from './components/Landing/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import EmailSignUp from './components/Landing/EmailSignUp';
import BetaAccess from './components/Landing/BetaAccess';
import GlobalDataProvider from './providers/GlobalDataProvider';

function App() {
  return (
    <>
      <GlobalDataProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/email-signup" element={<EmailSignUp />} />
            <Route path="/beta-access" element={<BetaAccess />} />
            
            {/* Protected routes - require beta access */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard/earnings" replace />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="earnings" element={<Earnings />} />
              </Route>
            </Route>
            
            {/* Catch-all route for 404 pages */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <ToastContainer position="top-right" />
      </GlobalDataProvider>
    </>
  );
}

export default App;