const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'ProductionApp', 'production.db');
console.log('Opening DB:', dbPath);

const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');

const tables = [
  'material_requirements',
  'manufacturing_orders',
  'order_items',
  'orders',
  'inventory_transactions',
  'inventory',
  'product_stock',
  'product_elements',
  'products',
  'elements',
];

for (const t of tables) {
  const r = db.prepare(`DELETE FROM "${t}"`).run();
  console.log(`Deleted ${r.changes} rows from ${t}`);
}

db.pragma('foreign_keys = ON');
db.close();
console.log('Done - all data wiped except users');
