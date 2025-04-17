import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import WaveBackground from './WaveBackground';
import { ArrowLeft } from 'lucide-react';

const BetaAccess: React.FC = () => {
  const [betaPassword, setBetaPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  
  // Handle responsive design
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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
      navigate('/dashboard');
    } else {
      toast.error('Invalid beta access code');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Wave Background */}
      <WaveBackground />

      {/* Centered Content - Updated to center vertically */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-8">
        <div className="max-w-2xl w-full px-4 md:px-6" style={{ maxWidth: '100%' }}>
          
          <div className="text-center mb-2 fade-in">
            <h1 
              className="bg-[#f9fafb]/80 backdrop-blur-sm font-bold mb-3 tracking-tight text-neutral-800 w-fit mx-auto"
              style={{
                fontSize: isMobile ? '1.875rem' : '2.25rem',
                padding: isMobile ? '0.5rem' : '0.25rem',
                maxWidth: isMobile ? '90%' : 'auto',
                wordBreak: 'break-word'
              }}
            >
              Beta Access
            </h1>
          </div>
          
          {/* Beta Access Form */}
          <div className="p-6 max-w-md mx-auto" style={{ width: isMobile ? '100%' : 'auto', padding: isMobile ? '1rem' : '1.5rem' }}>
            <form onSubmit={handleBetaAccess} className="flex flex-col" style={{ width: '100%' }}>
              <div className="flex items-center" style={{ width: '100%' }}>
                <input
                  id="beta-password"
                  type="password"
                  value={betaPassword}
                  onChange={(e) => setBetaPassword(e.target.value)}
                  className="flex-1 px-3 py-[10px] border border-neutral-200 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/90 text-sm"
                  placeholder="Enter your beta access code"
                  required
                  style={{ 
                    width: isMobile ? 'calc(100% - 40px)' : 'auto',
                    minWidth: 0
                  }}
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
            <ArrowLeft size={isMobile ? 18 : 20} className="mr-2" />
            Return 
          </button>
      </div>
    </div>
  );
};

export default BetaAccess;