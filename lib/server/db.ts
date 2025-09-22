import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

export function getPool(): mysql.Pool {
  if (!pool) {
    // Use your environment variables directly
    const DB_HOST = process.env.DB_HOST || '168.231.116.87';
    const DB_PORT = process.env.DB_PORT || '3306';
    const DB_USER = process.env.DB_USER || 'youssef';
    const DB_PASSWORD = process.env.DB_PASSWORD || 'Vmaxllc#2004youssef';
    const DB_NAME = process.env.DB_NAME || 'vmax';
    const CONNECTION_LIMIT = process.env.DB_CONNECTION_LIMIT || '50';

    console.log(`🔄 Creating MySQL connection pool to ${DB_HOST}:${DB_PORT} with user ${DB_USER} to database ${DB_NAME}`);
    
    pool = mysql.createPool({
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      
      // Connection Pool Settings
      connectionLimit: Math.max(parseInt(CONNECTION_LIMIT, 10), 50), // Minimum 50 connections
      
      // Character Set and Timezone
      charset: 'utf8mb4_general_ci',
      timezone: 'Z',
      
      // Queue Management
      queueLimit: 0, // No limit on queued connections
      
      // Additional Pool Options
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: false,
    });

    // Handle pool events
    pool.on('connection', (connection: any) => {
      console.log('✅ New MySQL connection established as id ' + connection.threadId);
    });

    pool.on('acquire', (connection: any) => {
      console.log('🔗 MySQL connection %d acquired', connection.threadId);
    });

    pool.on('release', (connection: any) => {
      console.log('🔓 MySQL connection %d released', connection.threadId);
    });

    console.log('✅ MySQL connection pool created successfully');
  }
  return pool;
}

export async function query<T = any>(sql: string, params: any[] = [], retries = 0): Promise<[T[], mysql.FieldPacket[]]> {
  try {
    console.log(`🔍 Executing MySQL query (attempt ${retries + 1}):`, sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));
    
    const startTime = Date.now();
    const [rows, fields] = await getPool().query(sql, params);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Query executed successfully in ${duration}ms, returned ${Array.isArray(rows) ? rows.length : 1} rows`);
    return [rows as T[], fields];
    
  } catch (error: any) {
    console.error('❌ MySQL Query Error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    
    // Handle specific connection errors with retry logic
    if (retries < MAX_RETRIES && (
      error.code === 'PROTOCOL_CONNECTION_LOST' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ER_CON_COUNT_ERROR' ||
      error.code === 'ETIMEDOUT'
    )) {
      console.log(`🔄 Retrying query (attempt ${retries + 2}/${MAX_RETRIES + 1}) after connection error:`, error.code);
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      
      // Reset pool if connection lost
      if (error.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Resetting connection pool...');
        pool = null;
      }
      
      return query(sql, params, retries + 1);
    }
    
    throw error;
  }
}

// Test connection function
export async function testConnection(): Promise<boolean> {
  try {
    const [rows] = await query('SELECT 1 as test');
    console.log('✅ MySQL connection test successful:', rows);
    return true;
  } catch (error) {
    console.error('❌ MySQL connection test failed:', error);
    return false;
  }
}

// Get pool statistics
export function getPoolStats() {
  if (!pool) {
    return { status: 'not_initialized' };
  }
  
  return {
    status: 'active',
    // Note: mysql2 doesn't expose all pool stats, but we can get basic info
    config: {
      connectionLimit: pool.config.connectionLimit,
      host: pool.config.host,
      database: pool.config.database,
      user: pool.config.user
    }
  };
}

// Close pool gracefully
export async function closePool(): Promise<void> {
  if (pool) {
    console.log('🔄 Closing MySQL connection pool...');
    try {
      await pool.end();
      pool = null;
      console.log('✅ MySQL connection pool closed successfully');
    } catch (error) {
      console.error('❌ Error closing MySQL pool:', error);
      throw error;
    }
  }
}

// Execute transaction
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('🔄 Transaction started');
    
    const result = await callback(connection);
    
    await connection.commit();
    console.log('✅ Transaction committed successfully');
    
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('❌ Transaction rolled back due to error:', error);
    throw error;
  } finally {
    connection.release();
    console.log('🔓 Transaction connection released');
  }
}

// Batch insert helper
export async function batchInsert(
  table: string, 
  columns: string[], 
  values: any[][], 
  batchSize = 1000
): Promise<void> {
  if (values.length === 0) return;
  
  console.log(`🔄 Starting batch insert to ${table}: ${values.length} rows in batches of ${batchSize}`);
  
  const placeholders = '(' + columns.map(() => '?').join(', ') + ')';
  
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    const batchPlaceholders = batch.map(() => placeholders).join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${batchPlaceholders}`;
    const params = batch.flat();
    
    await query(sql, params);
    console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(values.length / batchSize)}`);
  }
  
  console.log(`✅ Batch insert completed: ${values.length} rows inserted into ${table}`);
}
