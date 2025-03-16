import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import WaveBackground from './WaveBackground';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const [betaPassword, setBetaPassword] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    const hasAccess = localStorage.getItem('beta_access');
    if (hasAccess === 'granted') {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Handle beta password submission
  const handleBetaAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simple hash function for basic security
    const hashPassword = (str: string) => {
      let hash = 0;
      if (str.length === 0) return hash;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString();
    };

    const passwordHash = hashPassword(betaPassword);
    const envPasswordHash = hashPassword(import.meta.env.VITE_BETA_ACCESS_PW);

    // Compare hashed passwords
    if (passwordHash === envPasswordHash) {
      // Store access in localStorage
      localStorage.setItem('beta_access', 'granted');
      toast.success('Welcome to Thesis Beta!');
      navigate('/dashboard');
    } else {
      toast.error('Invalid beta access code');
    }

    setIsSubmitting(false);
  };

  // Handle waitlist signup
  const handleWaitlistSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // For now, just show a success message
    // In a real app, you'd send this to an API
    toast.success(`Added ${waitlistEmail} to the waitlist!`);
    setWaitlistEmail('');
    
    setIsSubmitting(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Wave Background */}
      <WaveBackground />

      {/* Centered Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="max-w-xl w-full px-6 py-12">
          <div className="text-center mb-12 fade-in">
              <h1 className="bg-[#f9fafb]/80 backdrop-blur-sm text-5xl font-bold mb-3 tracking-tight text-neutral-800 w-fit mx-auto">Thesis</h1>
              <p className="bg-[#f9fafb]/80 backdrop-blur-sm text-lg text-neutral-600 w-fit mx-auto">
                Financial intelligence at the speed of information
              </p>
            </div>

          {/* Forms container - inline layout */}
          <div className="flex flex-col sm:flex-row gap-4 fade-in-delayed">
            {/* Waitlist Form */}
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-neutral-100 flex-1">
              <form onSubmit={handleWaitlistSignup} className="flex items-center">
                <input
                  id="waitlist-email"
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  className="flex-1 px-3 py-[10px] border border-neutral-200 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/90 text-sm"
                  placeholder="Join waitlist"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white py-[10px] px-3 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 shadow-sm"
                  aria-label="Join waitlist"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Beta Access Form */}
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-neutral-100 flex-1">
              <form onSubmit={handleBetaAccess} className="flex items-center">
                <input
                  id="beta-password"
                  type="password"
                  value={betaPassword}
                  onChange={(e) => setBetaPassword(e.target.value)}
                  className="flex-1 px-3 py-[10px] border border-neutral-200 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/90 text-sm"
                  placeholder="Beta access"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-neutral-800 text-white py-[10px] px-3 rounded-r-md hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 transition-colors duration-300 shadow-sm"
                  aria-label="Access beta"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
