const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '168.231.116.87',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'youssef',
  password: process.env.DB_PASSWORD || 'Vmaxllc#2004youssef',
  database: process.env.DB_NAME || 'vmax'
};

async function checkDatabase() {
  let connection;
  
  try {
    console.log('🔄 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database');

    // Check if all required tables exist
    const tables = ['users', 'deals', 'callbacks', 'targets', 'notifications'];
    
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ Table '${table}' exists with ${rows[0].count} records`);
      } catch (error) {
        console.error(`❌ Table '${table}' does not exist or has issues:`, error.message);
      }
    }

    // Check notifications table structure specifically
    try {
      const [columns] = await connection.execute(`DESCRIBE notifications`);
      console.log('📋 Notifications table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    } catch (error) {
      console.error('❌ Cannot describe notifications table:', error.message);
    }

    // Test a simple notifications query
    try {
      const [rows] = await connection.execute(`SELECT * FROM notifications LIMIT 5`);
      console.log(`✅ Successfully queried notifications table, found ${rows.length} records`);
      if (rows.length > 0) {
        console.log('📄 Sample notification:', JSON.stringify(rows[0], null, 2));
      }
    } catch (error) {
      console.error('❌ Error querying notifications table:', error.message);
    }

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

checkDatabase().catch(console.error);
