import Database from 'better-sqlite3';
import path from 'path';

const baseDataDir = process.env.APP_DATA_PATH || path.join(process.cwd(), 'data');
const DB_PATH = path.join(baseDataDir, 'income.db');

// Ensure data directory exists
import fs from 'fs';
if (!fs.existsSync(baseDataDir)) {
  fs.mkdirSync(baseDataDir, { recursive: true });
}

let currentDbId = null;
let db = null;

export function getProfilesState() {
  const PROFILES_PATH = path.join(baseDataDir, 'profiles.json');
  if (!fs.existsSync(PROFILES_PATH)) {
    const defaultState = {
      activeProfile: 'default',
      profiles: {
        'default': { id: 'default', name: 'My Personal Profile', dbFile: 'income.db', color: '#0ea5e9', createdAt: Date.now() }
      }
    };
    fs.writeFileSync(PROFILES_PATH, JSON.stringify(defaultState, null, 2));
    return defaultState;
  }
  return JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf-8'));
}

export function saveProfilesState(state) {
  const PROFILES_PATH = path.join(baseDataDir, 'profiles.json');
  fs.writeFileSync(PROFILES_PATH, JSON.stringify(state, null, 2));
}

function getDb() {
  const state = getProfilesState();
  const activeProfile = state.profiles[state.activeProfile];
  const dbFilename = activeProfile ? activeProfile.dbFile : 'income.db';
  const targetDbPath = path.join(baseDataDir, dbFilename);

  if (!db || currentDbId !== state.activeProfile) {
    if (db) {
       try { db.close(); } catch(e) {}
    }
    db = new Database(targetDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDb(db);
    currentDbId = state.activeProfile;
  }
  return db;
}

function initializeDb(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'person',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS income_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL,
      description TEXT,
      total_amount REAL NOT NULL,
      monthly_amount REAL NOT NULL,
      total_months INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      currency TEXT DEFAULT 'DKK',
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      income_source_id INTEGER NOT NULL,
      month_number INTEGER NOT NULL,
      month_label TEXT,
      amount REAL NOT NULL,
      withdrawal_date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (income_source_id) REFERENCES income_sources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      withdrawal_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'bank_transfer',
      distribution_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (withdrawal_id) REFERENCES withdrawals(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS distribution_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      income_source_id INTEGER,
      contact_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'bank_transfer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (income_source_id) REFERENCES income_sources(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'DKK',
      deadline TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS salary_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payer_contact_id INTEGER,
      payer_name_custom TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'DKK',
      received_date TEXT NOT NULL,
      work_period_from TEXT,
      work_period_to TEXT,
      category TEXT DEFAULT 'salary',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payer_contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS work_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER,
      project_name TEXT,
      log_date TEXT NOT NULL,
      hours REAL NOT NULL,
      hourly_rate REAL DEFAULT 0,
      currency TEXT DEFAULT 'DKK',
      description TEXT,
      status TEXT DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    );
  `);

  // Insert default currency setting if not exists
  const existing = database.prepare('SELECT key FROM settings WHERE key = ?').get('currency');
  if (!existing) {
    database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('currency', 'DKK');
  }

  // PRAGMA migrations check for missing columns in existing deployments
  try {
    const tableInfo = database.prepare("PRAGMA table_info(distributions)").all();
    const hasCol = tableInfo.some(c => c.name === 'distribution_date');
    if (!hasCol) {
      database.exec("ALTER TABLE distributions ADD COLUMN distribution_date TEXT");
    }
  } catch (err) {
    console.error("Migration error:", err);
  }
}

export default getDb;
