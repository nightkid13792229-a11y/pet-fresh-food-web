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
  const [rows, fields] = await connection.execute(sql, params);
  // MySQL2 的 execute 返回：
  // - 对于 SELECT: rows 是数组
  // - 对于 INSERT/UPDATE/DELETE: rows 是 ResultSetHeader 对象（包含 insertId, affectedRows 等）
  // 对于 INSERT，rows 本身就是 ResultSetHeader，有 insertId 属性
  // 对于 SELECT，rows 是数组
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



