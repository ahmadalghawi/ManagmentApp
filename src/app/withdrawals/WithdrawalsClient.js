'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { createWithdrawal, updateWithdrawal, deleteWithdrawal, createDistributionTemplate } from '@/lib/actions';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import { Send, Trash2, X, PlusCircle, Edit, ChevronDown } from 'lucide-react';

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
  const [distributions, setDistributions] = useState([{ contact_id: '', amount: '', method: 'bank_transfer', distribution_date: new Date().toISOString().split('T')[0], notes: '' }]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');

  const selectedSource = sources.find(s => s.id === parseInt(selectedSourceId));

  useEffect(() => {
    if (!editingWithdrawal && selectedSource) {
      setWithdrawalAmount(selectedSource.monthly_amount.toString());
    }
  }, [selectedSourceId, selectedSource, editingWithdrawal]);

  const addDistribution = () => {
    setDistributions([...distributions, { contact_id: '', amount: '', method: 'bank_transfer', distribution_date: new Date().toISOString().split('T')[0], notes: '' }]);
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
        distribution_date: new Date().toISOString().split('T')[0],
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
        distribution_date: d.distribution_date,
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
    setDistributions([{ contact_id: '', amount: '', method: 'bank_transfer', distribution_date: new Date().toISOString().split('T')[0], notes: '' }]);
    router.refresh();
  };

  const openEdit = (w) => {
    setEditingWithdrawal(w);
    setSelectedSourceId(w.income_source_id);
    setDistributions(w.distributions.map(d => ({
      contact_id: d.contact_id,
      amount: d.amount.toString(),
      method: d.method,
      distribution_date: d.distribution_date || w.withdrawal_date,
      notes: d.notes || ''
    })));
    setWithdrawalAmount(w.amount.toString());
    setShowDetails(true);
    setShowModal(true);
  };

  const openNew = () => {
    setEditingWithdrawal(null);
    setSelectedSourceId('');
    setDistributions([{ contact_id: '', amount: '', method: 'bank_transfer', distribution_date: new Date().toISOString().split('T')[0], notes: '' }]);
    setWithdrawalAmount('');
    setShowDetails(true);
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
        <div className="grid-2">
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

              {/* Dynamic split mini-meter */}
              {w.distributions.length > 0 && (
                <div className="card-distribution-mini-bar" style={{ marginTop: '12px', marginBottom: '8px' }}>
                  {w.distributions.map((d, i) => (
                    <div
                      key={i}
                      className="card-distribution-mini-segment"
                      style={{
                        width: `${(d.amount / w.amount) * 100}%`,
                        background: i % 3 === 0 ? 'var(--accent-primary)' :
                                    i % 3 === 1 ? 'var(--accent-secondary)' : 'var(--accent-green)'
                      }}
                      title={`${d.contact_name}: ${w.currency} ${formatNumber(d.amount)}`}
                    />
                  ))}
                </div>
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
                      <span className="distribution-amount" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ fontWeight: 700 }}>{w.currency} {formatNumber(d.amount)}</span>
                        {d.distribution_date && d.distribution_date !== w.withdrawal_date && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>{d.distribution_date}</span>
                        )}
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
          setDistributions([{ contact_id: '', amount: '', method: 'bank_transfer', distribution_date: new Date().toISOString().split('T')[0], notes: '' }]);
        }}
        title={editingWithdrawal ? t('edit') : t('recordNewWithdrawal')}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-form-grid">
            {/* Left Column: Metadata & Source Info */}
            <div className="modal-form-left">
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
                  <input 
                    className="form-input" 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    required
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="12500" 
                  />
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

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('notes')}</label>
                <textarea 
                  className="form-textarea" 
                  name="notes" 
                  defaultValue={editingWithdrawal?.notes || ''} 
                  placeholder={t('notes')}
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column: Distributions List & Comparison Tracker */}
            <div className="modal-form-right">
              <div className="distributions-container">
                <div className="distributions-header flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                  <label className="form-label" style={{ margin: 0 }}>{t('distributions')}</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addDistribution}>
                    <PlusCircle size={14} style={{ marginInlineEnd: '4px' }} />
                    {t('addDistribution')}
                  </button>
                </div>

                <div className="distributions-list-scroll" style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                  {distributions.map((dist, i) => (
                    <div key={i} className="distribution-input-card">
                      <div className="distribution-card-header">
                        <span>{t('distribution') || 'Distribution'} #{i + 1}</span>
                        {distributions.length > 1 && (
                          <button 
                            type="button" 
                            className="btn btn-ghost btn-sm text-red" 
                            onClick={() => removeDistribution(i)}
                            style={{ padding: '2px 8px', height: 'auto' }}
                          >
                            <X size={13} style={{ marginInlineEnd: '2px' }} />
                            {t('delete') || 'Remove'}
                          </button>
                        )}
                      </div>
                      <div className="distribution-card-grid">
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label-small">{t('recipient')}</label>
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
                          <label className="form-label-small">{t('amount')}</label>
                          <input
                            className="form-input text-center"
                            type="number"
                            step="0.01"
                            value={dist.amount}
                            onChange={(e) => updateDistribution(i, 'amount', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label-small">{t('method')}</label>
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
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label-small">{t('date') || 'Date'}</label>
                          <input
                            className="form-input text-center"
                            type="date"
                            value={dist.distribution_date}
                            onChange={(e) => updateDistribution(i, 'distribution_date', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real-time comparative panel */}
                {(() => {
                  const parsedAmount = parseFloat(withdrawalAmount) || 0;
                  const remainingAmount = parsedAmount - distTotal;
                  const currencySymbol = selectedSource?.currency || 'DKK';
                  
                  let allocatedPercent = 0;
                  let excessPercent = 0;
                  
                  if (parsedAmount > 0) {
                    if (distTotal <= parsedAmount) {
                      allocatedPercent = (distTotal / parsedAmount) * 100;
                    } else {
                      allocatedPercent = (parsedAmount / distTotal) * 100;
                      excessPercent = ((distTotal - parsedAmount) / distTotal) * 100;
                    }
                  }
                  
                  const isMatch = parsedAmount > 0 && remainingAmount === 0;
                  const isUnder = parsedAmount > 0 && remainingAmount > 0;
                  const isOver = parsedAmount > 0 && remainingAmount < 0;
                  
                  return (
                    <div className="budget-visual-panel animate-in">
                      <div className="budget-status-row">
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {t('progress') || 'Allocation Status'}
                        </span>
                        <span style={{ 
                          color: isMatch ? 'var(--accent-green)' : (isUnder ? 'var(--accent-amber)' : 'var(--accent-red)'),
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isMatch && `✓ ${t('matchesAmount')}`}
                          {isUnder && `↓ ${t('underBudget')} (${formatNumber(remainingAmount)} ${currencySymbol})`}
                          {isOver && `↑ ${t('overBudget')} (+${formatNumber(Math.abs(remainingAmount))} ${currencySymbol})`}
                        </span>
                      </div>
                      
                      <div className="budget-bar-track">
                        {parsedAmount > 0 ? (
                          <>
                            <div 
                              className={`budget-bar-fill ${isMatch ? 'perfect-match' : ''}`}
                              style={{ 
                                width: `${allocatedPercent}%`
                              }}
                            />
                            {isOver && (
                              <div 
                                className="budget-bar-excess"
                                style={{ width: `${excessPercent}%` }}
                              />
                            )}
                          </>
                        ) : (
                          <div style={{ width: '0%' }} />
                        )}
                      </div>

                      <div className="budget-metrics-grid">
                        <div className="budget-metric-card">
                          <div className="budget-metric-label">{t('amount')}</div>
                          <div className="budget-metric-value" style={{ color: 'var(--accent-primary)' }}>
                            {formatNumber(parsedAmount)} <span style={{ fontSize: '8px', fontWeight: 500 }}>{currencySymbol}</span>
                          </div>
                        </div>
                        
                        <div className="budget-metric-card">
                          <div className="budget-metric-label">{t('distributionTotal')}</div>
                          <div className="budget-metric-value" style={{ color: 'var(--text-heading)' }}>
                            {formatNumber(distTotal)} <span style={{ fontSize: '8px', fontWeight: 500 }}>{currencySymbol}</span>
                          </div>
                        </div>
                        
                        <div className="budget-metric-card">
                          <div className="budget-metric-label">
                            {isOver ? (t('exceedsBy') || 'Excess') : (t('remaining'))}
                          </div>
                          <div className="budget-metric-value" style={{ 
                            color: isMatch ? 'var(--accent-green)' : (remainingAmount >= 0 ? 'var(--accent-amber)' : 'var(--accent-red)') 
                          }}>
                            {remainingAmount >= 0 ? formatNumber(remainingAmount) : `+${formatNumber(Math.abs(remainingAmount))}`}
                            <span style={{ fontSize: '8px', fontWeight: 500 }}> {currencySymbol}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {!editingWithdrawal && (
                  <div style={{ marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <label className="flex-between" style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <span className="form-label" style={{ margin: 0, fontSize: '12px' }}>{t('saveAsTemplate')}</span>
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
                          onChange={(e) => setTemplateName(e.target.checked ? false : e.target.value)}
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
            </div>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
