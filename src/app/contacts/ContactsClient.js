'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { createContact, updateContact, deleteContact, getContactStatement } from '@/lib/actions';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import { 
  Users, Edit, Trash2, User, Landmark, Building, Receipt, 
  PiggyBank, FileText, ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Coins 
} from 'lucide-react';

function formatNumber(num) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

export default function ContactsClient({ contacts }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [toast, setToast] = useState(null);

  // Statement Ledger state variables
  const [viewStatement, setViewStatement] = useState(null); // stores { contact, timeline }
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'inflow', 'outflow'
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    if (editingContact) {
      formData.set('id', editingContact.id);
      await updateContact(formData);
      setToast({ message: t('success'), type: 'success' });
    } else {
      await createContact(formData);
      setToast({ message: t('success'), type: 'success' });
    }

    setShowModal(false);
    setEditingContact(null);
    router.refresh();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('deleteConfirm'))) return;
    const result = await deleteContact(id);
    if (result.success) {
      setToast({ message: t('success'), type: 'success' });
      router.refresh();
    } else {
      setToast({ message: result.error, type: 'error' });
    }
  };

  const openEdit = (contact) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  // Loads the contact's financial ledger statement from database
  const handleOpenStatement = async (contactId) => {
    setIsLoadingStatement(true);
    try {
      const data = await getContactStatement(contactId);
      if (data) {
        setViewStatement(data);
        setFilterType('all');
        setShowStatementModal(true);
      } else {
        setToast({ message: t('error') || 'Error loading statement', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: t('error') || 'Error loading statement', type: 'error' });
    } finally {
      setIsLoadingStatement(false);
    }
  };

  const typeEmoji = { 
    person: <User size={16} style={{ display: 'inline', marginBottom: '-3px' }} />, 
    bank_account: <Landmark size={16} style={{ display: 'inline', marginBottom: '-3px' }} />, 
    company: <Building size={16} style={{ display: 'inline', marginBottom: '-3px' }} />, 
    expense: <Receipt size={16} style={{ display: 'inline', marginBottom: '-3px' }} />,
    savings: <PiggyBank size={16} style={{ display: 'inline', marginBottom: '-3px' }} />
  };

  const typeBadge = { 
    person: 'badge-person', 
    bank_account: 'badge-bank', 
    company: 'badge-company', 
    expense: 'badge-expense',
    savings: 'badge-savings'
  };

  // Baseline exchange rate conversions for consolidated DKK statistics
  const convertAmountToDkk = (amount, fromCurrency) => {
    const BASE_RATES = { DKK: 1, SEK: 0.65, EUR: 7.45, USD: 6.90, GBP: 8.70 };
    const rate = BASE_RATES[fromCurrency || 'DKK'] || 1;
    return amount * rate;
  };

  // Group outflows by month for monthly sent & savings tracker card
  const getMonthLabel = (item) => {
    if (item.month_label) return item.month_label;
    if (item.date) {
      try {
        const dateObj = new Date(item.date);
        return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(dateObj);
      } catch (e) {}
    }
    return 'Unknown Month';
  };

  // Compile calculations when a statement modal is active
  let totalInflowDkk = 0;
  let totalOutflowDkk = 0;
  let netBalanceDkk = 0;
  let monthlyTotals = []; // list of { month, totalDkk, currencyBreakdown }

  if (viewStatement) {
    // 1. Calculate Consolidated stats in DKK
    viewStatement.timeline.forEach(item => {
      const dkkVal = convertAmountToDkk(item.amount, item.currency);
      if (item.flow === 'inflow') {
        totalInflowDkk += dkkVal;
      } else {
        totalOutflowDkk += dkkVal;
      }
    });
    const isSavings = viewStatement.contact.type === 'savings';
    netBalanceDkk = isSavings ? (totalOutflowDkk - totalInflowDkk) : (totalInflowDkk - totalOutflowDkk);

    // 2. Group outflows by month
    const monthlyGroups = {};
    viewStatement.timeline.filter(t => t.flow === 'outflow').forEach(item => {
      const mLabel = getMonthLabel(item);
      if (!monthlyGroups[mLabel]) {
        monthlyGroups[mLabel] = { DKK: 0 };
      }
      const curr = item.currency || 'DKK';
      if (!monthlyGroups[mLabel][curr]) {
        monthlyGroups[mLabel][curr] = 0;
      }
      monthlyGroups[mLabel][curr] += item.amount;
      monthlyGroups[mLabel].DKK += convertAmountToDkk(item.amount, curr);
    });

    // Convert grouped months map into sorted array (newest month first)
    monthlyTotals = Object.keys(monthlyGroups).map(mLabel => ({
      month: mLabel,
      totalDkk: monthlyGroups[mLabel].DKK,
      currencies: Object.keys(monthlyGroups[mLabel]).filter(c => c !== 'DKK').map(c => ({
        currency: c,
        amount: monthlyGroups[mLabel][c]
      }))
    }));
  }

  // Filtered timeline rows
  const filteredTimeline = viewStatement ? viewStatement.timeline.filter(item => {
    if (filterType === 'inflow') return item.flow === 'inflow';
    if (filterType === 'outflow') return item.flow === 'outflow';
    return true;
  }) : [];

  return (
    <div className="animate-in">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">{t('contacts')}</h1>
          <p className="page-subtitle">{contacts.length} {t('contacts').toLowerCase()}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingContact(null); setShowModal(true); }}>
          + {t('addNewContact')}
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon text-accent"><Users size={48} /></div>
            <p className="empty-text">{t('noContacts')}</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + {t('addNewContact')}
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('type')}</th>
                  <th>{t('notes')}</th>
                  <th>{t('date')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                      {typeEmoji[contact.type] || <User size={16} style={{ display: 'inline', marginBottom: '-3px' }} />} 
                      <span style={{ marginInlineStart: '8px' }}>{contact.name}</span>
                    </td>
                    <td>
                      <span className={`badge ${typeBadge[contact.type] || 'badge-person'}`}>
                        {contact.type === 'bank_account' ? t('bankAccount') : 
                         contact.type === 'company' ? t('company') : 
                         contact.type === 'expense' ? t('expense') : 
                         contact.type === 'savings' ? (t('savings') || 'Savings / Goal') : t('person')}
                      </span>
                    </td>
                    <td>{contact.notes || '—'}</td>
                    <td className="text-muted">{new Date(contact.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => handleOpenStatement(contact.id)}
                          disabled={isLoadingStatement}
                          title={t('viewStatement')}
                        >
                          <FileText size={15} /> 
                          <span style={{ marginInlineStart: '4px' }}>{t('viewStatement') || 'Statement'}</span>
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(contact)} title={t('edit')}>
                          <Edit size={15} />
                        </button>
                        <button className="btn btn-ghost btn-sm text-red" onClick={() => handleDelete(contact.id)} title={t('delete')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New / Edit Contact Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingContact(null); }}
        title={editingContact ? t('editContact') : t('addNewContact')}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('contactName')}</label>
            <input
              className="form-input"
              name="name"
              required
              defaultValue={editingContact?.name || ''}
              placeholder={t('contactName')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('contactType')}</label>
            <CustomSelect 
              name="type" 
              defaultValue={editingContact?.type || 'person'}
              options={[
                { value: 'person', label: t('person') },
                { value: 'bank_account', label: t('bankAccount') },
                { value: 'company', label: t('company') },
                { value: 'expense', label: t('expense') },
                { value: 'savings', label: t('savings') || 'Savings / Goal' }
              ]} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('notes')}</label>
            <textarea
              className="form-textarea"
              name="notes"
              defaultValue={editingContact?.notes || ''}
              placeholder={t('contactNotes')}
            />
          </div>

          <div className="modal-footer" style={{ padding: 0, border: 'none', marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingContact(null); }}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {editingContact ? t('save') : t('add')}
            </button>
          </div>
        </form>
      </Modal>

      {/* CRM Interactive Ledger Statement Modal */}
      <Modal
        isOpen={showStatementModal}
        onClose={() => { setShowStatementModal(false); setViewStatement(null); }}
        title={t('statementOfAccount') || 'Statement of Account'}
        size="lg"
      >
        {viewStatement && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Header profile cards summary */}
            <div className="flex-between" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {typeEmoji[viewStatement.contact.type] || <User size={20} />} 
                  {viewStatement.contact.name}
                </h3>
                <p className="text-muted" style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                  {viewStatement.contact.notes || '—'}
                </p>
              </div>
              <div>
                <span className={`badge ${typeBadge[viewStatement.contact.type] || 'badge-person'}`}>
                  {viewStatement.contact.type === 'bank_account' ? t('bankAccount') : 
                   viewStatement.contact.type === 'company' ? t('company') : 
                   viewStatement.contact.type === 'expense' ? t('expense') : 
                   viewStatement.contact.type === 'savings' ? (t('savings') || 'Savings / Goal') : t('person')}
                </span>
                <span className="text-muted" style={{ fontSize: '11px', display: 'block', marginTop: '4px', textAlign: 'end' }}>
                  {new Date(viewStatement.contact.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Glowing stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div className="card stat-card" style={{ padding: '12px var(--space-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <div className={`card-icon ${viewStatement.contact.type === 'savings' ? 'cyan' : 'green'}`} style={{ width: '32px', height: '32px' }}>
                  <TrendingUp size={16} />
                </div>
                <div className="stat-info">
                  <div className="card-title" style={{ fontSize: '10px' }}>
                    {viewStatement.contact.type === 'savings' ? (t('totalDeposited') || 'Total Saved') : (t('totalReceived') || 'Total Received')}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    {formatNumber(viewStatement.contact.type === 'savings' ? totalOutflowDkk : totalInflowDkk)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>DKK</span>
                  </div>
                </div>
              </div>

              <div className="card stat-card" style={{ padding: '12px var(--space-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <div className={`card-icon ${viewStatement.contact.type === 'savings' ? 'amber' : 'red'}`} style={{ width: '32px', height: '32px' }}>
                  <TrendingDown size={16} />
                </div>
                <div className="stat-info">
                  <div className="card-title" style={{ fontSize: '10px' }}>
                    {viewStatement.contact.type === 'savings' ? (t('totalTakenBack') || 'Total Taken Back') : (t('totalSent') || 'Total Sent')}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    {formatNumber(viewStatement.contact.type === 'savings' ? totalInflowDkk : totalOutflowDkk)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>DKK</span>
                  </div>
                </div>
              </div>

              <div className="card stat-card" style={{ 
                padding: '12px var(--space-md)', 
                background: netBalanceDkk >= 0 ? 'var(--accent-green-soft)' : 'var(--accent-red-soft)', 
                border: `1px solid ${netBalanceDkk >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                borderRadius: '12px' 
              }}>
                <div className="card-icon blue" style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'rgba(255,255,255,0.08)', 
                  color: netBalanceDkk >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
                }}>
                  <Coins size={16} />
                </div>
                <div className="stat-info">
                  <div className="card-title" style={{ fontSize: '10px', color: 'var(--text-primary)' }}>
                    {viewStatement.contact.type === 'savings' ? (t('netSavings') || 'Net Savings') : (t('netBalance') || 'Net Balance')}
                  </div>
                  <div style={{ 
                    fontSize: '1.15rem', 
                    fontWeight: 800, 
                    color: netBalanceDkk >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
                  }}>
                    {netBalanceDkk >= 0 ? '+' : ''}{formatNumber(netBalanceDkk)} <span style={{ fontSize: '10px', opacity: 0.8 }}>DKK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Sent & Savings Tracker Card */}
            {monthlyTotals.length > 0 && (
              <div className="card animate-in" style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <PiggyBank size={18} className="text-accent" />
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('monthlyTracker') || 'Monthly Sent & Savings Tracker'}
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {monthlyTotals.map((m, idx) => (
                    <div key={idx} style={{ 
                      padding: '10px', 
                      borderRadius: '8px', 
                      background: 'var(--bg-card-solid)', 
                      border: '1px solid var(--border-color)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '4px',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{m.month}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                        {formatNumber(m.totalDkk)} <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)' }}>DKK</span>
                      </span>
                      {m.currencies.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {m.currencies.map((cBreak, cIdx) => (
                            <span key={cIdx} style={{ fontSize: '8px', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '4px', fontWeight: 600 }}>
                              {formatNumber(cBreak.amount)} {cBreak.currency}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline interactive section */}
            <div style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t('transactionHistory')}
                </span>
                
                {/* Flow filtering pills */}
                <div style={{ display: 'inline-flex', padding: '3px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                  <button 
                    type="button"
                    onClick={() => setFilterType('all')} 
                    style={{
                      padding: '4px 10px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: '6px',
                      background: filterType === 'all' ? 'var(--accent-primary-soft)' : 'transparent',
                      color: filterType === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {t('allFlows') || 'All'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFilterType('inflow')} 
                    style={{
                      padding: '4px 10px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: '6px',
                      background: filterType === 'inflow' ? 'var(--accent-green-soft)' : 'transparent',
                      color: filterType === 'inflow' ? 'var(--accent-green)' : 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {t('inflowsOnly') || 'Inflow'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFilterType('outflow')} 
                    style={{
                      padding: '4px 10px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: '6px',
                      background: filterType === 'outflow' ? 'var(--accent-red-soft)' : 'transparent',
                      color: filterType === 'outflow' ? 'var(--accent-red)' : 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {t('outflowsOnly') || 'Outflow'}
                  </button>
                </div>
              </div>

              {filteredTimeline.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-xl) var(--space-md)' }}>
                  <p className="empty-text" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                    {t('noStatementEntries') || 'No transaction history for this contact.'}
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <table>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '8px 12px', fontSize: '10px' }}>{t('date')}</th>
                        <th style={{ padding: '8px 12px', fontSize: '10px' }}>{t('type')}</th>
                        <th style={{ padding: '8px 12px', fontSize: '10px' }}>{t('description')}</th>
                        <th style={{ padding: '8px 12px', fontSize: '10px', textAlign: 'end' }}>{t('amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTimeline.map((item) => (
                        <tr key={item.id}>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '12px' }}>
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                            <span className={`badge ${
                              item.type === 'income_source' ? 'badge-completed' :
                              item.type === 'salary_receipt' ? 'badge-person' :
                              item.type === 'distribution' ? 'badge-expense' : 'badge-active'
                            }`} style={{ padding: '1px 6px', fontSize: '10px' }}>
                              {item.type === 'income_source' ? (t('inflowContract') || 'Contract') :
                               item.type === 'salary_receipt' ? (t('directPayment') || 'Payment') :
                               item.type === 'distribution' ? (t('withdrawalSplit') || 'Split') : 
                               (t('timeTrackingEarning') || 'Work Log')}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: item.flow === 'inflow' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {item.flow === 'inflow' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                              </span>
                              <span style={{ color: 'var(--text-primary)' }}>{item.description}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '12px', textAlign: 'end', fontWeight: 700, color: item.flow === 'inflow' ? 'var(--accent-green)' : 'var(--text-heading)' }}>
                            {item.flow === 'inflow' ? '+' : '-'}{formatNumber(item.amount)} <span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--text-muted)' }}>{item.currency}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal footer Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowStatementModal(false); setViewStatement(null); }}>
                {t('close')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
