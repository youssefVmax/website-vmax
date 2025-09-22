import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { API_CONFIG } from './config';
import { logger } from './logger';

class Database {
  private pool: Pool;
  private static instance: Database;

  private constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',  // Update with your DB host
      user: process.env.DB_USER || 'root',       // Update with your DB user
      password: process.env.DB_PASS || '',       // Update with your DB password
      database: process.env.DB_NAME || 'vmax',   // Update with your DB name
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+00:00',
      charset: 'utf8mb4_unicode_ci',
      multipleStatements: false,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    // Test the connection
    this.testConnection();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async getConnection(): Promise<PoolConnection> {
    try {
      const connection = await this.pool.getConnection();
      return connection;
    } catch (error) {
      logger.error('Error getting database connection:', error);
      throw new Error('Failed to get database connection');
    }
  }

  public async query<T = RowDataPacket[]>(sql: string, params: any[] = []): Promise<T> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.query<RowDataPacket[]>(sql, params);
      return rows as unknown as T;
    } catch (error) {
      logger.error('Database query error:', { error, sql, params });
      throw error;
    } finally {
      connection.release();
    }
  }

  public async execute<T = ResultSetHeader>(sql: string, params: any[] = []): Promise<T> {
    const connection = await this.getConnection();
    try {
      const [result] = await connection.execute<ResultSetHeader>(sql, params);
      return result as unknown as T;
    } catch (error) {
      logger.error('Database execute error:', { error, sql, params });
      throw error;
    } finally {
      connection.release();
    }
  }

  public async beginTransaction(): Promise<PoolConnection> {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();
      return connection;
    } catch (error) {
      connection.release();
      logger.error('Begin transaction error:', error);
      throw error;
    }
  }

  public async commit(connection: PoolConnection): Promise<void> {
    try {
      await connection.commit();
    } catch (error) {
      await this.rollback(connection);
      throw error;
    } finally {
      connection.release();
    }
  }

  public async rollback(connection: PoolConnection): Promise<void> {
    try {
      await connection.rollback();
    } catch (error) {
      logger.error('Rollback error:', error);
    } finally {
      connection.release();
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const connection = await this.getConnection();
      await connection.ping();
      connection.release();
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      process.exit(1);
    }
  }

  public async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database pool:', error);
    }
  }
}

export const db = Database.getInstance();

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await db.close();
  process.exit(0);
});
