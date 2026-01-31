const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const DATABASE_FILE = process.env.DATABASE_FILE || path.join(__dirname, '..', 'data', 'chore-app.db');
const dataDir = path.dirname(DATABASE_FILE);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DATABASE_FILE);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('parent', 'kid')) NOT NULL,
      points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS chores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to INTEGER,
      due_date TEXT,
      status TEXT CHECK(status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
      points INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES members (id) ON DELETE SET NULL
    )`
  );
});

db.close((err) => {
  if (err) {
    console.error('Failed to close database connection', err);
    process.exit(1);
  }
  console.log(`Database ready at ${DATABASE_FILE}`);
});
