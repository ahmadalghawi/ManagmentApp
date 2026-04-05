'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { LayoutDashboard, Wallet, Send, Users, FileText, Sun, Moon, Globe, Menu, X, Coins, Palette, BookOpen, Clock, Settings } from 'lucide-react';
import Modal from '@/components/Modal';

export default function Sidebar() {
  const pathname = usePathname();
  const { t, lang, toggleLang } = useLanguage();
  const { theme, toggleTheme, themeColor, changeThemeColor } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const navItems = [
    { href: '/', icon: <LayoutDashboard size={20} />, label: t('dashboard') },
    { href: '/income', icon: <Wallet size={20} />, label: t('incomeSources') },
    { href: '/withdrawals', icon: <Send size={20} />, label: t('withdrawals') },
    { href: '/ledger', icon: <BookOpen size={20} />, label: t('ledger') },
    { href: '/timelog', icon: <Clock size={20} />, label: t('timeLog') },
    { href: '/savings', icon: <FileText size={20} />, label: t('savingsGoals') },
    { href: '/contacts', icon: <Users size={20} />, label: t('contacts') },
    { href: '/reports', icon: <FileText size={20} />, label: t('reports') },
    { href: '/settings', icon: <Settings size={20} />, label: t('settings') || 'Settings' },
  ];

  const colors = [
    { id: 'blue', color: '#0ea5e9' },
    { id: 'violet', color: '#8b5cf6' },
    { id: 'emerald', color: '#10b981' },
    { id: 'rose', color: '#f43f5e' },
    { id: 'amber', color: '#f59e0b' },
  ];

  return (
    <>
      <button
        className="mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/icon.png" alt="MeM Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
          </div>
          <span className="sidebar-title">MeM</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <button className="lang-toggle" style={{ flex: 1, padding: '8px' }} onClick={toggleTheme} title={t('theme')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} {t('theme')}
            </button>
            <button className="lang-toggle" style={{ flex: 1, padding: '8px' }} onClick={toggleLang} title={t('language')}>
              <Globe size={18} /> {t('language')}
            </button>
          </div>
          <Link href="/settings" className="lang-toggle" style={{ justifyContent: 'center' }}>
            <Settings size={18} /> <span>{t('settings')}</span>
          </Link>
        </div>
      </aside>

      <Modal isOpen={showPalette} onClose={() => setShowPalette(false)} title="Select Theme Color">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', marginBottom: '16px' }}>
          {colors.map((c) => (
            <button
              key={c.id}
              onClick={() => changeThemeColor(c.id)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: c.color,
                border: themeColor === c.id ? `4px solid var(--text-primary)` : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
                boxShadow: themeColor === c.id ? '0 0 10px rgba(0,0,0,0.3)' : 'none'
              }}
              title={c.id}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
          <button className="btn btn-secondary" onClick={() => setShowPalette(false)}>Close</button>
        </div>
      </Modal>
    </>
  );
}
