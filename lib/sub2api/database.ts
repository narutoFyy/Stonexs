import 'server-only';

import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { serverEnv } from '@/env/server';

let pool: Pool | undefined;

export class SharedBalanceError extends Error {
  constructor(
    message: string,
    readonly status: 402 | 404 | 503,
    readonly reason: 'INSUFFICIENT_BALANCE' | 'USER_NOT_FOUND' | 'DATABASE_NOT_CONFIGURED',
  ) {
    super(message);
    this.name = 'SharedBalanceError';
  }
}

function sharedPool() {
  const connectionString = serverEnv.SUB2API_DATABASE_URL;
  if (!connectionString) {
    throw new SharedBalanceError('共享余额数据库尚未配置', 503, 'DATABASE_NOT_CONFIGURED');
  }
  pool ??= new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
  return pool;
}

function adjustmentCode(idempotencyKey: string) {
  // redeem_codes.code is varchar(32); the truncated digest remains deterministic
  // while keeping the raw task identifier out of the shared wallet database.
  return createHash('sha256').update(idempotencyKey, 'utf8').digest('hex').slice(0, 32);
}

export async function debitSharedBalance(input: {
  userId: number;
  amount: number;
  idempotencyKey: string;
  notes: string;
}) {
  const client = await sharedPool().connect();
  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO public.redeem_codes
        (code, type, value, status, used_by, used_at, notes, created_at)
       VALUES ($1, 'admin_balance', $2, 'used', $3, NOW(), $4, NOW())
       ON CONFLICT (code) DO NOTHING
       RETURNING code`,
      [adjustmentCode(input.idempotencyKey), -input.amount, input.userId, input.notes],
    );

    if (inserted.rowCount === 0) {
      await client.query('COMMIT');
      return { deducted: false };
    }

    const updated = await client.query(
      `UPDATE public.users
       SET balance = balance - $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL AND balance >= $1
       RETURNING balance`,
      [input.amount, input.userId],
    );

    if (updated.rowCount === 0) {
      const user = await client.query(
        'SELECT 1 FROM public.users WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
        [input.userId],
      );
      throw new SharedBalanceError(
        user.rowCount ? '余额不足，无法生成科研图' : '账号不存在',
        user.rowCount ? 402 : 404,
        user.rowCount ? 'INSUFFICIENT_BALANCE' : 'USER_NOT_FOUND',
      );
    }

    await client.query('COMMIT');
    return { deducted: true, balance: Number(updated.rows[0].balance) };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
