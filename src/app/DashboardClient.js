'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { 
  Wallet, 
  Send, 
  Landmark, 
  BarChart3, 
  PlusCircle, 
  ArrowRightLeft, 
  UserPlus, 
  FileBox, 
  HandMetal,
  AlertCircle
} from 'lucide-react';

import FinancialCharts from '@/components/FinancialCharts';

function formatNumber(num) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

export default function DashboardClient({ data, activeProfile }) {
  const { t } = useLanguage();
  const profile = activeProfile || { name: 'MeM', color: '#0ea5e9' };
  
  const { 
    sources, 
    totalIncome, 
    totalWithdrawn, 
    totalRemaining, 
    totalGlobalValue,
    activeSourcesCount, 
    recentWithdrawals 
  } = data;

  // Check for missing withdrawal this month
  const currentMonthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());
  const hasWithdrawalThisMonth = recentWithdrawals.some(w => w.month_label === currentMonthLabel);
  const showAlarm = activeSourcesCount > 0 && !hasWithdrawalThisMonth;

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: profile.color, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontWeight: 'bold',
              fontSize: '18px',
              boxShadow: `0 8px 16px ${profile.color}33`,
              overflow: 'hidden',
              border: '2px solid var(--bg-secondary)'
            }}>
              {profile.profilePic ? (
                <img src={profile.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile.name.charAt(0).toUpperCase()
              )}
            </div>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem' }}>
              {t('welcomeBack') || 'Welcome back'}, <span className="text-gradient">{profile.name}</span>!
            </h1>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {profile.email ? `${profile.email} • ` : ''} {t('overview')}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
           <div className="badge badge-accent" style={{ padding: '8px 16px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              {currentMonthLabel.toUpperCase()}
           </div>
        </div>
      </div>

      {showAlarm && (
        <div className="alert-banner animate-in">
          <div className="alert-icon">
            <AlertCircle size={24} />
          </div>
          <div className="alert-content">
            <div className="alert-title">{t('actionPending')}</div>
            <div className="alert-text">{t('missingWithdrawal')}</div>
          </div>
          <Link href="/withdrawals" className="btn btn-primary btn-sm" style={{ background: 'white', color: 'var(--accent-red)', border: 'none' }}>
            {t('recordNow')}
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="card stat-card stagger-1 animate-in">
          <div className="card-icon cyan">
            <Wallet size={24} />
          </div>
          <div className="stat-info">
            <div className="card-title">{t('totalIncome')}</div>
            <div className="card-value">{formatNumber(totalIncome)}</div>
          </div>
        </div>

        <div className="card stat-card stagger-2 animate-in">
          <div className="card-icon purple">
            <Send size={24} />
          </div>
          <div className="stat-info">
            <div className="card-title">{t('totalWithdrawn')}</div>
            <div className="card-value">{formatNumber(totalWithdrawn)}</div>
          </div>
        </div>

        <div className="card stat-card stagger-3 animate-in">
          <div className="card-icon green">
            <Landmark size={24} />
          </div>
          <div className="stat-info">
            <div className="card-title">{t('totalRemaining')}</div>
            <div className="card-value">{formatNumber(totalRemaining)}</div>
          </div>
        </div>

        <div className="card stat-card stagger-4 animate-in" style={{ border: '1px solid var(--accent-primary)', background: 'var(--accent-primary-soft)' }}>
          <div className="card-icon blue">
            <BarChart3 size={24} />
          </div>
          <div className="stat-info">
            <div className="card-title">{t('netWorth')} (DKK)</div>
            <div className="card-value">{formatNumber(totalGlobalValue)}</div>
          </div>
        </div>
      </div>

      <FinancialCharts data={data} />

      <div className="grid-2 mt-lg">
        {/* Active Income Sources */}
        <div className="card animate-in stagger-2">
          <div className="card-header">
            <h2 className="card-title">{t('monthlyProgress')}</h2>
          </div>
          {sources.length === 0 ? (
            <div className="empty-state">
              <p className="empty-text">{t('noIncomeSources')}</p>
            </div>
          ) : (
            sources.map((source) => {
              const progress = source.total_amount > 0
                ? ((source.total_withdrawn / source.total_amount) * 100)
                : 0;
              const remaining = source.total_amount - source.total_withdrawn;
              const monthsUsed = source.withdrawal_count;
              const monthsLeft = source.total_months - monthsUsed;

              return (
                <div key={source.id} style={{ marginBottom: 'var(--space-lg)' }}>
                  <div className="flex-between">
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                        {source.contact_name}
                      </span>
                      <span className="text-muted" style={{ marginInlineStart: '8px', fontSize: 'var(--font-size-xs)' }}>
                        {source.currency} {formatNumber(source.total_amount)}
                      </span>
                    </div>
                    <span className="text-accent" style={{ fontWeight: 700 }}>
                      {formatNumber(remaining)} {t('remaining')}
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="progress-bar-labels">
                      <span>{monthsUsed} / {source.total_months} {t('months')}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Recent Activity */}
        <div className="card animate-in stagger-3">
          <div className="card-header">
            <h2 className="card-title">{t('recentActivity')}</h2>
          </div>
          {recentWithdrawals.length === 0 ? (
            <div className="empty-state">
              <p className="empty-text">{t('noRecentActivity')}</p>
            </div>
          ) : (
            recentWithdrawals.map((w) => (
              <div key={w.id} className="withdrawal-card" style={{ padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-between">
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                      {w.currency} {formatNumber(w.amount)}
                    </span>
                    <span className="text-muted" style={{ marginInlineStart: '8px', fontSize: 'var(--font-size-xs)' }}>
                      {t('fromSource')} {w.source_contact_name}
                    </span>
                  </div>
                  <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {w.month_label || w.withdrawal_date}
                  </span>
                </div>
                {w.distributions.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    {w.distributions.map((d, i) => (
                      <span key={i} className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginInlineEnd: '12px' }}>
                        → {d.contact_name}: {formatNumber(d.amount)} ({d.method})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mt-lg animate-in stagger-4">
        <div className="card-header">
          <h2 className="card-title">{t('quickActions')}</h2>
        </div>
        <div className="quick-actions">
          <Link href="/income" className="quick-action-btn">
            <span className="quick-action-icon"><PlusCircle size={32} /></span>
            <span>{t('addNewSource')}</span>
          </Link>
          <Link href="/withdrawals" className="quick-action-btn">
            <span className="quick-action-icon"><ArrowRightLeft size={32} /></span>
            <span>{t('recordWithdrawal')}</span>
          </Link>
          <Link href="/contacts" className="quick-action-btn">
            <span className="quick-action-icon"><UserPlus size={32} /></span>
            <span>{t('addContact')}</span>
          </Link>
          <Link href="/reports" className="quick-action-btn">
            <span className="quick-action-icon"><FileBox size={32} /></span>
            <span>{t('viewReports')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
