import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);
const serverRoot = path.join(__dirname, '..', '..');

function isAuthorized(req: Request): boolean {
  const key = String(req.headers['x-bootstrap-key'] || '').trim();
  const secret = process.env.BOOTSTRAP_DB_KEY || process.env.JWT_SECRET || '';
  return Boolean(key && secret && key === secret);
}

router.post('/bootstrap-database', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  res.setTimeout(600000);
  req.setTimeout(600000);

  try {
    console.log('[bootstrap] 마이그레이션 시작...');
    const { stdout: migOut, stderr: migErr } = await execAsync('node scripts/run-migrations.cjs', {
      cwd: serverRoot,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (migOut) console.log(migOut);
    if (migErr) console.error(migErr);

    console.log('[bootstrap] 시드 시작...');
    const { stdout: seedOut, stderr: seedErr } = await execAsync('npx ts-node scripts/seed-data.ts', {
      cwd: serverRoot,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (seedOut) console.log(seedOut);
    if (seedErr) console.error(seedErr);

    return res.json({
      success: true,
      message: '마이그레이션·시드 완료. root / admin123 로 로그인하세요.',
    });
  } catch (error: any) {
    console.error('[bootstrap] 실패:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'bootstrap failed',
      stderr: error?.stderr?.slice?.(0, 2000),
    });
  }
});

export default router;
