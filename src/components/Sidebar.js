'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { LayoutDashboard, Wallet, Send, Users, FileText, Sun, Moon, Globe, Menu, X, Coins, Palette, BookOpen, Clock, Settings, Folder, Plus, Check, Edit2, Trash2, ChevronDown, Check as CheckIcon, X as XIcon, Camera } from 'lucide-react';
import Modal from '@/components/Modal';
import { switchWorkspace, createWorkspace, updateWorkspace, deleteWorkspace } from '@/lib/actions';

export default function Sidebar({ workspaceState }) {
  const pathname = usePathname();
  const { t, lang, toggleLang } = useLanguage();
  const { theme, toggleTheme, themeColor, changeThemeColor } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editingHeaderName, setEditingHeaderName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const fileInputRef = useRef(null);

  // Fallbacks if layout.js hasn't passed it yet
  const activeProfileId = workspaceState?.activeProfile || 'default';
  const profilesList = Array.isArray(workspaceState?.profiles) ? workspaceState.profiles : [];
  const activeProfile = profilesList.find(p => p.id === activeProfileId) || { name: 'MeM', color: '#0ea5e9', id: 'default' };

  const handleAvatarUpload = async (e, profileId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      await updateWorkspace(profileId, { profilePic: base64 });
    };
    reader.readAsDataURL(file);
  };


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

      <aside className={`sidebar ${mobileOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <button
          className="collapse-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronDown size={18} style={{ transform: isCollapsed ? (lang === 'ar' ? 'rotate(90deg)' : 'rotate(-90deg)') : (lang === 'ar' ? 'rotate(-90deg)' : 'rotate(90deg)') }} />
        </button>
        <div
          onClick={() => {
            if (!isEditingHeader) setShowWorkspaceModal(true);
          }}
          style={{
            cursor: isEditingHeader ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: isCollapsed ? '12px 0' : '12px 14px',
            margin: isCollapsed ? '14px 10px' : '14px',
            borderRadius: '14px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden'
          }}
          className="sidebar-header workspace-trigger"
          title="Switch Workspace"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', position: 'relative', zIndex: 2, flex: 1, justifyContent: 'center' }}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current.click();
                fileInputRef.current.onchange = (ev) => handleAvatarUpload(ev, activeProfile.id);
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: activeProfile.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '900',
                fontSize: '16px',
                flexShrink: 0,
                boxShadow: `0 4px 12px ${activeProfile.color}44`,
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.1)'
              }}
              className="avatar-editable"
              title="Change Profile Picture"
            >
              {activeProfile.profilePic ? (
                <img src={activeProfile.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                activeProfile.name.charAt(0).toUpperCase()
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                <Camera size={16} />
              </div>
            </div>

            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                {isEditingHeader ? (
                  <input
                    autoFocus
                    className="form-input"
                    value={editingHeaderName}
                    onChange={(e) => setEditingHeaderName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ padding: '2px 6px', fontSize: '0.85rem', lineHeight: 1.2, width: '100%' }}
                    onKeyDown={async (e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        if (editingHeaderName.trim()) {
                          await updateWorkspace(activeProfile.id, { name: editingHeaderName.trim() });
                        }
                        setIsEditingHeader(false);
                      } else if (e.key === 'Escape') {
                        setIsEditingHeader(false);
                      }
                    }}
                    onBlur={async () => {
                      if (editingHeaderName.trim() && editingHeaderName !== activeProfile.name) {
                        await updateWorkspace(activeProfile.id, { name: editingHeaderName.trim() });
                      }
                      setIsEditingHeader(false);
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: 'var(--text-heading)',
                      fontSize: '0.88rem',
                      fontWeight: '800',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.2,
                      cursor: 'text'
                    }}
                    title="Double click to edit Name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingHeaderName(activeProfile.name);
                      setIsEditingHeader(true);
                    }}
                  >
                    {activeProfile.name}
                  </span>
                )}
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em', display: isEditingHeader ? 'none' : 'block' }}>
                  {t('workspace') || 'WORKSPACE'}
                </span>
              </div>
            )}
          </div>
          {!isEditingHeader && !isCollapsed && <ChevronDown size={14} className="text-muted" style={{ position: 'relative', zIndex: 2 }} />}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname === item.href ? 'active' : ''} ${isCollapsed ? 'collapsed-link' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ padding: isCollapsed ? 'var(--space-md) 0' : 'var(--space-md) var(--space-lg)' }}>
          <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', gap: 'var(--space-xs)', alignItems: 'center' }}>
            <button className="lang-toggle" style={{ flex: isCollapsed ? 'none' : 1, padding: '8px', width: isCollapsed ? '40px' : 'auto', justifyContent: 'center' }} onClick={toggleTheme} title={t('theme')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} {!isCollapsed && t('theme')}
            </button>
            <button className="lang-toggle" style={{ flex: isCollapsed ? 'none' : 1, padding: '8px', width: isCollapsed ? '40px' : 'auto', justifyContent: 'center' }} onClick={toggleLang} title={t('language')}>
              <Globe size={18} /> {!isCollapsed && t('language')}
            </button>
          </div>
          <Link href="/settings" className="lang-toggle" style={{ justifyContent: 'center', padding: '8px', width: isCollapsed ? '40px' : 'auto', margin: isCollapsed ? '0 auto' : '0' }} title={t('settings')}>
            <Settings size={18} /> {!isCollapsed && <span>{t('settings')}</span>}
          </Link>
        </div>
      </aside>

      <Modal isOpen={showWorkspaceModal} onClose={() => { setShowWorkspaceModal(false); setEditingId(null); setIsCreating(false); }} title="Manage Workspaces">
        <div style={{ marginBottom: '24px' }}>
          <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '16px' }}>Select or edit workspace settings. Custom photos help distinguish between profiles.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {profilesList.map(profile => (
              <div
                key={profile.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '16px',
                  background: activeProfileId === profile.id ? 'var(--accent-primary-soft)' : 'var(--bg-secondary)',
                  border: `1px solid ${activeProfileId === profile.id ? 'var(--accent-primary)' : (editingId === profile.id ? 'var(--accent-primary)' : 'var(--border-color)')}`,
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                  <div
                    onClick={() => {
                      if (editingId === profile.id) {
                        fileInputRef.current.click();
                        fileInputRef.current.onchange = (e) => handleAvatarUpload(e, profile.id);
                      } else {
                        if (editingId) return;
                        switchWorkspace(profile.id);
                        setShowWorkspaceModal(false);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '12px',
                      background: profile.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '20px',
                      boxShadow: `0 6px 15px ${profile.color}33`,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    className={editingId === profile.id ? "avatar-editable" : ""}
                  >
                    {profile.profilePic ? (
                      <img src={profile.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      profile.name.charAt(0).toUpperCase()
                    )}
                    {editingId === profile.id && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={18} />
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" />
                </div>

                <div
                  onClick={() => {
                    if (editingId) return;
                    switchWorkspace(profile.id);
                    setShowWorkspaceModal(false);
                  }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', cursor: editingId ? 'default' : 'pointer' }}
                >
                  {editingId === profile.id ? (
                    <input
                      autoFocus
                      className="form-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ padding: '6px 10px', fontSize: '1rem', width: '100%', borderRadius: '8px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editingName.trim()) {
                            updateWorkspace(profile.id, { name: editingName.trim() });
                            setEditingId(null);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {profile.name}
                        {activeProfileId === profile.id && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }}></div>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {profile.id === 'default' ? 'Default Space' : 'Personal Workspace'}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px', marginLeft: '4px' }}>
                  {editingId === profile.id ? (
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (editingName.trim()) {
                            await updateWorkspace(profile.id, { name: editingName.trim() });
                            setEditingId(null);
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-emerald)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
                        title="Save"
                      >
                        <CheckIcon size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
                        title="Cancel"
                      >
                        <XIcon size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(profile.id);
                          setEditingName(profile.name);
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
                        title="Edit Name"
                        className="hover-accent"
                      >
                        <Edit2 size={16} />
                      </button>
                      {profile.id !== 'default' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete "${profile.name}"? All data in this workspace will be inaccessible.`)) {
                              await deleteWorkspace(profile.id);
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', opacity: 0.6, cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
                          title="Delete Workspace"
                          className="hover-red-soft"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          {isCreating ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                autoFocus
                className="form-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New workspace name..."
                style={{ flex: 1 }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newName.trim()) {
                    const colors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', '#ec4899', '#6366f1'];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    await createWorkspace({ name: newName.trim(), color });
                    setNewName('');
                    setIsCreating(false);
                    setShowWorkspaceModal(false);
                  } else if (e.key === 'Escape') {
                    setIsCreating(false);
                  }
                }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  if (newName.trim()) {
                    const colors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', '#ec4899', '#6366f1'];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    await createWorkspace({ name: newName.trim(), color });
                    setNewName('');
                    setIsCreating(false);
                    setShowWorkspaceModal(false);
                  }
                }}
              >
                Create
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ width: '100%', borderRadius: '12px', padding: '12px', fontWeight: '700', fontSize: '0.9rem' }}
              onClick={() => setIsCreating(true)}
            >
              <Plus size={18} /> Create Workspace
            </button>
          )}
        </div>
      </Modal>


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
