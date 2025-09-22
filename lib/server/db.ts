import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    const {
      MYSQL_HOST = '127.0.0.1',
      MYSQL_PORT = '3306',
      MYSQL_USER = 'root',
      MYSQL_PASSWORD = '',
      MYSQL_DATABASE = 'vmax',
      MYSQL_CONNECTION_LIMIT = '10',
    } = process.env;

    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: parseInt(MYSQL_PORT, 10),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      connectionLimit: parseInt(MYSQL_CONNECTION_LIMIT, 10),
      charset: 'utf8mb4_general_ci',
      timezone: 'Z',
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<[T[], mysql.FieldPacket[]]> {
  const [rows, fields] = await getPool().query(sql, params);
  return [rows as T[], fields];
}
