const fs = require('fs');
const path = require('path');
const db = require('../src/database/db');

const exportFile = path.resolve(__dirname, 'database-snapshot.json');

const tables = ['roles', 'permissions', 'role_permissions', 'users', 'user_permissions', 'products', 'settings'];
const data = {};

for (const t of tables) {
  try {
    data[t] = db.prepare(`SELECT * FROM ${t}`).all();
  } catch (err) {
    console.error(`Failed to export ${t}:`, err.message);
  }
}

fs.writeFileSync(exportFile, JSON.stringify(data, null, 2), 'utf-8');
console.log('Database state exported cleanly to:', exportFile);
