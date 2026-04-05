'use client';

import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Settings, Moon, Sun, Globe, Palette, Database, Info, RefreshCw, Save, HardDrive } from 'lucide-react';
import Toast from '@/components/Toast';
import { updateSetting } from '@/lib/actions';

export default function SettingsClient({ initialSettings, contacts }) {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme, themeColor, changeThemeColor } = useTheme();
  
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  const colors = [
    { id: 'blue', color: '#0ea5e9' },
    { id: 'violet', color: '#8b5cf6' },
    { id: 'emerald', color: '#10b981' },
    { id: 'rose', color: '#f43f5e' },
    { id: 'amber', color: '#f59e0b' },
  ];

  const handleSave = () => {
    setToast({ message: t('success'), type: 'success' });
  };

  return (
    <div className="animate-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Settings size={28} className="text-accent" />
          {t('settings')}
        </h1>
        <p className="page-subtitle">{t('settingsSubtitle')}</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
        {/* Sidebar Tabs (Sub-menu) */}
        <div className="card" style={{ width: '220px', padding: 'var(--space-sm)', flexShrink: 0, height: 'fit-content' }}>
          <button 
            className={`nav-link ${activeTab === 'general' ? 'active' : ''}`} 
            onClick={() => setActiveTab('general')}
            style={{ width: '100%', marginBottom: '4px' }}
          >
            <Settings size={18} /> {t('general')}
          </button>
          <button 
            className={`nav-link ${activeTab === 'appearance' ? 'active' : ''}`} 
            onClick={() => setActiveTab('appearance')}
            style={{ width: '100%', marginBottom: '4px' }}
          >
            <Palette size={18} /> {t('appearance')}
          </button>
          <button 
            className={`nav-link ${activeTab === 'database' ? 'active' : ''}`} 
            onClick={() => setActiveTab('database')}
            style={{ width: '100%', marginBottom: '4px' }}
          >
            <Database size={18} /> {t('database')}
          </button>
          <button 
            className={`nav-link ${activeTab === 'about' ? 'active' : ''}`} 
            onClick={() => setActiveTab('about')}
            style={{ width: '100%', marginBottom: '4px' }}
          >
            <Info size={18} /> {t('about')}
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          
          {activeTab === 'general' && (
            <div className="card animate-in">
              <h3 className="section-title flex items-center gap-2 mb-lg">
                <Info size={18} className="text-secondary" />
                {t('appIdentity')}
              </h3>
              
              <div className="form-group">
                <label className="form-label">{t('appDisplayName')}</label>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <input 
                    className="form-input" 
                    defaultValue={initialSettings.appName} 
                    onBlur={async (e) => {
                      if (e.target.value) {
                         await updateSetting('custom-app-name', e.target.value);
                         setToast({ message: t('restartRequired'), type: 'info' });
                      }
                    }}
                    placeholder={t('appName')}
                  />
                  <button className="btn btn-secondary">{t('edit')}</button>
                </div>
              </div>

              <hr className="divider" />

              <h3 className="section-title flex items-center gap-2 mb-lg">
                <Globe size={18} className="text-blue" />
                {t('preferredLanguage')}
              </h3>
              
              <div className="form-group">
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                   <button 
                    className={`btn ${lang === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setLang('en')}
                   >
                     English (US)
                   </button>
                   <button 
                    className={`btn ${lang === 'ar' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setLang('ar')}
                   >
                     العربية (Arabic)
                   </button>
                </div>
              </div>

              <hr className="divider" />

              <h3 className="section-title flex items-center gap-2 mb-lg">
                <RefreshCw size={18} className="text-emerald" />
                {t('persistence') || 'Persistence'}
              </h3>
              <p className="text-secondary mb-md">
                {t('persistenceInfo')}
              </p>
              
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={16} /> {t('forceSync')}
              </button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="card animate-in">
              <h3 className="section-title flex items-center gap-2 mb-lg">
                <Palette size={18} className="text-accent" />
                {t('visualTheme')}
              </h3>

              <div className="form-group">
                <label className="form-label">{t('colorMode')}</label>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                   <button 
                    className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => theme === 'light' && toggleTheme()}
                   >
                     <Moon size={16} /> {t('dark')}
                   </button>
                   <button 
                    className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => theme === 'dark' && toggleTheme()}
                   >
                     <Sun size={16} /> {t('light')}
                   </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('primaryColor')}</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => changeThemeColor(c.id)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: c.color,
                        border: themeColor === c.id ? `3px solid var(--text-primary)` : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: themeColor === c.id ? '0 0 8px rgba(0,0,0,0.2)' : 'none'
                      }}
                      title={c.id}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="card animate-in">
              <h3 className="section-title flex items-center gap-2 mb-lg">
                <Database size={18} className="text-amber" />
                {t('storageManagement')}
              </h3>
              
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-3 mb-md">
                   <HardDrive size={24} className="text-muted" />
                   <div>
                     <div style={{ fontWeight: 700 }}>{t('databaseFile')}</div>
                     <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>income.db · {contacts.length} {t('contacts')}</div>
                   </div>
                </div>
                <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-md)' }}>
                   {t('storageLocation')}
                   <br/>
                   <code>%APPDATA%/income-manager/data/</code>
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => window.alert('To backup: Just copy income.db to a cloud folder.')}>
                    {t('backupGuide')}
                  </button>
                </div>
              </div>
              
              <div style={{ marginTop: 'var(--space-xl)', border: '1px solid rgba(220, 38, 38, 0.2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'rgba(220, 38, 38, 0.05)' }}>
                <h4 style={{ color: 'var(--accent-red)', margin: 0 }}>{t('dangerZone')}</h4>
                <p className="text-xs text-muted" style={{ margin: '8px 0' }}>These actions cannot be undone.</p>
                <button className="btn" style={{ background: 'transparent', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', padding: '6px 12px', fontSize: 'var(--font-size-xs)' }} onClick={() => window.alert('Please contact admin to wipe all data.')}>
                   {t('resetApp')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="card animate-in">
               <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
                 <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'var(--gradient-primary)', margin: '0 auto var(--space-lg) auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '2rem' }}>MeM</div>
                 <h2 style={{ margin: 0 }}>MeM</h2>
                 <p className="text-muted">Manage Me · v1.5.0</p>
                 <div style={{ marginTop: 'var(--space-lg)', display: 'inline-flex', padding: '4px 12px', background: 'var(--accent-primary-soft)', borderRadius: 'var(--radius-full)', color: 'var(--accent-primary)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                    {t('desktopEdition')} ({t('stableVersion')})
                 </div>
               </div>
               <p className="text-center text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {t('aboutDescription')}
               </p>
            </div>
          )}

        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
