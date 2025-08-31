import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import Calendar from './components/Calendar';
import Earnings from './components/Earnings';
import WatchList from './components/WatchList';
import LandingPage from './components/Landing/LandingPage';
import PasswordReset from './components/Landing/PasswordReset';
import ScheduleTemplate from './components/ScheduleTemplate';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import GlobalDataProvider from './providers/GlobalDataProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <>
      <ThemeProvider>
        <AuthProvider>
          <GlobalDataProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/reset-password" element={<PasswordReset />} />
              <Route path="/ScheduleTemplate" element={<ScheduleTemplate />} />
              
              {/* Protected routes - require Authenticated User */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard/earnings" replace />} />
                  <Route path="calendar" element={<AdminRoute><Calendar /></AdminRoute>} />
                  <Route path="earnings" element={<Earnings />} />
                  <Route path="watchlist" element={<WatchList />} />
                </Route>
              </Route>
              
              {/* Catch-all route for 404 pages */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
          <ToastContainer position="top-right" />
          </GlobalDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}

export default App;