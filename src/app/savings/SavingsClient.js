'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { createSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '@/lib/actions';
import Modal from '@/components/Modal';
import { Target, TrendingUp, Calendar, Trash2, Edit } from 'lucide-react';

function formatNumber(num) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

export default function SavingsClient({ goals }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    if (editingGoal) {
      formData.set('id', editingGoal.id);
      await updateSavingsGoal(formData);
    } else {
      await createSavingsGoal(formData);
    }

    setShowModal(false);
    setEditingGoal(null);
    router.refresh();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('deleteConfirm'))) return;
    await deleteSavingsGoal(id);
    router.refresh();
  };

  const openEdit = (goal) => {
    setEditingGoal(goal);
    setShowModal(true);
  };

  return (
    <div className="animate-in">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">{t('savingsGoals')}</h1>
          <p className="page-subtitle">{goals.length} {t('savingsGoals').toLowerCase()}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingGoal(null); setShowModal(true); }}>
          + {t('addNewGoal')}
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon text-accent"><Target size={48} /></div>
            <p className="empty-text">{t('noSavings')}</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + {t('addNewGoal')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {goals.map((goal) => {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            return (
              <div key={goal.id} className="card goal-card animate-in">
                <div className="goal-header">
                  <div>
                    <div className="goal-name">{goal.name}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {goal.currency} {formatNumber(goal.target_amount)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(goal)}><Edit size={14} /></button>
                    <button className="btn btn-ghost btn-sm text-red" onClick={() => handleDelete(goal.id)}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="goal-progress-container">
                  <div className="goal-progress-bar">
                    <div className="goal-progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                  <div className="goal-stats">
                    <span>{progress.toFixed(1)}%</span>
                    <span>{goal.currency} {formatNumber(goal.current_amount)} / {formatNumber(goal.target_amount)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: 'var(--space-md)' }}>
                   <div className="flex items-center gap-1 text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                     <Calendar size={14} /> {goal.deadline || '—'}
                   </div>
                   {progress >= 100 && (
                     <div className="badge badge-active">{t('goalReached')}</div>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setEditingGoal(null); }} 
        title={editingGoal ? t('edit') : t('addNewGoal')}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('name')}</label>
            <input className="form-input" name="name" defaultValue={editingGoal?.name || ''} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('targetAmount')}</label>
              <input className="form-input" name="target_amount" type="number" step="0.01" defaultValue={editingGoal?.target_amount || ''} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('currentAmount')}</label>
              <input className="form-input" name="current_amount" type="number" step="0.01" defaultValue={editingGoal?.current_amount || 0} />
            </div>
          </div>
          <div className="form-row">
             <div className="form-group">
               <label className="form-label">Currency</label>
               <input className="form-input" name="currency" defaultValue={editingGoal?.currency || 'DKK'} />
             </div>
             <div className="form-group">
               <label className="form-label">{t('deadline')}</label>
               <input className="form-input" name="deadline" type="date" defaultValue={editingGoal?.deadline || ''} />
             </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary">{t('save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
