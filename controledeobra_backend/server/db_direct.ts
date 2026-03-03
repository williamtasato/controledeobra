import mysql from 'mysql2/promise';
import { ENV } from './_core/env';

// Cria o pool de conexões usando a DATABASE_URL
const pool = mysql.createPool(ENV.databaseUrl);

export async function query(sql: string, params?: any[]) {
  const [results] = await pool.execute(sql, params);
  return results;
}

export default pool;
