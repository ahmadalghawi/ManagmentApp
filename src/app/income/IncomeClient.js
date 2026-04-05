'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { createIncomeSource, updateIncomeSource, deleteIncomeSource } from '@/lib/actions';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import { AlertTriangle, Wallet, Trash2, Edit } from 'lucide-react';

function formatNumber(num) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

export default function IncomeClient({ sources, contacts }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editingSource, setEditingSource] = useState(null);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    if (editingSource) {
      formData.set('id', editingSource.id);
      await updateIncomeSource(formData);
      setToast({ message: t('success'), type: 'success' });
    } else {
      await createIncomeSource(formData);
      setToast({ message: t('success'), type: 'success' });
    }

    setShowModal(false);
    setEditingSource(null);
    router.refresh();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('deleteConfirm'))) return;
    await deleteIncomeSource(id);
    setToast({ message: t('success'), type: 'success' });
    setShowDetail(null);
    router.refresh();
  };

  const openEdit = (source) => {
    setEditingSource(source);
    setShowModal(true);
    setShowDetail(null);
  };

  const statusBadge = {
    active: 'badge-active',
    completed: 'badge-completed',
    paused: 'badge-paused',
  };

  return (
    <div className="animate-in">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">{t('incomeSources')}</h1>
          <p className="page-subtitle">{sources.length} {t('incomeSources').toLowerCase()}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingSource(null); setShowModal(true); }}>
          + {t('addIncomeSource')}
        </button>
      </div>

      {contacts.length === 0 && (
        <div className="card mb-lg" style={{ borderColor: 'var(--accent-amber)', background: 'var(--accent-amber-soft)' }}>
          <p style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> {t('noContacts')} <a href="/contacts" style={{ textDecoration: 'underline' }}>→ {t('contacts')}</a>
          </p>
        </div>
      )}

      {sources.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon text-accent"><Wallet size={48} /></div>
            <p className="empty-text">{t('noIncomeSources')}</p>
            {contacts.length > 0 && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                + {t('addIncomeSource')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid-2">
          {sources.map((source) => {
            const progress = source.total_amount > 0
              ? ((source.total_withdrawn / source.total_amount) * 100)
              : 0;
            const remaining = source.total_amount - source.total_withdrawn;
            const monthsLeft = source.total_months - source.withdrawal_count;

            return (
              <div
                key={source.id}
                className="card source-card animate-in"
                onClick={() => setShowDetail(source)}
              >
                <div className="source-card-header">
                  <div>
                    <div className="source-card-title">{source.contact_name}</div>
                    <div className="source-card-contact">
                      <span className={`badge ${statusBadge[source.status]}`}>
                        {t(source.status)}
                      </span>
                    </div>
                    {source.description && (
                      <div className="source-description">{source.description}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div className="source-card-amount">
                      {source.currency} {formatNumber(source.total_amount)}
                    </div>
                    <div className="source-card-monthly">
                      {source.currency} {formatNumber(source.monthly_amount)} / {t('month')}
                    </div>
                  </div>
                </div>

                <div className="progress-bar-container">
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="progress-bar-labels">
                    <span>{progress.toFixed(0)}% {t('withdrawals').toLowerCase()}</span>
                    <span>{source.currency} {formatNumber(remaining)} {t('remaining').toLowerCase()}</span>
                  </div>
                </div>

                <div className="source-card-stats">
                  <div className="source-stat">
                    <div className="source-stat-value">{source.total_months}</div>
                    <div className="source-stat-label">{t('totalMonths')}</div>
                  </div>
                  <div className="source-stat">
                    <div className="source-stat-value">{source.withdrawal_count}</div>
                    <div className="source-stat-label">{t('withdrawals')}</div>
                  </div>
                  <div className="source-stat">
                    <div className="source-stat-value text-accent">{monthsLeft}</div>
                    <div className="source-stat-label">{t('monthsRemaining')}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={t('sourceDetails')}
        size="lg"
      >
        {showDetail && (() => {
          const s = showDetail;
          const remaining = s.total_amount - s.total_withdrawn;
          const monthsLeft = s.total_months - s.withdrawal_count;

          return (
            <div>
              <div className="detail-header">
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
                    {s.contact_name}
                  </h3>
                  <span className={`badge ${statusBadge[s.status]}`}>{t(s.status)}</span>
                  {s.description && (
                    <div className="source-description" style={{ marginTop: '8px' }}>{s.description}</div>
                  )}
                </div>
                <div className="detail-amount">
                  {s.currency} {formatNumber(s.total_amount)}
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item-label">{t('monthlyAmount')}</div>
                  <div className="detail-item-value">{s.currency} {formatNumber(s.monthly_amount)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">{t('totalWithdrawn')}</div>
                  <div className="detail-item-value">{s.currency} {formatNumber(s.total_withdrawn)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">{t('remaining')}</div>
                  <div className="detail-item-value text-accent">{s.currency} {formatNumber(remaining)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">{t('startDate')}</div>
                  <div className="detail-item-value">{s.start_date}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">{t('monthsRemaining')}</div>
                  <div className="detail-item-value">{monthsLeft} / {s.total_months}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">{t('currency')}</div>
                  <div className="detail-item-value">{s.currency}</div>
                </div>
              </div>

              {s.notes && (
                <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <div className="detail-item-label">{t('notes')}</div>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{s.notes}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)', justifyContent: 'flex-end' }}>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>
                  <Trash2 size={16} /> {t('delete')}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>
                  <Edit size={16} /> {t('edit')}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingSource(null); }}
        title={editingSource ? t('editIncomeSource') : t('addIncomeSource')}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('contactPerson')}</label>
            <CustomSelect 
              name="contact_id" 
              defaultValue={editingSource?.contact_id || ''}
              options={[
                { value: '', label: t('selectSource') },
                ...contacts.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('incomeDescription')}</label>
            <textarea
              className="form-textarea"
              name="description"
              defaultValue={editingSource?.description || ''}
              placeholder={t('incomeDescription')}
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('totalAmount')}</label>
              <input className="form-input" name="total_amount" type="number" step="0.01" required
                defaultValue={editingSource?.total_amount || ''} placeholder="100000" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('monthlyAmount')}</label>
              <input className="form-input" name="monthly_amount" type="number" step="0.01" required
                defaultValue={editingSource?.monthly_amount || ''} placeholder="12500" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('totalMonths')}</label>
              <input className="form-input" name="total_months" type="number" required
                defaultValue={editingSource?.total_months || ''} placeholder="8" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('startDate')}</label>
              <input className="form-input" name="start_date" type="date" required
                defaultValue={editingSource?.start_date || ''} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('currency')}</label>
              <CustomSelect 
                name="currency" 
                defaultValue={editingSource?.currency || 'DKK'}
                options={[
                  { value: 'DKK', label: 'DKK (Danish Krone)' },
                  { value: 'SEK', label: 'SEK (Swedish Krona)' },
                  { value: 'EUR', label: 'EUR (Euro)' },
                  { value: 'USD', label: 'USD (US Dollar)' }
                ]}
              />
            </div>
            {editingSource && (
              <div className="form-group">
                <label className="form-label">{t('status')}</label>
                <CustomSelect 
                  name="status" 
                  defaultValue={editingSource?.status || 'active'}
                  options={[
                    { value: 'active', label: t('active') },
                    { value: 'completed', label: t('completed') },
                    { value: 'paused', label: t('paused') }
                  ]}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t('notes')}</label>
            <textarea className="form-textarea" name="notes"
              defaultValue={editingSource?.notes || ''} placeholder={t('notes')} />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingSource(null); }}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {editingSource ? t('save') : t('add')}
            </button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
