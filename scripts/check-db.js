const db = require('better-sqlite3')('prisma/dev.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));
db.close();
