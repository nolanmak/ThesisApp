import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import EarningsCalendar from './components/EarningsCalendar';
import HistoricalMetrics from './components/HistoricalMetrics';
import CompanyConfig from './components/CompanyConfig';

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<EarningsCalendar />} />
          <Route path="historical-metrics" element={<HistoricalMetrics />} />
          <Route path="company-config" element={<CompanyConfig />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;