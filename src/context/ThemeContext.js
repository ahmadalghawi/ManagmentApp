'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [themeColor, setThemeColor] = useState('blue');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Try to restore theme from local storage
    const savedTheme = localStorage.getItem('theme');
    const savedColor = localStorage.getItem('themeColor') || 'blue';
    
    // Set Color
    setThemeColor(savedColor);
    document.documentElement.setAttribute('data-color', savedColor);

    // Set Theme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (mediaQuery.matches) {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const changeThemeColor = (color) => {
    setThemeColor(color);
    localStorage.setItem('themeColor', color);
    document.documentElement.setAttribute('data-color', color);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, themeColor, changeThemeColor }}>
      <div style={{ visibility: !mounted ? 'hidden' : 'visible', display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
