import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import WaveBackground from './WaveBackground';
import { ArrowLeft } from 'lucide-react';

const BetaAccess: React.FC = () => {
  const [betaPassword, setBetaPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="relative min-h-screen w-full overflow-auto">
      {/* Wave Background */}
      <WaveBackground />

      {/* Centered Content - Updated to center vertically */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-8">
        <div className="max-w-2xl w-full px-4 md:px-6">
          
          <div className="text-center mb-2 fade-in">
            <h1 className="bg-[#f9fafb]/80 backdrop-blur-sm text-4xl font-bold mb-3 tracking-tight text-neutral-800 w-fit mx-auto">
              Beta Access
            </h1>
          </div>
          
          {/* Beta Access Form */}
          <div className="p-6 max-w-md mx-auto">
            <form onSubmit={handleBetaAccess} className="flex flex-col">
              <div className="flex items-center">
                <input
                  id="beta-password"
                  type="password"
                  value={betaPassword}
                  onChange={(e) => setBetaPassword(e.target.value)}
                  className="flex-1 px-3 py-[10px] border border-neutral-200 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/90 text-sm"
                  placeholder="Enter your beta access code"
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
              </div>
            </form>
          </div>
        </div>
        <button 
            onClick={() => navigate('/')}
            className="mt-10 flex items-center text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Return 
          </button>
      </div>
    </div>
  );
};

export default BetaAccess;