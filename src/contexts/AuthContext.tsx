import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'react-toastify';
import { cognitoAuth, AuthUser } from '../lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
  isAuthenticated: boolean;
  removeAuthTokens: () => void;
  checkAuthStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isExchangingTokenRef = useRef(false);
  const sessionCheckIntervalRef = useRef<number | null>(null);

  const startSessionMonitoring = () => {
    // Clear any existing interval
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
    }
    
    // Check session every 15 minutes
    sessionCheckIntervalRef.current = window.setInterval(() => {
      checkAuthStatus();
    }, 15 * 60 * 1000);
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    const storedIdToken = localStorage.getItem('id_token');
    
    if (!storedIdToken) {
      return false;
    }
    
    try {
      const tokenPayload = cognitoAuth.parseJWT(storedIdToken);
      const isExpired = (tokenPayload.exp as number) * 1000 <= Date.now();
      
      if (isExpired) {
        console.warn('Token has expired, logging out user');
        toast.info('Your session has expired. Please sign in again.', {
          autoClose: 5000,
          hideProgressBar: false,
        });
        removeAuthTokens();
        window.location.href = '/';
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking auth status:', error);
      toast.error('There was an issue with your session. Please sign in again.', {
        autoClose: 5000,
        hideProgressBar: false,
      });
      removeAuthTokens();
      window.location.href = '/';
      return false;
    }
  };

  const removeAuthTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    setUser(null);
    
    // Clear session check interval when tokens are removed
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code && !isExchangingTokenRef.current) {
          isExchangingTokenRef.current = true;
          const redirectUri = window.location.origin + '/';
          
          // Clear the URL immediately to prevent duplicate exchanges
          window.history.replaceState({}, document.title, window.location.pathname);
          
          try {
            const tokens = await cognitoAuth.exchangeCodeForTokens(code, redirectUri);
            const userData = cognitoAuth.getUserFromIdToken(tokens.id_token as string);
            
            localStorage.setItem('access_token', tokens.access_token as string);
            localStorage.setItem('id_token', tokens.id_token as string);
            localStorage.setItem('refresh_token', tokens.refresh_token as string);
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            setUser(userData);
            startSessionMonitoring();
            
            // Immediately redirect to dashboard after successful authentication
            window.location.href = '/dashboard';
          } catch (error) {
            console.error('Error exchanging code for tokens:', error);
          } finally {
            isExchangingTokenRef.current = false;
          }
        } else {
          // console.debug('no code');
          const storedUserData = localStorage.getItem('user_data');
          const storedIdToken = localStorage.getItem('id_token');
          
          if (storedUserData && storedIdToken) {
            try {
              const userData = JSON.parse(storedUserData);
              const tokenPayload = cognitoAuth.parseJWT(storedIdToken);
              
              if ((tokenPayload.exp as number) * 1000 > Date.now()) {
                setUser(userData);
                startSessionMonitoring();
              } else {
                removeAuthTokens();
              }
            } catch (error) {
              console.error('Error parsing stored user data:', error);
              removeAuthTokens();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Cleanup interval on unmount
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, []);

  const signIn = () => {
    const redirectUri = window.location.origin + '/';
    const signInUrl = cognitoAuth.getSignInUrl(redirectUri);
    console.log('Redirect URI:', redirectUri);
    console.log('Sign In URL:', signInUrl);
    window.location.href = signInUrl;
  };

  const signOut = () => {
    removeAuthTokens();
    toast.success('You have been signed out successfully.', {
      autoClose: 3000,
      hideProgressBar: false,
    });
    
    // Redirect to landing page after sign out
    window.location.href = '/';
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signOut,
    isAuthenticated: !!user,
    removeAuthTokens,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
