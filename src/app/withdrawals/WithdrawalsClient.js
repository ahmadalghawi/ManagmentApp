'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { createWithdrawal, updateWithdrawal, deleteWithdrawal, createDistributionTemplate } from '@/lib/actions';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import { Send, Trash2, X, PlusCircle, Edit } from 'lucide-react';

function formatNumber(num) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

export default function WithdrawalsClient({ withdrawals, sources, contacts, templates = [] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingWithdrawal, setEditingWithdrawal] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [distributions, setDistributions] = useState([{ contact_id: '', amount: '', method: 'bank_transfer', notes: '' }]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const selectedSource = sources.find(s => s.id === parseInt(selectedSourceId));

  const addDistribution = () => {
    setDistributions([...distributions, { contact_id: '', amount: '', method: 'bank_transfer', notes: '' }]);
  };

  const removeDistribution = (index) => {
    setDistributions(distributions.filter((_, i) => i !== index));
  };

  const updateDistribution = (index, field, value) => {
    const updated = [...distributions];
    updated[index] = { ...updated[index], [field]: value };
    setDistributions(updated);
  };

  const distTotal = distributions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const applyTemplate = (templateId) => {
    if (!templateId) return;
    const selectedTemplate = templates.find(t => t.id === parseInt(templateId));
    if (selectedTemplate) {
      // In a real app, a template might have multiple lines. 
      // For now, our schema is simple 1-to-1 but I'll treat it as a list filter
      const relevantTemplates = templates.filter(t => t.name === selectedTemplate.name);
      setDistributions(relevantTemplates.map(t => ({
        contact_id: t.contact_id.toString(),
        amount: t.amount.toString(),
        method: t.method,
        notes: ''
      })));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amount = parseFloat(formData.get('amount'));

    const validDistributions = distributions
      .filter(d => d.contact_id && d.amount)
      .map(d => ({
        contact_id: parseInt(d.contact_id),
        amount: parseFloat(d.amount),
        method: d.method,
        notes: d.notes,
      }));

    const data = {
      income_source_id: parseInt(formData.get('income_source_id')),
      month_number: parseInt(formData.get('month_number')),
      month_label: formData.get('month_label'),
      amount: amount,
      withdrawal_date: formData.get('withdrawal_date'),
      notes: formData.get('notes'),
      distributions: validDistributions,
    };

    if (editingWithdrawal) {
      await updateWithdrawal({ ...data, id: editingWithdrawal.id });
    } else {
      await createWithdrawal(data);
    }

    if (saveAsTemplate && templateName) {
      for (const dist of validDistributions) {
        await createDistributionTemplate({
          name: templateName,
          income_source_id: data.income_source_id,
          contact_id: dist.contact_id,
          amount: dist.amount,
          method: dist.method
        });
      }
    }
    setToast({ message: t('success'), type: 'success' });
    setShowModal(false);
    setSelectedSourceId('');
    setEditingWithdrawal(null);
    setDistributions([{ contact_id: '', amount: '', method: 'bank_transfer', notes: '' }]);
    router.refresh();
  };

  const openEdit = (w) => {
    setEditingWithdrawal(w);
    setSelectedSourceId(w.income_source_id);
    setDistributions(w.distributions.map(d => ({
      contact_id: d.contact_id,
      amount: d.amount.toString(),
      method: d.method,
      notes: d.notes || ''
    })));
    setShowModal(true);
  };

  const openNew = () => {
    setEditingWithdrawal(null);
    setSelectedSourceId('');
    setDistributions([{ contact_id: '', amount: '', method: 'bank_transfer', notes: '' }]);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('deleteConfirm'))) return;
    await deleteWithdrawal(id);
    setToast({ message: t('success'), type: 'success' });
    router.refresh();
  };

  const activeSources = sources.filter(s => s.status === 'active');

  return (
    <div className="animate-in">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">{t('withdrawals')}</h1>
          <p className="page-subtitle">{withdrawals.length} {t('withdrawals').toLowerCase()}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          + {t('recordNewWithdrawal')}
        </button>
      </div>

      {withdrawals.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon text-accent"><Send size={48} /></div>
            <p className="empty-text">{t('noWithdrawals')}</p>
            {activeSources.length > 0 && (
              <button className="btn btn-primary" onClick={openNew}>
                + {t('recordNewWithdrawal')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {withdrawals.map((w) => (
            <div key={w.id} className="card withdrawal-card animate-in">
              <div className="withdrawal-header">
                <div>
                  <span className="withdrawal-amount">
                    {w.currency} {formatNumber(w.amount)}
                  </span>
                  <span className="withdrawal-meta" style={{ marginInlineStart: '12px' }}>
                    {t('fromSource')} <strong>{w.source_contact_name}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {w.month_label || `${t('month')} ${w.month_number}`} • {w.withdrawal_date}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(w)} title={t('edit')}>
                      <Edit size={16} />
                    </button>
                    <button className="btn btn-ghost btn-icon text-red" onClick={() => handleDelete(w.id)} title={t('delete')}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {w.notes && (
                <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>{w.notes}</p>
              )}

              {w.distributions.length > 0 && (
                <div className="distribution-list">
                  {w.distributions.map((d, i) => (
                    <div key={i} className="distribution-item">
                      <div className="distribution-name">
                        <span className="distribution-dot" style={{
                          background: i % 3 === 0 ? 'var(--accent-primary)' :
                            i % 3 === 1 ? 'var(--accent-secondary)' : 'var(--accent-green)'
                        }} />
                        <span>{d.contact_name}</span>
                        <span className="distribution-method">
                          ({d.method === 'bank_transfer' ? t('bankTransfer') :
                            d.method === 'cash' ? t('cash') :
                            d.method === 'revolut' ? t('revolut') : d.method})
                        </span>
                      </div>
                      <span className="distribution-amount">
                        {w.currency} {formatNumber(d.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Withdrawal Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingWithdrawal(null);
          setSelectedSourceId('');
          setDistributions([{ contact_id: '', amount: '', method: 'bank_transfer', notes: '' }]);
        }}
        title={editingWithdrawal ? t('edit') : t('recordNewWithdrawal')}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('selectSource')}</label>
            <CustomSelect
              name="income_source_id"
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              disabled={!!editingWithdrawal}
              placeholder={t('selectSource')}
              options={[
                { value: "", label: t('selectSource') },
                ...sources.map(s => {
                  const remaining = s.total_amount - s.total_withdrawn;
                  return {
                    value: s.id,
                    label: `${s.contact_name} — ${s.currency} ${formatNumber(remaining)} ${t('remaining').toLowerCase()}`
                  };
                })
              ]}
            />
          </div>

          {!editingWithdrawal && selectedSourceId && (
            <div className="form-group animate-in">
              <label className="form-label">{t('useTemplate')}</label>
              <CustomSelect
                name="template_select"
                onChange={(e) => applyTemplate(e.target.value)}
                placeholder={t('useTemplate')}
                options={[
                  { value: "", label: t('useTemplate') },
                  ...[...new Set(templates.filter(t => !t.income_source_id || t.income_source_id === parseInt(selectedSourceId)).map(t => t.name))].map(name => {
                    const firstMatch = templates.find(t => t.name === name);
                    return { value: firstMatch.id, label: name };
                  })
                ]}
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('amount')}</label>
              <input className="form-input" name="amount" type="number" step="0.01" required
                defaultValue={editingWithdrawal?.amount || selectedSource?.monthly_amount || ''} placeholder="12500" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('withdrawalDate')}</label>
              <input className="form-input" name="withdrawal_date" type="date" required
                defaultValue={editingWithdrawal?.withdrawal_date || new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('monthNumber')}</label>
              <input className="form-input" name="month_number" type="number" required
                defaultValue={editingWithdrawal?.month_number || (selectedSource ? selectedSource.withdrawal_count + 1 : '')} placeholder="1" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('monthLabel')}</label>
              <input className="form-input" name="month_label" 
                defaultValue={editingWithdrawal?.month_label || ''}
                placeholder="March 2026" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('notes')}</label>
            <input className="form-input" name="notes" defaultValue={editingWithdrawal?.notes || ''} placeholder={t('notes')} />
          </div>

          {/* Distributions */}
          <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div className="flex-between mb-md">
              <label className="form-label" style={{ margin: 0 }}>{t('distributions')}</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addDistribution}>
                + {t('addDistribution')}
              </button>
            </div>

            {distributions.map((dist, i) => (
              <div key={i} className="dist-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>{t('recipient')}</label>
                  <CustomSelect
                    name="contact_id"
                    value={dist.contact_id}
                    onChange={(e) => updateDistribution(i, 'contact_id', e.target.value)}
                    placeholder={t('recipient')}
                    options={[
                      { value: "", label: t('recipient') },
                      ...contacts.map(c => ({ value: c.id, label: c.name }))
                    ]}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>{t('amount')}</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={dist.amount}
                    onChange={(e) => updateDistribution(i, 'amount', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>{t('method')}</label>
                  <CustomSelect
                    name="method"
                    value={dist.method}
                    onChange={(e) => updateDistribution(i, 'method', e.target.value)}
                    options={[
                      { value: 'bank_transfer', label: t('bankTransfer') },
                      { value: 'cash', label: t('cash') },
                      { value: 'revolut', label: t('revolut') },
                      { value: 'other', label: t('otherMethod') }
                    ]}
                  />
                </div>
                <div style={{ paddingBottom: '2px' }}>
                  {distributions.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-icon text-red" onClick={() => removeDistribution(i)}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="dist-total-row">
              <span>{t('distributionTotal')}</span>
              <span className={distTotal > 0 ? 'dist-total-match' : ''}>{formatNumber(distTotal)}</span>
            </div>

            {!editingWithdrawal && (
              <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <label className="flex-between" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <span className="form-label" style={{ margin: 0 }}>{t('saveAsTemplate')}</span>
                  <input 
                    type="checkbox" 
                    checked={saveAsTemplate} 
                    onChange={(e) => setSaveAsTemplate(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                  />
                </label>
                
                {saveAsTemplate && (
                  <div className="animate-in">
                    <input 
                      className="form-input" 
                      placeholder={t('templateName')} 
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      required={saveAsTemplate}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
