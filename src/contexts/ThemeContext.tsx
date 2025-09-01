import React, { createContext, useContext, useMemo, useRef } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

let currentTheme: Theme = 'light';
let isInitialized = false;

const initializeTheme = (): Theme => {
  if (isInitialized) return currentTheme;
  
  if (typeof window === 'undefined') return 'light';
  
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      currentTheme = stored;
    } else {
      currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Apply immediately
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    isInitialized = true;
    return currentTheme;
  } catch {
    return 'light';
  }
};

const applyThemeChange = (theme: Theme) => {
  currentTheme = theme;
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Ignore storage errors
    }
  }
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const forceUpdate = useRef(() => {});
  const [, updateState] = React.useState({});
  forceUpdate.current = () => updateState({});
  
  const theme = initializeTheme();

  const contextValue = useMemo(() => ({
    theme: currentTheme,
    toggleTheme: () => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyThemeChange(newTheme);
      forceUpdate.current();
    }
  }), [currentTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};