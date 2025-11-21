import { Router } from 'express';
import pkg from '../../../package.json' with { type: 'json' };
import { getPool } from '../../db/pool.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT 1 AS ok');
    const database = rows?.[0]?.ok === 1 ? 'connected' : 'unknown';

    res.json({
      status: 'ok',
      version: pkg.version,
      database,
      timestamp: Date.now()
    });
  } catch (error) {
    next(error);
  }
});

export default router;

