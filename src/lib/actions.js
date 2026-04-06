'use server';

import getDb, { getProfilesState, saveProfilesState } from '../../database/db';
import { revalidatePath } from 'next/cache';
import { convertToCurrency } from './utils';

// ===================== CONTACTS =====================

export async function getContacts() {
  const db = getDb();
  return db.prepare('SELECT * FROM contacts ORDER BY name ASC').all();
}

export async function getContact(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
}

export async function createContact(formData) {
  const db = getDb();
  const name = formData.get('name');
  const type = formData.get('type') || 'person';
  const notes = formData.get('notes') || '';

  const result = db.prepare(
    'INSERT INTO contacts (name, type, notes) VALUES (?, ?, ?)'
  ).run(name, type, notes);

  revalidatePath('/contacts');
  revalidatePath('/');
  return { id: result.lastInsertRowid };
}

export async function updateContact(formData) {
  const db = getDb();
  const id = formData.get('id');
  const name = formData.get('name');
  const type = formData.get('type');
  const notes = formData.get('notes') || '';

  db.prepare(
    'UPDATE contacts SET name = ?, type = ?, notes = ? WHERE id = ?'
  ).run(name, type, notes, id);

  revalidatePath('/contacts');
  revalidatePath('/');
  return { success: true };
}

export async function deleteContact(id) {
  const db = getDb();
  try {
    db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    revalidatePath('/contacts');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Contact is in use and cannot be deleted.' };
  }
}

// ===================== INCOME SOURCES =====================

export async function getIncomeSources() {
  const db = getDb();
  const sources = db.prepare(`
    SELECT 
      i.*,
      c.name as contact_name,
      c.type as contact_type,
      COALESCE(SUM(w.amount), 0) as total_withdrawn,
      COUNT(w.id) as withdrawal_count
    FROM income_sources i
    JOIN contacts c ON i.contact_id = c.id
    LEFT JOIN withdrawals w ON w.income_source_id = i.id
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `).all();
  return sources;
}

export async function getIncomeSource(id) {
  const db = getDb();
  const source = db.prepare(`
    SELECT 
      i.*,
      c.name as contact_name,
      c.type as contact_type
    FROM income_sources i
    JOIN contacts c ON i.contact_id = c.id
    WHERE i.id = ?
  `).get(id);

  if (source) {
    const withdrawals = db.prepare(`
      SELECT w.*, 
        json_group_array(
          json_object(
            'id', d.id,
            'contact_id', d.contact_id,
            'contact_name', dc.name,
            'amount', d.amount,
            'method', d.method,
            'notes', d.notes
          )
        ) as distributions_json
      FROM withdrawals w
      LEFT JOIN distributions d ON d.withdrawal_id = w.id
      LEFT JOIN contacts dc ON d.contact_id = dc.id
      WHERE w.income_source_id = ?
      GROUP BY w.id
      ORDER BY w.month_number ASC
    `).all(id);

    source.withdrawals = withdrawals.map(w => ({
      ...w,
      distributions: JSON.parse(w.distributions_json).filter(d => d.id !== null)
    }));

    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    source.total_withdrawn = totalWithdrawn;
    source.amount_remaining = source.total_amount - totalWithdrawn;
    source.months_used = withdrawals.length;
    source.months_remaining = source.total_months - withdrawals.length;
  }

  return source;
}

