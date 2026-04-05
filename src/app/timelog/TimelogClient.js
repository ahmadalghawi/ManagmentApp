'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { createWorkLog, updateWorkLog, updateWorkLogStatus, deleteWorkLog } from '@/lib/actions';
import Modal from '@/components/Modal';
import CustomSelect from '@/components/CustomSelect';
import Toast from '@/components/Toast';
import {
  Clock, Plus, Edit, Trash2, CheckCircle, AlertCircle,
  FileText, User, Calendar, TrendingUp, DollarSign, Search, Timer
} from 'lucide-react';

const CURRENCIES = ['DKK', 'SEK', 'EUR', 'USD', 'GBP'];

function formatNumber(n) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}
function formatHours(h) {
  const n = parseFloat(h) || 0;
  const whole = Math.floor(n);
  const mins = Math.round((n - whole) * 60);
  return mins > 0 ? `${whole}h ${mins}m` : `${whole}h`;
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_CONFIG = {
  unpaid:   { label: 'Unpaid',   color: 'var(--accent-red)',     bg: 'var(--accent-red-soft)'     },
  invoiced: { label: 'Invoiced', color: 'var(--accent-amber)',   bg: 'var(--accent-amber-soft)'   },
  paid:     { label: 'Paid',     color: 'var(--accent-green)',   bg: 'var(--accent-green-soft)'   },
};

export default function TimelogClient({ logs, contacts }) {
  const { t } = useLanguage();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [toast, setToast]         = useState(null);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterContact, setFilterContact] = useState('');
  const [viewMode, setViewMode]   = useState('list'); // 'list' | 'summary'

  // ── modal helpers ──────────────────────────────────────
  const resetModal = () => setEditing(null);

  const openNew = () => {
    resetModal();
    setShowModal(true);
  };

  const openEdit = (log) => {
    setEditing(log);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetModal();
  };

  // ── form submit ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      contact_id:   fd.get('contact_id') || null,
      project_name: fd.get('project_name') || null,
      log_date:     fd.get('log_date'),
      hours:        parseFloat(fd.get('hours')),
      hourly_rate:  parseFloat(fd.get('hourly_rate')) || 0,
      currency:     fd.get('currency'),
      description:  fd.get('description') || null,
      status:       fd.get('status') || 'unpaid',
    };

    if (editing) {
      await updateWorkLog({ ...data, id: editing.id });
    } else {
      await createWorkLog(data);
    }

    setToast({ message: t('success'), type: 'success' });
    closeModal();
    router.refresh();
  };

  // ── quick status toggle ────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    await updateWorkLogStatus(id, newStatus);
    setToast({ message: t('success'), type: 'success' });
    router.refresh();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    await deleteWorkLog(id);
    setToast({ message: t('success'), type: 'success' });
    router.refresh();
  };

  // ── filters ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return logs.filter(l => {
      const name    = (l.client_name || l.project_name || '').toLowerCase();
      const desc    = (l.description || '').toLowerCase();
      const q       = search.toLowerCase();
      const matchQ  = !q || name.includes(q) || desc.includes(q);
      const matchS  = !filterStatus  || l.status === filterStatus;
      const matchC  = !filterContact || String(l.contact_id) === filterContact;
      return matchQ && matchS && matchC;
    });
  }, [logs, search, filterStatus, filterContact]);

  // ── stats ──────────────────────────────────────────────
  const now           = new Date();
  const currentYear   = now.getFullYear();
  const currentMonth  = now.getMonth();

  const allHours       = logs.reduce((s, l) => s + l.hours, 0);
  const allEarned      = logs.reduce((s, l) => s + l.hours * l.hourly_rate, 0);
  const unpaidEarned   = logs.filter(l => l.status === 'unpaid')
                              .reduce((s, l) => s + l.hours * l.hourly_rate, 0);

  const thisMonthLogs  = logs.filter(l => {
    const d = new Date(l.log_date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const hoursThisMonth  = thisMonthLogs.reduce((s, l) => s + l.hours, 0);
  const earnedThisMonth = thisMonthLogs.reduce((s, l) => s + l.hours * l.hourly_rate, 0);

  // ── per-client summary ─────────────────────────────────
  const clientSummary = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const key = l.contact_id ? String(l.contact_id) : `custom_${l.project_name}`;
      if (!map[key]) {
        map[key] = { name: l.client_name || l.project_name || 'Unknown', hours: 0, earned: 0, unpaid: 0 };
      }
      map[key].hours  += l.hours;
      map[key].earned += l.hours * l.hourly_rate;
      if (l.status === 'unpaid') map[key].unpaid += l.hours * l.hourly_rate;
    });
    return Object.values(map).sort((a, b) => b.earned - a.earned);
  }, [logs]);

  // ── grouped by month ───────────────────────────────────
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(l => {
      const key = l.log_date?.slice(0, 7) || 'unknown';
      if (!g[key]) g[key] = [];
      g[key].push(l);
    });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const contactOptions = [
    { value: '', label: `— ${t('client')} —` },
    ...contacts.map(c => ({ value: c.id, label: c.name })),
  ];

  const statusOptions = [
    { value: 'unpaid',   label: t('unpaid')   },
    { value: 'invoiced', label: t('invoiced') },
    { value: 'paid',     label: t('paid')     },
  ];

  return (
    <div className="animate-in">

      {/* ── Header ── */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Clock size={28} className="text-accent" />
            {t('timeLog')}
          </h1>
          <p className="page-subtitle">{logs.length} {t('workLog').toLowerCase()}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            <FileText size={16} /> Log
          </button>
          <button
            className={`btn ${viewMode === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('summary')}
          >
            <TrendingUp size={16} /> Summary
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> {t('logHours')}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card stat-card animate-in stagger-1">
          <div className="card-icon cyan"><Timer size={24} /></div>
          <div className="stat-info">
            <div className="card-title">{t('totalHours')}</div>
            <div className="card-value">{formatHours(allHours)}</div>
          </div>
        </div>
        <div className="card stat-card animate-in stagger-2">
          <div className="card-icon green"><DollarSign size={24} /></div>
          <div className="stat-info">
            <div className="card-title">{t('totalEarned')}</div>
            <div className="card-value">{formatNumber(allEarned)}</div>
          </div>
        </div>
        <div className="card stat-card animate-in stagger-3">
          <div className="card-icon blue"><Calendar size={24} /></div>
          <div className="stat-info">
            <div className="card-title">{t('hoursThisMonth')}</div>
            <div className="card-value">{formatHours(hoursThisMonth)}</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              {formatNumber(earnedThisMonth)} {t('earned')}
            </div>
          </div>
        </div>
        <div className="card stat-card animate-in stagger-4" style={{ border: '1px solid var(--accent-red)', background: 'var(--accent-red-soft)' }}>
          <div className="card-icon red"><AlertCircle size={24} /></div>
          <div className="stat-info">
            <div className="card-title">{t('unpaid')}</div>
            <div className="card-value" style={{ color: 'var(--accent-red)' }}>{formatNumber(unpaidEarned)}</div>
          </div>
        </div>
      </div>

      {/* ── SUMMARY VIEW ── */}
      {viewMode === 'summary' && (
        <div className="animate-in">
          <h2 style={{ fontWeight: 700, marginBottom: 'var(--space-lg)', color: 'var(--text-heading)' }}>
            {t('client')} Summary
          </h2>
          {clientSummary.length === 0 ? (
            <div className="card"><div className="empty-state"><p className="empty-text">{t('noWorkLogs')}</p></div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {clientSummary.map((c, i) => {
                const pct = allEarned > 0 ? (c.earned / allEarned) * 100 : 0;
                return (
                  <div key={i} className="card animate-in" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--text-heading)' }}>{c.name}</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{formatHours(c.hours)} worked</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)', color: 'var(--accent-green)' }}>{formatNumber(c.earned)}</div>
                        {c.unpaid > 0 && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-red)' }}>
                            {formatNumber(c.unpaid)} {t('unpaid')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 1s var(--ease-out)'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <>
          {/* Filters */}
          <div className="card animate-in" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)', overflow: 'visible', position: 'relative', zIndex: 100 }}>
            <div className="form-row" style={{ alignItems: 'center', margin: 0, overflow: 'visible' }}>
              <div className="form-group" style={{ margin: 0, position: 'relative', flex: 2 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search client or project..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <CustomSelect
                  name="filter_status"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  placeholder="All Status"
                  options={[{ value: '', label: 'All Status' }, ...statusOptions]}
                />
              </div>
              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <CustomSelect
                  name="filter_contact"
                  value={filterContact}
                  onChange={e => setFilterContact(e.target.value)}
                  placeholder={`All ${t('client')}`}
                  options={[{ value: '', label: `All ${t('client')}` }, ...contacts.map(c => ({ value: c.id, label: c.name }))]}
                />
              </div>
            </div>
          </div>

          {/* Empty */}
          {logs.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon text-accent"><Clock size={48} /></div>
                <p className="empty-text">{t('noWorkLogs')}</p>
                <button className="btn btn-primary" onClick={openNew}>
                  <Plus size={16} /> {t('logHours')}
                </button>
              </div>
            </div>
          ) : grouped.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <p className="empty-text">No entries match your filters.</p>
              </div>
            </div>
          ) : (
            grouped.map(([monthKey, monthLogs]) => {
              const d = new Date(monthKey + '-01');
              const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              const mHours  = monthLogs.reduce((s, l) => s + l.hours, 0);
              const mEarned = monthLogs.reduce((s, l) => s + l.hours * l.hourly_rate, 0);

              return (
                <div key={monthKey} style={{ marginBottom: 'var(--space-xl)' }}>
                  {/* Month header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <div style={{
                      padding: '4px 14px',
                      background: 'var(--accent-primary-soft)',
                      border: '1px solid var(--accent-primary)',
                      borderRadius: 'var(--radius-full)',
                      color: 'var(--accent-primary)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>{monthLabel}</div>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}>
                      {formatHours(mHours)} · {formatNumber(mEarned)}
                    </div>
                  </div>

                  {/* Log entries */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {monthLogs.map(log => {
                      const earned  = log.hours * log.hourly_rate;
                      const sc      = STATUS_CONFIG[log.status] || STATUS_CONFIG.unpaid;

                      return (
                        <div key={log.id} className="card animate-in" style={{
                          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)',
                          padding: 'var(--space-md) var(--space-lg)',
                          borderLeft: `4px solid ${sc.color}`,
                        }}>
                          {/* Date block */}
                          <div style={{
                            minWidth: '52px', textAlign: 'center', flexShrink: 0,
                            background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                            padding: '8px 6px',
                          }}>
                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>
                              {log.log_date ? log.log_date.slice(8) : '—'}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {log.log_date ? new Date(log.log_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }) : ''}
                            </div>
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                              {log.client_name && (
                                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: 'var(--font-size-md)' }}>
                                  {log.client_name}
                                </span>
                              )}
                              {log.project_name && (
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                                  — {log.project_name}
                                </span>
                              )}
                              {/* Status badge */}
                              <button
                                onClick={() => {
                                  const next = log.status === 'unpaid' ? 'invoiced' : log.status === 'invoiced' ? 'paid' : 'unpaid';
                                  handleStatusChange(log.id, next);
                                }}
                                style={{
                                  padding: '2px 10px',
                                  borderRadius: 'var(--radius-full)',
                                  border: `1px solid ${sc.color}`,
                                  background: sc.bg,
                                  color: sc.color,
                                  fontSize: 'var(--font-size-xs)',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                                title="Click to change status"
                              >
                                {sc.label}
                              </button>
                            </div>

                            {log.description && (
                              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
                                {log.description}
                              </p>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} /> {formatHours(log.hours)}
                              </span>
                              {log.hourly_rate > 0 && (
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                  @ {log.currency} {formatNumber(log.hourly_rate)} {t('perHour')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Earned + Actions */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {log.hourly_rate > 0 ? (
                              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'var(--accent-green)' }}>
                                {log.currency} {formatNumber(earned)}
                              </div>
                            ) : (
                              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                                No rate
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '6px' }}>
                              <button className="btn btn-ghost btn-icon" onClick={() => openEdit(log)} title={t('edit')}>
                                <Edit size={14} />
                              </button>
                              <button className="btn btn-ghost btn-icon text-red" onClick={() => handleDelete(log.id)} title={t('delete')}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal isOpen={showModal} onClose={closeModal} title={editing ? t('editLog') : t('logHours')} size="lg">
        <form onSubmit={handleSubmit}>

          {/* Client + Project */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('client')}</label>
              <CustomSelect
                name="contact_id"
                value={editing?.contact_id || ''}
                onChange={() => {}}
                placeholder={`— ${t('client')} —`}
                options={contactOptions}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('projectName')}</label>
              <input className="form-input" name="project_name" defaultValue={editing?.project_name || ''} placeholder="Website redesign..." />
            </div>
          </div>

          {/* Date + Hours */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('logDate')}</label>
              <input className="form-input" name="log_date" type="date" required
                defaultValue={editing?.log_date || new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('hours')} <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>(e.g. 7.5 = 7h 30m)</span></label>
              <input className="form-input" name="hours" type="number" step="0.25" min="0.25" max="24" required
                defaultValue={editing?.hours || ''} placeholder="8" />
            </div>
          </div>

          {/* Rate + Currency */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('hourlyRate')} <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>(0 = no rate)</span></label>
              <input className="form-input" name="hourly_rate" type="number" step="0.01" min="0"
                defaultValue={editing?.hourly_rate || ''} placeholder="200" />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <CustomSelect name="currency" value={editing?.currency || 'DKK'}
                options={CURRENCIES.map(c => ({ value: c, label: c }))} />
            </div>
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label">{t('status')}</label>
            <CustomSelect name="status" value={editing?.status || 'unpaid'} options={statusOptions} />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">{t('description')} <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>(optional)</span></label>
            <textarea className="form-input" name="description" rows={3}
              defaultValue={editing?.description || ''}
              placeholder="What did you work on today?"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary">{t('save')}</button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
