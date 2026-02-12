// Use sql.js to query production database (no native module version issues)
const initSqlJs = require('sql.js');
const fs = require('fs');

const dbPath = process.env.APPDATA + '\\productionapp\\production.db';
console.log('DB path:', dbPath);

async function main() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  // Check if inventory_allocations table exists
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('\n=== All tables ===');
  if (tables.length > 0) {
    for (const row of tables[0].values) {
      console.log(' ', row[0]);
    }
  }

  // Check _prisma_migrations
  try {
    const migrations = db.exec("SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at");
    console.log('\n=== Applied migrations ===');
    if (migrations.length > 0) {
      for (const row of migrations[0].values) {
        console.log(`  ${row[0]}  (finished: ${row[1]})`);
      }
    }
  } catch (e) {
    console.log('\n=== No _prisma_migrations table ===');
    console.log('  (Database was NOT created via Prisma migrate)');
  }
  
  // Check _schema_version table
  try {
    const sv = db.exec("SELECT * FROM _schema_version");
    console.log('\n=== _schema_version ===');
    if (sv.length > 0) {
      console.log('Columns:', sv[0].columns.join(', '));
      for (const row of sv[0].values) {
        console.log(' ', row);
      }
    }
  } catch (e) {
    console.log('\n=== No _schema_version table ===');
  }

  // Check if inventory_allocations table has data
  try {
    const allocations = db.exec("SELECT * FROM inventory_allocations");
    console.log('\n=== Inventory Allocations ===');
    if (allocations.length > 0) {
      console.log('Columns:', allocations[0].columns.join(', '));
      console.log('Rows:', allocations[0].values.length);
      for (const row of allocations[0].values) {
        console.log(' ', row);
      }
    } else {
      console.log('No allocation records');
    }
  } catch (e) {
    console.log('ERROR querying inventory_allocations:', e.message);
  }

  // Simulate exactly what getInProduction does - query orders with status in_production
  const orders = db.exec("SELECT id, order_number, client_name, status FROM orders WHERE status = 'in_production'");
  console.log('\n=== Orders in production ===');
  if (orders.length > 0 && orders[0].values.length > 0) {
    for (const row of orders[0].values) {
      console.log(`  Order: id=${row[0]}, #${row[1]}, client=${row[2]}, status='${row[3]}'`);
      
      // Get manufacturing orders
      const mfg = db.exec(`SELECT id, product_id, quantity_to_make FROM manufacturing_orders WHERE order_id = '${row[0]}'`);
      if (mfg.length > 0) {
        console.log(`  Manufacturing orders: ${mfg[0].values.length}`);
        for (const m of mfg[0].values) {
          console.log(`    MfgOrder: id=${m[0]}, product=${m[1]}, qty=${m[2]}`);
          
          // Get material requirements
          const reqs = db.exec(`SELECT mr.id, mr.element_id, mr.quantity_needed, mr.quantity_produced, e.unique_name 
            FROM material_requirements mr 
            LEFT JOIN elements e ON mr.element_id = e.id 
            WHERE mr.manufacturing_order_id = '${m[0]}'`);
          if (reqs.length > 0) {
            console.log(`    Requirements: ${reqs[0].values.length}`);
            for (const r of reqs[0].values) {
              console.log(`      Element: ${r[4]}, needed=${r[2]}, produced=${r[3]}`);
            }
          }
        }
      }
    }
  } else {
    console.log('  NO orders with status in_production');
  }

  db.close();
}

main().catch(e => console.error('ERROR:', e));
