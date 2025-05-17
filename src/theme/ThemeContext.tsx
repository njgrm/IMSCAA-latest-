import React, { createContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
interface ThemeContextType {
  theme: ThemePreference;
  isDark: boolean;
  setTheme: (t: ThemePreference) => void;
}
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  isDark: false,
  setTheme: () => {},
});

// ① Define a Props type that includes children
interface ThemeProviderProps {
  children: React.ReactNode;
}


export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    return (localStorage.getItem('theme') as ThemePreference) || 'system';
  });
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (theme === 'light') return false;
    if (theme === 'dark') return true;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });

  // apply <html> class whenever isDark flips
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDark]);

  // persist user choice
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // if user picked “system”, listen for real-time changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // whenever theme changes from “light”/“dark”/“system”, recalc isDark
  useEffect(() => {
    if (theme === 'light') setIsDark(false);
    else if (theme === 'dark') setIsDark(true);
    else setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};