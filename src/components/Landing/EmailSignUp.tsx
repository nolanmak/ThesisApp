import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WaveBackground from './WaveBackground';
import { ArrowLeft } from 'lucide-react';
import { submitWaitlistEmail } from '../../services/api';

const EmailSignUp: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    
    try {
      const result = await submitWaitlistEmail(email);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to join waitlist');
      }
      
      setSubmitStatus('success');
      setEmail('');
    } catch (error) {
      console.error('Waitlist submission error:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to join waitlist');
    } finally {
      setIsSubmitting(false);
    }
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
              Join Waitlist
            </h1>
          </div>
          
          {/* Beta Access Form */}
          <div className="p-6 max-w-md mx-auto">
            {submitStatus === 'success' ? (
              <div className="text-center p-4 bg-green-50 border border-green-100 rounded-md">
                <p className="text-green-700">Thank you for joining, we will reach out soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="flex items-center">
                  <input
                    id="waitlist-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-3 py-[10px] border border-neutral-200 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/90 text-sm"
                    placeholder="Enter your email"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="bg-blue-600 text-white py-[10px] px-3 rounded-r-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-neutral-500 transition-colors duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Join Waitlist"
                  >
                    {isSubmitting ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
                {submitStatus === 'error' && (
                  <p className="mt-2 text-red-600 text-sm">{errorMessage}</p>
                )}
              </form>
            )}
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

export default EmailSignUp;