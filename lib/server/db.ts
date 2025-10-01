import mysql from "mysql2/promise";

// Create connection pool for better performance and reliability
const pool = mysql.createPool({
  host: "vmaxcom.org",
  port: 3306,
  user: "youssef",
  password: "Vmaxllc#2004youssef",
  database: "vmax",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log("✅ Connected to MySQL database as youssef");
    connection.release();
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err);
  });

// Helper function for queries with better error handling
export async function query<T = any>(sql: string, params: any[] = []): Promise<[T[], any]> {
  try {
    console.log(`🔍 Executing query: ${sql.substring(0, 100)}...`);
    console.log(`📝 With params:`, params);
    
    const [results, fields] = await pool.execute(sql, params);
    
    console.log(`✅ Query executed successfully, returned ${Array.isArray(results) ? results.length : 1} rows`);
    return [results as T[], fields];
  } catch (error) {
    console.error('❌ MySQL Query Error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing database connection...');
    await query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
