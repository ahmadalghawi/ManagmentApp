'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { createContact, updateContact, deleteContact } from '@/lib/actions';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import { Users, Edit, Trash2, User, Landmark, Building, Receipt } from 'lucide-react';

export default function ContactsClient({ contacts }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [toast, setToast] = useState(null);

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

  const typeEmoji = { person: <User size={16} style={{ display: 'inline', marginBottom: '-3px' }} />, bank_account: <Landmark size={16} style={{ display: 'inline', marginBottom: '-3px' }} />, company: <Building size={16} style={{ display: 'inline', marginBottom: '-3px' }} />, expense: <Receipt size={16} style={{ display: 'inline', marginBottom: '-3px' }} /> };
  const typeBadge = { person: 'badge-person', bank_account: 'badge-bank', company: 'badge-company', expense: 'badge-expense' };

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
                      {typeEmoji[contact.type] || <User size={16} style={{ display: 'inline', marginBottom: '-3px' }} />} <span style={{ marginLeft: '4px' }}>{contact.name}</span>
                    </td>
                    <td>
                      <span className={`badge ${typeBadge[contact.type] || 'badge-person'}`}>
                        {contact.type === 'bank_account' ? t('bankAccount') : 
                         contact.type === 'company' ? t('company') : 
                         contact.type === 'expense' ? t('expense') : t('person')}
                      </span>
                    </td>
                    <td>{contact.notes || '—'}</td>
                    <td className="text-muted">{new Date(contact.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(contact)}>
                          <Edit size={16} /> {t('edit')}
                        </button>
                        <button className="btn btn-ghost btn-sm text-red" onClick={() => handleDelete(contact.id)}>
                          <Trash2 size={16} />
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
                { value: 'expense', label: t('expense') }
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

          <div className="modal-footer" style={{ padding: 0, border: 'none', marginTop: 'var(--space-lg)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingContact(null); }}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {editingContact ? t('save') : t('add')}
            </button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
