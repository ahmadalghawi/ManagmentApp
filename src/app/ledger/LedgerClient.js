'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { createLedgerEntry, updateLedgerEntry, deleteLedgerEntry } from '@/lib/actions';
import Modal from '@/components/Modal';
import CustomSelect from '@/components/CustomSelect';
import Toast from '@/components/Toast';
import {
  BookOpen, Plus, Edit, Trash2, Calendar, User, Tag,
  Briefcase, Gift, Star, DollarSign, Search, Filter, TrendingUp
} from 'lucide-react';

function formatNumber(num) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

const CATEGORY_ICONS = {
  salary:  { icon: Briefcase,  color: 'var(--accent-primary)'   },
  project: { icon: Star,       color: 'var(--accent-secondary)' },
  bonus:   { icon: TrendingUp, color: 'var(--accent-green)'     },
  gift:    { icon: Gift,       color: 'var(--accent-amber)'     },
  other:   { icon: DollarSign, color: 'var(--text-muted)'       },
};

const CURRENCIES = ['DKK', 'SEK', 'EUR', 'USD', 'GBP'];

export default function LedgerClient({ entries, contacts }) {
  const { t } = useLanguage();
  const router = useRouter();

  const [showModal, setShowModal]         = useState(false);
  const [editing, setEditing]             = useState(null);
  const [toast, setToast]                 = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayer, setFilterPayer]     = useState('');

  // Payer mode inside the modal: 'contact' | 'custom'
  const [payerMode, setPayerMode]         = useState('contact');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [customPayerName, setCustomPayerName]     = useState('');

  // ─── open / close helpers ────────────────────────────────
  const resetModal = () => {
    setEditing(null);
    setPayerMode('contact');
    setSelectedContactId('');
    setCustomPayerName('');
  };

  const openNew = () => { resetModal(); setShowModal(true); };

  const openEdit = (entry) => {
    setEditing(entry);
    if (entry.payer_contact_id) {
      setPayerMode('contact');
      setSelectedContactId(entry.payer_contact_id);
    } else {
      setPayerMode('custom');
      setCustomPayerName(entry.payer_name_custom || '');
      setSelectedContactId('');
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); resetModal(); };

  // ─── submit ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const data = {
      payer_contact_id: payerMode === 'contact' ? (selectedContactId || null) : null,
      payer_name_custom: payerMode === 'custom' ? (customPayerName.trim() || null) : null,
      amount: parseFloat(fd.get('amount')),
      currency: fd.get('currency'),
      received_date: fd.get('received_date'),
      work_period_from: fd.get('work_period_from') || null,
      work_period_to: fd.get('work_period_to') || null,
      category: fd.get('category'),
      description: fd.get('description') || null,
    };

    if (editing) {
      await updateLedgerEntry({ ...data, id: editing.id });
    } else {
      await createLedgerEntry(data);
    }

    setToast({ message: t('success'), type: 'success' });
    closeModal();
    router.refresh();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('deleteConfirm') || 'Are you sure?')) return;
    await deleteLedgerEntry(id);
    setToast({ message: t('success'), type: 'success' });
    router.refresh();
  };

  // ─── filters ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return entries.filter(e => {
      const name = (e.payer_display_name || '').toLowerCase();
      const desc = (e.description || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || name.includes(q) || desc.includes(q);
      const matchCat    = !filterCategory || e.category === filterCategory;
      const matchPayer  = !filterPayer    || String(e.payer_contact_id) === filterPayer || e.payer_name_custom === filterPayer;
      return matchSearch && matchCat && matchPayer;
    });
  }, [entries, searchQuery, filterCategory, filterPayer]);

  // ─── summary stats ───────────────────────────────────────
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const totalAllTime = entries.reduce((s, e) => s + e.amount, 0);
  const totalThisYear  = entries
    .filter(e => new Date(e.received_date).getFullYear() === currentYear)
    .reduce((s, e) => s + e.amount, 0);
  const totalThisMonth = entries
    .filter(e => {
      const d = new Date(e.received_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((s, e) => s + e.amount, 0);
  const lastEntry = entries[0];

  // ─── group by month ──────────────────────────────────────
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(e => {
      const key = e.received_date?.slice(0, 7) || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const categoryOptions = [
    { value: 'salary',  label: t('salaryCat')  },
    { value: 'project', label: t('projectCat') },
    { value: 'bonus',   label: t('bonusCat')   },
    { value: 'gift',    label: t('giftCat')    },
    { value: 'other',   label: t('otherCat')   },
  ];

  return (
    <div className="animate-in">
      {/* ── Header ── */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BookOpen size={28} className="text-accent" />
            {t('ledger')}
          </h1>
          <p className="page-subtitle">{entries.length} {t('totalReceived').toLowerCase()}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> {t('addReceipt')}
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card stat-card animate-in stagger-1">
          <div className="card-icon cyan"><DollarSign size={24} /></div>
          <div className="stat-info">
            <div className="card-title">{t('totalReceived')}</div>
            <div className="card-value">{formatNumber(totalAllTime)}</div>
          </div>
        </div>
        <div className="card stat-card animate-in stagger-2">
          <div className="card-icon green"><Calendar size={24} /></div>
          <div className="stat-info">
            <div className="card-title">{t('thisYear')} ({currentYear})</div>
            <div className="card-value">{formatNumber(totalThisYear)}</div>
          </div>
        </div>
        <div className="card stat-card animate-in stagger-3">
          <div className="card-icon blue"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <div className="card-title">{t('thisMonth')}</div>
            <div className="card-value">{formatNumber(totalThisMonth)}</div>
          </div>
        </div>
        {lastEntry && (
          <div className="card stat-card animate-in stagger-4" style={{ border: '1px solid var(--accent-primary)', background: 'var(--accent-primary-soft)' }}>
            <div className="card-icon amber"><User size={24} /></div>
            <div className="stat-info">
              <div className="card-title">{t('lastPayment')}</div>
              <div className="card-value" style={{ fontSize: 'var(--font-size-md)' }}>{lastEntry.payer_display_name}</div>
              <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                {lastEntry.currency} {formatNumber(lastEntry.amount)} · {formatDate(lastEntry.received_date)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="card animate-in" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)', zIndex: 10, position: 'relative', overflow: 'visible' }}>
        <div className="form-row" style={{ alignItems: 'center', margin: 0 }}>
          <div className="form-group" style={{ margin: 0, position: 'relative', flex: 2 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder={`${t('search')} payer or description...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <CustomSelect
              name="filter_category"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              placeholder={`${t('category')}...`}
              options={[
                { value: '', label: `All ${t('category')}` },
                ...categoryOptions
              ]}
            />
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      {entries.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon text-accent"><BookOpen size={48} /></div>
            <p className="empty-text">{t('noReceipts')}</p>
            <button className="btn btn-primary" onClick={openNew}>
              <Plus size={16} /> {t('addReceipt')}
            </button>
          </div>
        </div>
      ) : grouped.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon text-accent"><Filter size={48} /></div>
            <p className="empty-text">No entries match your filters.</p>
          </div>
        </div>
      ) : (
        grouped.map(([monthKey, monthEntries]) => {
          const d = new Date(monthKey + '-01');
          const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const monthTotal = monthEntries.reduce((s, e) => s + e.amount, 0);

          return (
            <div key={monthKey} style={{ marginBottom: 'var(--space-xl)' }}>
              {/* Month header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                marginBottom: 'var(--space-md)'
              }}>
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
                  {monthEntries.length} payments · {formatNumber(monthTotal)}
                </div>
              </div>

              {/* Entries */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {monthEntries.map(entry => {
                  const Cat = CATEGORY_ICONS[entry.category] || CATEGORY_ICONS.other;
                  const CatIcon = Cat.icon;
                  return (
                    <div key={entry.id} className="card animate-in" style={{
                      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)',
                      padding: 'var(--space-md) var(--space-lg)',
                      borderLeft: `4px solid ${Cat.color}`,
                    }}>
                      {/* Category icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: `${Cat.color}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        color: Cat.color,
                      }}>
                        <CatIcon size={18} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: 'var(--font-size-md)' }}>
                            {entry.payer_display_name}
                          </span>
                          <span className="badge" style={{
                            background: `${Cat.color}22`,
                            color: Cat.color,
                            border: `1px solid ${Cat.color}44`,
                          }}>
                            {categoryOptions.find(c => c.value === entry.category)?.label || entry.category}
                          </span>
                        </div>

                        {entry.description && (
                          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '4px 0', lineHeight: 1.5 }}>
                            {entry.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> {t('receivedDate')}: {formatDate(entry.received_date)}
                          </span>
                          {entry.work_period_from && (
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Tag size={12} /> {t('workPeriod')}: {formatDate(entry.work_period_from)} → {formatDate(entry.work_period_to)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--accent-green)' }}>
                          + {entry.currency} {formatNumber(entry.amount)}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button className="btn btn-ghost btn-icon" onClick={() => openEdit(entry)} title={t('edit')}>
                            <Edit size={14} />
                          </button>
                          <button className="btn btn-ghost btn-icon text-red" onClick={() => handleDelete(entry.id)} title={t('delete')}>
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

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? t('editReceipt') : t('addReceipt')}
        size="lg"
      >
        <form onSubmit={handleSubmit}>

          {/* Payer Mode Toggle */}
          <div className="form-group">
            <label className="form-label">{t('payer')}</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
              <button
                type="button"
                className={`btn btn-sm ${payerMode === 'contact' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPayerMode('contact')}
              >
                {t('payerFromContacts')}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${payerMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPayerMode('custom')}
              >
                {t('payerCustom')}
              </button>
            </div>
            {payerMode === 'contact' ? (
              <CustomSelect
                name="payer_contact_id_display"
                value={selectedContactId}
                onChange={e => setSelectedContactId(e.target.value)}
                placeholder={t('payerFromContacts')}
                options={[
                  { value: '', label: `— ${t('payerFromContacts')} —` },
                  ...contacts.map(c => ({ value: c.id, label: c.name }))
                ]}
              />
            ) : (
              <input
                className="form-input"
                placeholder="e.g. Gift from wedding, Lottery win..."
                value={customPayerName}
                onChange={e => setCustomPayerName(e.target.value)}
                required={payerMode === 'custom'}
              />
            )}
          </div>

          {/* Amount + Currency */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('amount')}</label>
              <input
                className="form-input"
                name="amount"
                type="number"
                step="0.01"
                required
                defaultValue={editing?.amount || ''}
                placeholder="5000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <CustomSelect
                name="currency"
                value={editing?.currency || 'DKK'}
                options={CURRENCIES.map(c => ({ value: c, label: c }))}
              />
            </div>
          </div>

          {/* Category + Received Date */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('category')}</label>
              <CustomSelect
                name="category"
                value={editing?.category || 'salary'}
                options={categoryOptions}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('receivedDate')}</label>
              <input
                className="form-input"
                name="received_date"
                type="date"
                required
                defaultValue={editing?.received_date || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Work Period */}
          <div className="form-group">
            <label className="form-label">{t('workPeriod')} <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>(optional)</span></label>
            <div className="form-row" style={{ gap: 'var(--space-sm)' }}>
              <input
                className="form-input"
                name="work_period_from"
                type="date"
                defaultValue={editing?.work_period_from || ''}
              />
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', padding: '0 4px' }}>→</div>
              <input
                className="form-input"
                name="work_period_to"
                type="date"
                defaultValue={editing?.work_period_to || ''}
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">{t('description')} / {t('notes')} <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>(optional)</span></label>
            <textarea
              className="form-input"
              name="description"
              rows={3}
              defaultValue={editing?.description || ''}
              placeholder='e.g. "Full month salary for January work 01-01-2026 to 31-01-2026"'
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
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
