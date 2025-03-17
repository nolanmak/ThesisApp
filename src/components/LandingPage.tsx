import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WaveBackground from './WaveBackground';
import './LandingPage.css';
import { Blend, Mail, ArrowRight, Activity } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    const hasAccess = localStorage.getItem('beta_access');
    if (hasAccess === 'granted') {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full overflow-auto">
      {/* Wave Background */}
      <WaveBackground />

      {/* Centered Content - Updated to center vertically */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-8">
        <div className="max-w-2xl w-full px-4 md:px-6">
          <div className="text-center mb-8 fade-in">
              <h1 className="bg-[#f9fafb]/80 backdrop-blur-sm text-4xl md:text-5xl font-bold mb-3 tracking-tight text-neutral-800 w-fit mx-auto flex items-center">
            <Blend className="mr-2 text-primary-400" size={48} />
              Thesis
            </h1>
              <p className="bg-[#f9fafb]/80 backdrop-blur-sm text-2xl text-neutral-600 w-fit mx-auto">
                Financial intelligence at the speed of information
              </p>
          </div>
          <div className ='flex flex-row gap-4 justify-center mx-auto'>
            <button 
                onClick={() => navigate('/email-signup')}
                className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md transition-colors duration-300"
              >
                <Mail className="mr-2" size={20} />
                Waitlist
                <ArrowRight className="ml-2" size={20} />
              </button>
              <button 
                onClick={() => navigate('/beta-access')}
                className="flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white py-3 px-6 rounded-md transition-colors duration-300"
              >
                <Activity className="mr-2" size={20} />
                Beta
                <ArrowRight className="ml-2" size={20} />
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
