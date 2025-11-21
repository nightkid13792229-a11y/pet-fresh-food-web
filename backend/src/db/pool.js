import mysql from 'mysql2/promise';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let pool;

export const getPool = async () => {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0
    });

    pool.on('connection', () => {
      logger.debug('MySQL pool connection established');
    });

    pool.on('error', (error) => {
      logger.error('MySQL pool error', error);
    });
  }
  return pool;
};

export const query = async (sql, params = []) => {
  const connection = await getPool();
  const [rows] = await connection.execute(sql, params);
  return rows;
};

export const transaction = async (callback) => {
  const connection = await getPool();
  const conn = await connection.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};



