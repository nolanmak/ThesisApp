import React from 'react';
import { Moon, Sun, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isLoading } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      disabled={isLoading}
      className="flex items-center justify-center p-2 rounded-md transition-colors duration-200 ease-in-out text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={isLoading ? 'Loading theme' : `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {isLoading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : theme === 'light' ? (
        <Moon size={18} />
      ) : (
        <Sun size={18} />
      )}
    </button>
  );
};

export default ThemeToggle;