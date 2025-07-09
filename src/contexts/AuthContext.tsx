import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { cognitoAuth, AuthUser } from '../lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
  isAuthenticated: boolean;
  removeAuthTokens: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isExchangingTokenRef = useRef(false);

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
  }, []);

  const removeAuthTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  const signIn = () => {
    const redirectUri = window.location.origin + '/';
    const signInUrl = cognitoAuth.getSignInUrl(redirectUri);
    console.log('Redirect URI:', redirectUri);
    console.log('Sign In URL:', signInUrl);
    window.location.href = signInUrl;
  };

  const signOut = () => {
    removeAuthTokens();
    
    // Redirect to landing page after sign out
    window.location.href = '/';
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signOut,
    isAuthenticated: !!user,
    removeAuthTokens
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
