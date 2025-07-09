import React, { useEffect, useState } from 'react';
import WaveBackground from './WaveBackground';
import GoogleSignInButton from './GoogleSignInButton';

const LandingPage: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

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
            <div style={{ width: isMobile ? '100%' : '14rem' }}>
              <GoogleSignInButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
