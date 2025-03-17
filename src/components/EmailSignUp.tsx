import React from 'react';
import { useNavigate } from 'react-router-dom';
import WaveBackground from './WaveBackground';
import { ArrowLeft } from 'lucide-react';

const EmailSignUp: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full overflow-auto">
      {/* Wave Background */}
      <WaveBackground />

      {/* Centered Content - Updated to center vertically */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-8">
        <div className="max-w-xl w-full px-4 md:px-6">
          <button 
            onClick={() => navigate('/')}
            className="mb-6 flex items-center text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Home
          </button>
          
          <div className="text-center mb-8 fade-in">
            <h1 className="bg-[#f9fafb]/80 backdrop-blur-sm text-4xl font-bold mb-3 tracking-tight text-neutral-800 w-fit mx-auto">
              Join Our Waitlist
            </h1>
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
        </div>
      </div>
    </div>
  );
};

export default EmailSignUp;