export async function createIncomeSource(formData) {
  const db = getDb();
  const contact_id = parseInt(formData.get('contact_id'));
  const description = formData.get('description') || '';
  const total_amount = parseFloat(formData.get('total_amount'));
  const monthly_amount = parseFloat(formData.get('monthly_amount'));
  const total_months = parseInt(formData.get('total_months'));
  const start_date = formData.get('start_date');
  const currency = formData.get('currency') || 'DKK';
  const notes = formData.get('notes') || '';

  const result = db.prepare(
    `INSERT INTO income_sources (contact_id, description, total_amount, monthly_amount, total_months, start_date, currency, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(contact_id, description, total_amount, monthly_amount, total_months, start_date, currency, notes);

  revalidatePath('/income');
  revalidatePath('/');
  return { id: result.lastInsertRowid };
}

export async function updateIncomeSource(formData) {
  const db = getDb();
  const id = formData.get('id');
  const contact_id = parseInt(formData.get('contact_id'));
  const description = formData.get('description') || '';
  const total_amount = parseFloat(formData.get('total_amount'));
  const monthly_amount = parseFloat(formData.get('monthly_amount'));
  const total_months = parseInt(formData.get('total_months'));
  const start_date = formData.get('start_date');
  const currency = formData.get('currency') || 'DKK';
  const status = formData.get('status') || 'active';
  const notes = formData.get('notes') || '';

  db.prepare(
    `UPDATE income_sources SET contact_id = ?, description = ?, total_amount = ?, monthly_amount = ?, 
     total_months = ?, start_date = ?, currency = ?, status = ?, notes = ? WHERE id = ?`
  ).run(contact_id, description, total_amount, monthly_amount, total_months, start_date, currency, status, notes, id);

  revalidatePath('/income');
  revalidatePath('/');
  return { success: true };
}

export async function deleteIncomeSource(id) {
  const db = getDb();
  db.prepare('DELETE FROM income_sources WHERE id = ?').run(id);
  revalidatePath('/income');
  revalidatePath('/');
  return { success: true };
}

// ===================== WITHDRAWALS =====================

export async function getWithdrawals() {
  const db = getDb();
  return db.prepare(`
    SELECT 
      w.*,
      i.total_amount as source_total,
      i.monthly_amount as source_monthly,
      i.currency,
      c.name as source_contact_name,
      json_group_array(
        json_object(
          'id', d.id,
          'contact_id', d.contact_id,
          'contact_name', dc.name,
          'amount', d.amount,
          'method', d.method,
          'distribution_date', d.distribution_date,
          'notes', d.notes
        )
      ) as distributions_json
    FROM withdrawals w
    JOIN income_sources i ON w.income_source_id = i.id
    JOIN contacts c ON i.contact_id = c.id
    LEFT JOIN distributions d ON d.withdrawal_id = w.id
    LEFT JOIN contacts dc ON d.contact_id = dc.id
    GROUP BY w.id
    ORDER BY w.withdrawal_date DESC, w.created_at DESC
  `).all().map(w => ({
    ...w,
    distributions: JSON.parse(w.distributions_json).filter(d => d.id !== null)
  }));
}

export async function createWithdrawal(data) {
  const db = getDb();
  
  const insertWithdrawal = db.prepare(
    `INSERT INTO withdrawals (income_source_id, month_number, month_label, amount, withdrawal_date, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertDistribution = db.prepare(
    `INSERT INTO distributions (withdrawal_id, contact_id, amount, method, distribution_date, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const transaction = db.transaction((withdrawalData) => {
    const result = insertWithdrawal.run(
      withdrawalData.income_source_id,
      withdrawalData.month_number,
      withdrawalData.month_label,
      withdrawalData.amount,
      withdrawalData.withdrawal_date,
      withdrawalData.notes || ''
    );

    const withdrawalId = result.lastInsertRowid;

    if (withdrawalData.distributions && withdrawalData.distributions.length > 0) {
      for (const dist of withdrawalData.distributions) {
        insertDistribution.run(
          withdrawalId,
          dist.contact_id,
          dist.amount,
          dist.method || 'bank_transfer',
          dist.distribution_date || withdrawalData.withdrawal_date,
          dist.notes || ''
        );
      }
    }

    return { id: withdrawalId };
  });

  const result = transaction(data);
  revalidatePath('/withdrawals');
  revalidatePath('/income');
  revalidatePath('/');
  return result;
}

export async function updateWithdrawal(data) {
  const db = getDb();
  
  const updateWithdrawalStmt = db.prepare(`
    UPDATE withdrawals 
    SET amount = ?, month_number = ?, month_label = ?, withdrawal_date = ?, notes = ?
    WHERE id = ?
  `);

  const deleteDistributions = db.prepare('DELETE FROM distributions WHERE withdrawal_id = ?');
  const insertDistribution = db.prepare(
    `INSERT INTO distributions (withdrawal_id, contact_id, amount, method, distribution_date, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const transaction = db.transaction((withdrawalData) => {
    updateWithdrawalStmt.run(
      withdrawalData.amount,
      withdrawalData.month_number,
      withdrawalData.month_label,
      withdrawalData.withdrawal_date,
      withdrawalData.notes || '',
      withdrawalData.id
    );

    deleteDistributions.run(withdrawalData.id);

    if (withdrawalData.distributions && withdrawalData.distributions.length > 0) {
      for (const dist of withdrawalData.distributions) {
        insertDistribution.run(
          withdrawalData.id,
          dist.contact_id,
          dist.amount,
          dist.method || 'bank_transfer',
          dist.distribution_date || withdrawalData.withdrawal_date,
          dist.notes || ''
        );
      }
    }
    return { success: true };
  });

  const result = transaction(data);
  revalidatePath('/withdrawals');
  revalidatePath('/income');
  revalidatePath('/');
  return result;
}

export async function deleteWithdrawal(id) {
  const db = getDb();
  db.prepare('DELETE FROM withdrawals WHERE id = ?').run(id);
  revalidatePath('/withdrawals');
  revalidatePath('/income');
  revalidatePath('/');
  return { success: true };
}

// ===================== TEMPLATES =====================

export async function getDistributionTemplates(sourceId = null) {
  const db = getDb();
  let query = `
    SELECT t.*, c.name as contact_name
    FROM distribution_templates t
    JOIN contacts c ON t.contact_id = c.id
  `;
  const params = [];
  
  if (sourceId) {
    query += ' WHERE t.income_source_id = ? OR t.income_source_id IS NULL';
    params.push(sourceId);
  }

  return db.prepare(query).all(...params);
}

export async function createDistributionTemplate(data) {
  const db = getDb();
  const { name, income_source_id, contact_id, amount, method } = data;
  
  db.prepare(`
    INSERT INTO distribution_templates (name, income_source_id, contact_id, amount, method)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, income_source_id || null, contact_id, amount, method || 'bank_transfer');

  return { success: true };
}

export async function getTemplatesBySource(sourceId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.*, c.name as contact_name
    FROM distribution_templates t
    JOIN contacts c ON t.contact_id = c.id
    WHERE t.income_source_id = ?
  `).all(sourceId);
  
  return rows;
}


// ===== SAVINGS GOALS =====

export async function getSavingsGoals() {
  const db = getDb();
  return db.prepare('SELECT * FROM savings_goals ORDER BY created_at DESC').all();
}

export async function createSavingsGoal(formData) {
  const db = getDb();
  const name = formData.get('name');
  const target = parseFloat(formData.get('target_amount'));
  const current = parseFloat(formData.get('current_amount')) || 0;
  const currency = formData.get('currency') || 'DKK';
  const deadline = formData.get('deadline') || '';

  db.prepare(`
    INSERT INTO savings_goals (name, target_amount, current_amount, currency, deadline)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, target, current, currency, deadline);

  revalidatePath('/savings');
  revalidatePath('/');
  return { success: true };
}

export async function updateSavingsGoal(formData) {
  const db = getDb();
  const id = formData.get('id');
  const name = formData.get('name');
  const target = parseFloat(formData.get('target_amount'));
  const current = parseFloat(formData.get('current_amount'));
  const currency = formData.get('currency') || 'DKK';
  const deadline = formData.get('deadline') || '';
  const status = formData.get('status') || 'active';

  db.prepare(`
    UPDATE savings_goals
    SET name = ?, target_amount = ?, current_amount = ?, currency = ?, deadline = ?, status = ?
    WHERE id = ?
  `).run(name, target, current, currency, deadline, status, id);

  revalidatePath('/savings');
  revalidatePath('/');
  return { success: true };
}

export async function deleteSavingsGoal(id) {
  const db = getDb();
  db.prepare('DELETE FROM savings_goals WHERE id = ?').run(id);
  revalidatePath('/savings');
  revalidatePath('/');
  return { success: true };
}

// ===================== DASHBOARD =====================

export async function getDashboardData() {
  const db = getDb();

  const sources = db.prepare(`
    SELECT 
      i.*,
      c.name as contact_name,
      COALESCE(SUM(w.amount), 0) as total_withdrawn,
      COUNT(w.id) as withdrawal_count
    FROM income_sources i
    JOIN contacts c ON i.contact_id = c.id
    LEFT JOIN withdrawals w ON w.income_source_id = i.id
    WHERE i.status = 'active'
    GROUP BY i.id
  `).all();

  const totalIncome = sources.reduce((sum, s) => sum + s.total_amount, 0);
  const totalWithdrawn = sources.reduce((sum, s) => sum + s.total_withdrawn, 0);
  const totalRemaining = totalIncome - totalWithdrawn;

  const totalGlobalValue = sources.reduce((sum, s) => {
    const remaining = s.total_amount - s.total_withdrawn;
    return sum + convertToCurrency(remaining, s.currency, 'DKK');
  }, 0);

  const recentWithdrawals = db.prepare(`
    SELECT 
      w.*,
      c.name as source_contact_name,
      i.currency,
      json_group_array(
        json_object(
          'contact_name', dc.name,
          'amount', d.amount,
          'method', d.method
        )
      ) as distributions_json
    FROM withdrawals w
    JOIN income_sources i ON w.income_source_id = i.id
    JOIN contacts c ON i.contact_id = c.id
    LEFT JOIN distributions d ON d.withdrawal_id = w.id
    LEFT JOIN contacts dc ON d.contact_id = dc.id
    GROUP BY w.id
    ORDER BY w.withdrawal_date DESC
    LIMIT 5
  `).all().map(w => ({
    ...w,
    distributions: JSON.parse(w.distributions_json).filter(d => d.contact_name !== null)
  }));

  return {
    sources,
    totalIncome,
    totalWithdrawn,
    totalRemaining,
    totalGlobalValue, // Global DKK net worth
    activeSourcesCount: sources.length,
    recentWithdrawals,
  };
}

// ===================== REPORTS =====================

export async function getReportData(month, year) {
  const db = getDb();
  
  // Get all withdrawals for the month
  const withdrawals = db.prepare(`
    SELECT 
      w.*,
      i.total_amount as source_total,
      i.monthly_amount as source_monthly,
      i.currency,
      i.description as source_description,
      c.name as source_contact_name,
      json_group_array(
        json_object(
          'contact_name', dc.name,
          'amount', d.amount,
          'method', d.method,
          'notes', d.notes
        )
      ) as distributions_json
    FROM withdrawals w
    JOIN income_sources i ON w.income_source_id = i.id
    JOIN contacts c ON i.contact_id = c.id
    LEFT JOIN distributions d ON d.withdrawal_id = w.id
    LEFT JOIN contacts dc ON d.contact_id = dc.id
    WHERE w.month_label LIKE ?
    GROUP BY w.id
    ORDER BY w.withdrawal_date ASC
  `).all(`%${year}%`).map(w => ({
    ...w,
    distributions: JSON.parse(w.distributions_json).filter(d => d.contact_name !== null)
  }));

  // Get all sources with their current status
  const sources = db.prepare(`
    SELECT 
      i.*,
      c.name as contact_name,
      COALESCE(SUM(w.amount), 0) as total_withdrawn,
      COUNT(w.id) as withdrawal_count
    FROM income_sources i
    JOIN contacts c ON i.contact_id = c.id
    LEFT JOIN withdrawals w ON w.income_source_id = i.id
    GROUP BY i.id
  `).all();

  return { withdrawals, sources };
}

// ===================== SETTINGS =====================

export async function getSetting(key) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

export async function updateSetting(key, value) {
  const db = getDb();
  db.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  ).run(key, value);
  revalidatePath('/');
  return { success: true };
}

// ===================== PAYMENT LEDGER =====================

export async function getLedgerEntries() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      sr.*,
      c.name as payer_contact_name,
      c.type as payer_contact_type
    FROM salary_receipts sr
    LEFT JOIN contacts c ON sr.payer_contact_id = c.id
    ORDER BY sr.received_date DESC, sr.created_at DESC
  `).all();

  return rows.map(r => ({
    ...r,
    payer_display_name: r.payer_contact_name || r.payer_name_custom || 'Unknown',
  }));
}

export async function createLedgerEntry(data) {
  const db = getDb();
  db.prepare(`
    INSERT INTO salary_receipts 
      (payer_contact_id, payer_name_custom, amount, currency, received_date, work_period_from, work_period_to, category, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.payer_contact_id || null,
    data.payer_name_custom || null,
    data.amount,
    data.currency || 'DKK',
    data.received_date,
    data.work_period_from || null,
    data.work_period_to || null,
    data.category || 'salary',
    data.description || null
  );
  revalidatePath('/ledger');
  revalidatePath('/');
  return { success: true };
}

export async function updateLedgerEntry(data) {
  const db = getDb();
  db.prepare(`
    UPDATE salary_receipts 
    SET payer_contact_id = ?, payer_name_custom = ?, amount = ?, currency = ?,
        received_date = ?, work_period_from = ?, work_period_to = ?, category = ?, description = ?
    WHERE id = ?
  `).run(
    data.payer_contact_id || null,
    data.payer_name_custom || null,
    data.amount,
    data.currency || 'DKK',
    data.received_date,
    data.work_period_from || null,
    data.work_period_to || null,
    data.category || 'salary',
    data.description || null,
    data.id
  );
  revalidatePath('/ledger');
  revalidatePath('/');
  return { success: true };
}

export async function deleteLedgerEntry(id) {
  const db = getDb();
  db.prepare('DELETE FROM salary_receipts WHERE id = ?').run(id);
  revalidatePath('/ledger');
  revalidatePath('/');
  return { success: true };
}

// ===================== WORK LOG / TIME TRACKER =====================

export async function getWorkLogs() {
  const db = getDb();
  return db.prepare(`
    SELECT 
      wl.*,
      c.name as client_name
    FROM work_logs wl
    LEFT JOIN contacts c ON wl.contact_id = c.id
    ORDER BY wl.log_date DESC, wl.created_at DESC
  `).all();
}

export async function createWorkLog(data) {
  const db = getDb();
  db.prepare(`
    INSERT INTO work_logs 
      (contact_id, project_name, log_date, hours, hourly_rate, currency, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.contact_id || null,
    data.project_name || null,
    data.log_date,
    data.hours,
    data.hourly_rate || 0,
    data.currency || 'DKK',
    data.description || null,
    data.status || 'unpaid'
  );
  revalidatePath('/timelog');
  revalidatePath('/');
  return { success: true };
}

export async function updateWorkLog(data) {
  const db = getDb();
  db.prepare(`
    UPDATE work_logs 
    SET contact_id = ?, project_name = ?, log_date = ?, hours = ?,
        hourly_rate = ?, currency = ?, description = ?, status = ?
    WHERE id = ?
  `).run(
    data.contact_id || null,
    data.project_name || null,
    data.log_date,
    data.hours,
    data.hourly_rate || 0,
    data.currency || 'DKK',
    data.description || null,
    data.status || 'unpaid',
    data.id
  );
  revalidatePath('/timelog');
  revalidatePath('/');
  return { success: true };
}

export async function updateWorkLogStatus(id, status) {
  const db = getDb();
  db.prepare('UPDATE work_logs SET status = ? WHERE id = ?').run(status, id);
  revalidatePath('/timelog');
  return { success: true };
}

export async function deleteWorkLog(id) {
  const db = getDb();
  db.prepare('DELETE FROM work_logs WHERE id = ?').run(id);
  revalidatePath('/timelog');
  revalidatePath('/');
  return { success: true };
}

// ===================== WORKSPACE PROFILES =====================

export async function getWorkspaceProfiles() {
  const state = getProfilesState();
  return {
    activeProfile: state.activeProfile,
    profiles: Object.values(state.profiles).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  };
}

export async function switchWorkspace(profileId) {
  const state = getProfilesState();
  if (state.profiles[profileId]) {
    state.activeProfile = profileId;
    saveProfilesState(state);
    revalidatePath('/');
    return { success: true };
  }
  return { success: false, error: 'Profile not found' };
}

export async function createWorkspace(data) {
  const { name, color } = data;
  const state = getProfilesState();
  const id = 'ws_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  state.profiles[id] = {
    id,
    name,
    color: color || '#0ea5e9',
    dbFile: `income_${id}.db`,
    createdAt: Date.now()
  };
  state.activeProfile = id;
  saveProfilesState(state);
  revalidatePath('/'); // refresh the whole app to reflect the new empty database
  return { success: true, id };
}

export async function deleteWorkspace(profileId) {
  const state = getProfilesState();
  if (profileId === 'default' || !state.profiles[profileId]) return { success: false, error: 'Cannot delete this profile' };
  
  delete state.profiles[profileId];
  if (state.activeProfile === profileId) {
    state.activeProfile = 'default';
  }
  saveProfilesState(state);
  revalidatePath('/');
  return { success: true };
}

export async function updateWorkspace(profileId, data) {
  const state = getProfilesState();
  if (!state.profiles[profileId]) return { success: false, error: 'Profile not found' };
  
  state.profiles[profileId] = {
    ...state.profiles[profileId],
    ...data
  };
  saveProfilesState(state);
  revalidatePath('/');
  return { success: true };
}
