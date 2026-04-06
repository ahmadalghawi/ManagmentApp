'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { updateSetting } from '@/lib/actions';


const ThemeContext = createContext();

export function ThemeProvider({ children, initialTheme = 'dark', initialColor = 'blue' }) {
  const [theme, setTheme] = useState(initialTheme);
  const [themeColor, setThemeColor] = useState(initialColor);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Sync localStorage with DB-provided values
    localStorage.setItem('theme', initialTheme);
    localStorage.setItem('themeColor', initialColor);
    document.documentElement.setAttribute('data-theme', initialTheme);
    document.documentElement.setAttribute('data-color', initialColor);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    // Sync to DB
    updateSetting('theme', newTheme);
  };

  const changeThemeColor = (color) => {
    setThemeColor(color);
    localStorage.setItem('themeColor', color);
    document.documentElement.setAttribute('data-color', color);
    // Sync to DB
    updateSetting('themeColor', color);
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
