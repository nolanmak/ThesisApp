import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WaveBackground from './WaveBackground';
import GoogleSignInButton from './GoogleSignInButton';
import EmailAuthModal from './EmailAuthModal';
import EmailConfirmation from './EmailConfirmation';
import { cognitoAuth } from '../../lib/auth';
import { toast } from 'react-toastify';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

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

  const handleEmailSignUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await cognitoAuth.signUpWithEmail(email, password);
      setPendingEmail(email);
      setIsEmailModalOpen(false);
      setIsConfirmationModalOpen(true);
      toast.success('Account created! Please check your email for the verification code.');
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      const message = error instanceof Error ? error.message : '';
      const errorMessage = message.includes('UsernameExistsException') 
        ? 'An account with this email already exists. Please try signing in instead.'
        : message || 'Failed to create account. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const tokens = await cognitoAuth.signInWithEmail(email, password);
      
      localStorage.setItem('access_token', tokens.accessToken);
      localStorage.setItem('id_token', tokens.idToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
      
      const userData = cognitoAuth.getUserFromIdToken(tokens.idToken);
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      setIsEmailModalOpen(false);
      toast.success('Successfully signed in!');
      window.location.href = '/dashboard';
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      const message = error instanceof Error ? error.message : '';
      const errorMessage = message.includes('UserNotConfirmedException')
        ? 'Please verify your email address first. Check your inbox for the verification code.'
        : message.includes('NotAuthorizedException')
        ? 'Invalid email or password. Please try again.'
        : message || 'Failed to sign in. Please try again.';
      toast.error(errorMessage);
      
      if (message.includes('UserNotConfirmedException')) {
        setPendingEmail(email);
        setIsEmailModalOpen(false);
        setIsConfirmationModalOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailConfirmation = async (code: string) => {
    setIsLoading(true);
    try {
      await cognitoAuth.confirmSignUp(pendingEmail, code);
      setIsConfirmationModalOpen(false);
      toast.success('Email verified successfully! You can now sign in.');
      setIsEmailModalOpen(true);
    } catch (error: unknown) {
      console.error('Confirmation error:', error);
      const message = error instanceof Error ? error.message : '';
      const errorMessage = message.includes('CodeMismatchException')
        ? 'Invalid verification code. Please try again.'
        : message.includes('ExpiredCodeException')
        ? 'Verification code has expired. Please request a new one.'
        : message || 'Failed to verify email. Please try again.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmationCode = async () => {
    try {
      await cognitoAuth.resendConfirmationCode(pendingEmail);
      toast.success('Verification code sent! Please check your email.');
    } catch (error: unknown) {
      console.error('Resend error:', error);
      const message = error instanceof Error ? error.message : '';
      const errorMessage = message || 'Failed to resend verification code. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await cognitoAuth.forgotPassword(email);
      setIsEmailModalOpen(false);
      toast.success('Password reset code sent! Please check your email.');
      // Navigate to password reset page with email pre-filled
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error: unknown) {
      console.error('Forgot password error:', error);
      const message = error instanceof Error ? error.message : '';
      const errorMessage = message.includes('UserNotFoundException')
        ? 'No account found with this email address.'
        : message || 'Failed to send password reset email. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-neutral-50 dark:bg-neutral-900">
      {/* Wave Background */}
      <WaveBackground />

      {/* Centered Content - Updated to center vertically */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-8">
        <div className="max-w-2xl w-full px-4 md:px-6" style={{ maxWidth: '100%' }}>
          <div className="text-center mb-12 fade-in">
              <h1 
                className="bg-neutral-50/80 dark:bg-neutral-800/80 backdrop-blur-sm font-bold mb-4 tracking-tight text-neutral-800 dark:text-neutral-100 w-fit mx-auto flex items-center"
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
                EarningsOwl
              </h1>
              <p 
                className="bg-neutral-50/80 dark:bg-neutral-800/80 backdrop-blur-sm text-neutral-600 dark:text-neutral-300 w-fit mx-auto"
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
            <div style={{ width: isMobile ? '100%' : '14rem' }}>
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="w-full flex items-center justify-center px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 text-neutral-900 dark:text-neutral-100"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Sign in with Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Authentication Modal */}
      <EmailAuthModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSignUp={handleEmailSignUp}
        onSignIn={handleEmailSignIn}
        onForgotPassword={handleForgotPassword}
        isLoading={isLoading}
      />

      {/* Email Confirmation Modal */}
      <EmailConfirmation
        isOpen={isConfirmationModalOpen}
        email={pendingEmail}
        onClose={() => setIsConfirmationModalOpen(false)}
        onConfirm={handleEmailConfirmation}
        onResendCode={handleResendConfirmationCode}
        isLoading={isLoading}
      />
    </div>
  );
};

export default LandingPage;
