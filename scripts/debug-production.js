const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData/Roaming/productionapp/production.db');
console.log('DB path:', dbPath);

const db = new Database(dbPath);

const orders = db.prepare("SELECT id, order_number, status, client_name FROM orders WHERE status = 'in_production'").all();
console.log('\n=== In-production orders ===');
console.log(JSON.stringify(orders, null, 2));

for (const o of orders) {
  console.log(`\n--- Order #${o.order_number} (${o.client_name}) ---`);
  
  const items = db.prepare('SELECT id, product_id, boxes_needed, boxes_assembled FROM order_items WHERE order_id = ?').all(o.id);
  console.log('Order items:', JSON.stringify(items, null, 2));
  
  for (const item of items) {
    const product = db.prepare('SELECT id, serial_number FROM products WHERE id = ?').get(item.product_id);
    console.log(`  Product: ${product ? product.serial_number : 'NOT FOUND'}`);
    
    const elements = db.prepare('SELECT pe.element_id, pe.quantity_needed, e.unique_name, e.color FROM product_elements pe JOIN elements e ON pe.element_id = e.id WHERE pe.product_id = ?').all(item.product_id);
    console.log(`  Product elements (${elements.length}):`, JSON.stringify(elements));
  }
  
  const mfg = db.prepare('SELECT id, product_id, quantity_to_make, status FROM manufacturing_orders WHERE order_id = ?').all(o.id);
  console.log('Manufacturing orders:', JSON.stringify(mfg, null, 2));
  
  for (const m of mfg) {
    const reqs = db.prepare('SELECT element_id, quantity_needed, quantity_produced FROM material_requirements WHERE manufacturing_order_id = ?').all(m.id);
    console.log(`  MfgOrder ${m.id} requirements (${reqs.length}):`, JSON.stringify(reqs));
  }
}

db.close();
console.log('\nDone.');
