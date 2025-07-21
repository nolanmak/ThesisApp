import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import Calendar from './components/Calendar';
import Earnings from './components/Earnings';
import WatchList from './components/WatchList';
import LandingPage from './components/Landing/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalDataProvider from './providers/GlobalDataProvider';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <>
      <AuthProvider>
        <GlobalDataProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              
              {/* Protected routes - require Authenticated User */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard/earnings" replace />} />
                  <Route path="calendar" element={<Calendar />} />
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
    </>
  );
}

export default App;