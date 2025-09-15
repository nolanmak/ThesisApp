import React, { createContext, useContext, useMemo, useRef, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
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

let currentTheme: Theme = 'system';
let isInitialized = false;

const getEffectiveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
};

const initializeTheme = (): Theme => {
  if (isInitialized) return currentTheme;

  if (typeof window === 'undefined') return 'system';

  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      currentTheme = stored;
    } else {
      currentTheme = 'system';
    }

    // Apply immediately
    const effectiveTheme = getEffectiveTheme(currentTheme);
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    isInitialized = true;
    return currentTheme;
  } catch {
    return 'system';
  }
};

const applyThemeChange = (theme: Theme) => {
  currentTheme = theme;
  if (typeof document !== 'undefined') {
    const effectiveTheme = getEffectiveTheme(theme);
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
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

  initializeTheme();

  // Listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (currentTheme === 'system') {
        const effectiveTheme = getEffectiveTheme('system');
        document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
        forceUpdate.current();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const contextValue = useMemo(() => ({
    theme: currentTheme,
    toggleTheme: () => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyThemeChange(newTheme);
      forceUpdate.current();
    },
    setTheme: (theme: Theme) => {
      applyThemeChange(theme);
      forceUpdate.current();
    }
  }), [currentTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};