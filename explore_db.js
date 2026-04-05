const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'income.db');
const db = new Database(DB_PATH);

console.log('--- DATABASE EXPLORER ---');
console.log('Path:', DB_PATH);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

tables.forEach(table => {
  const count = db.prepare(`SELECT count(*) as count FROM ${table.name}`).get().count;
  console.log(`- TABLE: [${table.name}] | ROWS: ${count}`);
  
  if (count > 0) {
    const samples = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
    console.table(samples);
  }
});

db.close();
