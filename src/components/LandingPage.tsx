import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import WaveBackground from './WaveBackground';
import './LandingPage.css';
import { Blend } from 'lucide-react';

const LandingPage: React.FC = () => {
  const [betaPassword, setBetaPassword] = useState('');
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
    <div className="relative min-h-screen w-full overflow-auto">
      {/* Wave Background */}
      <WaveBackground />

      {/* Centered Content */}
      <div className="relative z-10 flex flex-col items-center justify-start py-8">
        <div className="max-w-2xl w-full px-4 md:px-6">
          <div className="text-center mb-8 fade-in">
              <h1 className="bg-[#f9fafb]/80 backdrop-blur-sm text-4xl md:text-5xl font-bold mb-3 tracking-tight text-neutral-800 w-fit mx-auto flex items-center">
            <Blend className="mr-2 text-primary-400" size={40} />
              Thesis
            </h1>
              <p className="bg-[#f9fafb]/80 backdrop-blur-sm text-lg text-neutral-600 w-fit mx-auto">
                Financial intelligence at the speed of information
              </p>
          </div>
          
          {/* SendGrid Form Container */}
          <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-lg shadow-sm border border-neutral-100 mb-6">
            <iframe 
              src="https://cdn.forms-content-1.sg-form.com/da807cdb-0339-11f0-9e7d-ce5a65c7c06c"
              style={{
                width: '100%',
                minHeight: '500px',
                maxWidth: '100%',
                height: 'auto',
                border: 'none',
                overflow: 'none'
              }}
              title="Newsletter Signup Form"
              frameBorder="0"
        
              allowTransparency={true}
            />
          </div>
          
          {/* Beta Access Form */}
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-neutral-100 mb-8">
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
  );
};

export default LandingPage;
