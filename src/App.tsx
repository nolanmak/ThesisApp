import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import Calendar from './components/Calendar';
import Earnings from './components/Earnings';
import WatchList from './components/WatchList';
import FinancialResearch from './components/FinancialResearch';
import RealTimeGrid from './components/RealTimeGrid';
import LandingPage from './components/Landing/LandingPage';
import PasswordReset from './components/Landing/PasswordReset';
import ScheduleTemplate from './components/ScheduleTemplate';
import EarningsDataTemplate from './components/EarningsDataTemplate';
import EarningsDataTemplateDemo from './components/EarningsDataTemplate/demo';
import EarningsDataTemplateBlank from './components/EarningsDataTemplate/blank';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import GlobalDataProvider from './providers/GlobalDataProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AudioSettingsProvider } from './contexts/AudioSettingsContext';
import { GlobalAudioProvider } from './contexts/GlobalAudioContext';

function App() {
  return (
    <>
      <ThemeProvider>
        <AudioSettingsProvider>
          <AuthProvider>
            <GlobalDataProvider>
              <Router>
                <GlobalAudioProvider>
                  <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/reset-password" element={<PasswordReset />} />
              <Route path="/ScheduleTemplate" element={<ScheduleTemplate />} />
              <Route path="/EarningsDataTemplate" element={<EarningsDataTemplate />} />
              <Route path="/EarningsDataDemo" element={<EarningsDataTemplateDemo />} />
              
              {/* Protected routes - require Authenticated User */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard/earnings" replace />} />
                  <Route path="calendar" element={<AdminRoute><Calendar /></AdminRoute>} />
                  <Route path="earnings" element={<Earnings />} />
                  <Route path="watchlist" element={<WatchList />} />
                  <Route path="research" element={<FinancialResearch />} />
                  <Route path="realtime-grid" element={<RealTimeGrid />} />
                </Route>
              </Route>
              
              {/* Catch-all route for 404 pages */}
              <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </GlobalAudioProvider>
              </Router>
              <ToastContainer position="top-right" />
            </GlobalDataProvider>
          </AuthProvider>
        </AudioSettingsProvider>
      </ThemeProvider>
    </>
  );
}

export default App;