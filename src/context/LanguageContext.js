'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import translations from '@/lib/translations';
import { updateSetting } from '@/lib/actions';


const LanguageContext = createContext();

export function LanguageProvider({ children, initialLang = 'en' }) {
  const [lang, setLang] = useState(initialLang);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Sync localStorage with DB-provided value
    localStorage.setItem('app-lang', initialLang);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('app-lang', lang);
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      // Sync to DB
      updateSetting('app-lang', lang);
    }
  }, [lang, mounted]);

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  const toggleLang = () => {
    setLang(prev => prev === 'en' ? 'ar' : 'en');
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, dir, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
