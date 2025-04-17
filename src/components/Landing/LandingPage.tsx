import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WaveBackground from './WaveBackground';
import '../../styles/LandingPage.css';
import { Blend, Mail, ArrowRight, Activity } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const hasAccess = localStorage.getItem('beta_access');
    if (hasAccess === 'granted') {
      navigate('/dashboard');
    }
  }, [navigate]);

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

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Wave Background */}
      <WaveBackground />

      {/* Centered Content - Updated to center vertically */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-8">
        <div className="max-w-2xl w-full px-4 md:px-6" style={{ maxWidth: '100%' }}>
          <div className="text-center mb-12 fade-in">
              <h1 
                className="bg-[#f9fafb]/80 backdrop-blur-sm font-bold mb-4 tracking-tight text-neutral-800 w-fit mx-auto flex items-center"
                style={{
                  fontSize: isMobile ? '1.875rem' : '2.25rem',
                  padding: isMobile ? '0.5rem' : '0.25rem',
                  maxWidth: isMobile ? '90%' : 'auto',
                  wordBreak: 'break-word'
                }}
              >
                <img 
                  src="/favicon.svg" 
                  alt="Logo" 
                  className="mr-2" 
                  width={isMobile ? 36 : 48} 
                  height={isMobile ? 36 : 48} 
                />
                Thesis
              </h1>
              <p 
                className="bg-[#f9fafb]/80 backdrop-blur-sm text-neutral-600 w-fit mx-auto"
                style={{
                  fontSize: isMobile ? '1.125rem' : '1.25rem',
                  padding: isMobile ? '0.5rem' : '0.25rem',
                  maxWidth: isMobile ? '90%' : 'auto',
                  wordBreak: 'break-word'
                }}
              >
                AI-enabled financial intelligence at the speed of information.
              </p>
          </div>
          <div 
            className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 justify-center mx-auto`}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            <button 
                onClick={() => navigate('/email-signup')}
                className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md transition-colors duration-300"
                style={{ width: isMobile ? '100%' : '10rem' }}
              >
                <Mail className="mr-2" size={isMobile ? 18 : 20} />
                Waitlist
                <ArrowRight className="ml-2" size={isMobile ? 18 : 20} />
              </button>
              <button 
                onClick={() => navigate('/beta-access')}
                className="flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white py-3 px-6 rounded-md transition-colors duration-300"
                style={{ width: isMobile ? '100%' : '10rem' }}
              >
                <Activity className="mr-2" size={isMobile ? 18 : 20} />
                Beta
                <ArrowRight className="ml-2" size={isMobile ? 18 : 20} />
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
