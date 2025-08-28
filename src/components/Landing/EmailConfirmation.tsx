import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, RotateCcw } from 'lucide-react';

interface EmailConfirmationProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onConfirm: (code: string) => Promise<void>;
  onResendCode: () => Promise<void>;
  isLoading: boolean;
}

const EmailConfirmation: React.FC<EmailConfirmationProps> = ({
  isOpen,
  email,
  onClose,
  onConfirm,
  onResendCode,
  isLoading
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCode(['', '', '', '', '', '']);
      setError('');
      setCanResend(false);
      setCountdown(60);
      
      // Focus first input when modal opens
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!canResend && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow numbers
    
    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only keep last character
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length > 0) {
      const newCode = ['', '', '', '', '', ''];
      for (let i = 0; i < Math.min(pastedData.length, 6); i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);
      setError('');
      
      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
      
      // Auto-submit if code is complete
      if (pastedData.length === 6) {
        handleSubmit(pastedData);
      }
    }
  };

  const handleSubmit = async (codeValue?: string) => {
    const submitCode = codeValue || code.join('');
    
    if (submitCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    try {
      await onConfirm(submitCode);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid verification code. Please try again.';
      setError(errorMessage);
      // Clear the code inputs on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    
    try {
      await onResendCode();
      setCanResend(false);
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      setError('');
      inputRefs.current[0]?.focus();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend code. Please try again.';
      setError(errorMessage);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-lg shadow-xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-neutral-800">
              Verify Your Email
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          {/* Email Icon and Description */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-neutral-600 text-sm">
              We've sent a 6-digit verification code to
            </p>
            <p className="font-medium text-neutral-800 text-sm">
              {email}
            </p>
          </div>

          {/* Code Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-3 text-center">
              Enter verification code
            </label>
            <div className="flex gap-2 justify-center">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-12 h-12 text-center text-lg font-bold border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    error ? 'border-red-500' : 'border-neutral-300'
                  }`}
                />
              ))}
            </div>
            {error && (
              <p className="text-red-500 text-xs text-center mt-2">{error}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleSubmit()}
            disabled={isLoading || code.join('').length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>

          {/* Resend Code */}
          <div className="text-center">
            <p className="text-sm text-neutral-600 mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendCode}
              disabled={!canResend || isLoading}
              className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                canResend && !isLoading
                  ? 'text-blue-600 hover:text-blue-700'
                  : 'text-neutral-400 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              {canResend ? 'Resend Code' : `Resend in ${countdown}s`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;