const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'productionapp', 'production.db');
  console.log('DB path:', dbPath);
  
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);
  
  console.log('\n=== Orders in production ===');
  const orders = db.exec("SELECT id, order_number, status, client_name FROM orders WHERE status = 'in_production'");
  if (orders.length > 0) {
    for (const row of orders[0].values) {
      console.log(`  Order #${row[1]} - ${row[3]} (id: ${row[0]})`);
      
      // Items
      const items = db.exec(`SELECT oi.id, oi.product_id, oi.boxes_needed, oi.boxes_assembled, p.serial_number FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = '${row[0]}'`);
      if (items.length > 0) {
        console.log(`  Items (${items[0].values.length}):`);
        for (const item of items[0].values) {
          console.log(`    Product: ${item[4]} | boxes: ${item[2]} | assembled: ${item[3]}`);
          
          // Product elements
          const pes = db.exec(`SELECT pe.element_id, pe.quantity_needed, e.unique_name, e.color FROM product_elements pe JOIN elements e ON pe.element_id = e.id WHERE pe.product_id = '${item[1]}'`);
          if (pes.length > 0) {
            console.log(`    Product elements (${pes[0].values.length}):`);
            for (const pe of pes[0].values) {
              console.log(`      ${pe[2]} (${pe[3]}) - qty needed: ${pe[1]}`);
            }
          } else {
            console.log('    Product elements: NONE');
          }
        }
      } else {
        console.log('  Items: NONE');
      }
      
      // Manufacturing orders
      const mfgs = db.exec(`SELECT id, product_id, quantity_to_make, status FROM manufacturing_orders WHERE order_id = '${row[0]}'`);
      if (mfgs.length > 0) {
        console.log(`  Manufacturing orders (${mfgs[0].values.length}):`);
        for (const mfg of mfgs[0].values) {
          console.log(`    MfgOrder ${mfg[0]} - qty: ${mfg[2]} - status: ${mfg[3]}`);
          
          // Material requirements
          const reqs = db.exec(`SELECT mr.element_id, mr.quantity_needed, mr.quantity_produced, e.unique_name FROM material_requirements mr JOIN elements e ON mr.element_id = e.id WHERE mr.manufacturing_order_id = '${mfg[0]}'`);
          if (reqs.length > 0) {
            console.log(`    Requirements (${reqs[0].values.length}):`);
            for (const req of reqs[0].values) {
              console.log(`      ${req[3]}: need ${req[1]} | produced ${req[2]}`);
            }
          } else {
            console.log('    Requirements: NONE');
          }
        }
      } else {
        console.log('  Manufacturing orders: NONE');
      }
    }
  } else {
    console.log('  No orders in production!');
  }
  
  // Also check ALL orders
  console.log('\n=== All orders ===');
  const allOrders = db.exec("SELECT order_number, status, client_name FROM orders ORDER BY order_number");
  if (allOrders.length > 0) {
    for (const row of allOrders[0].values) {
      console.log(`  Order #${row[0]} - ${row[1]} - ${row[2]}`);
    }
  }
  
  db.close();
}

main().catch(console.error);
