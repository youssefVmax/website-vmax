import mysql from "mysql2/promise";

// Create connection pool for better performance and reliability
const pool = mysql.createPool({
  host: "vmaxcom.org",
  port: 3306,
  user: "youssef",
  password: "Vmaxllc#2004youssef",
  database: "vmax",
  waitForConnections: true,
  connectionLimit: 5, // Reduced for better stability
  queueLimit: 0,
  // Connection timeout settings
  connectTimeout: 30000, // 30 seconds to establish connection
  acquireTimeout: 30000, // 30 seconds to acquire connection from pool
  idleTimeout: 300000, // 5 minutes idle timeout
  // Keep alive settings
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
} as any); // Use 'as any' to bypass TypeScript strict checking for mysql2 options

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log("✅ Connected to MySQL database as youssef");
    connection.release();
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err);
  });

// Helper function for queries with better error handling and retry logic
export async function query<T = any>(sql: string, params: any[] = []): Promise<[T[], any]> {
  const maxRetries = 3;
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [results, fields] = await pool.execute(sql, params);
      return [results as T[], fields];
    } catch (error: any) {
      lastError = error;
      console.error(`❌ MySQL Query Error (attempt ${attempt}/${maxRetries}):`, error);
      
      // If it's a connection error and we have retries left, wait and retry
      if (attempt < maxRetries && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST')) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      // If it's the last attempt or a non-retryable error, log and throw
      console.error('SQL:', sql);
      console.error('Params:', params);
      break;
    }
  }
  
  throw lastError;
}

export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1 as test');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
