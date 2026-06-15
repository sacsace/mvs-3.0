/**
 * Railway 기동: 마이그레이션 후 API 서버 시작
 */
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${label}`);
    const child = spawn(command, args, {
      cwd: rootDir,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (exit ${code})`));
    });
  });
}

function startServer() {
  console.log('\n🚀 Railway bootstrap: API 서버 시작...');
  const server = spawn('npx', ['ts-node', 'src/index.ts'], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  server.on('error', (err) => {
    console.error('❌ 서버 시작 실패:', err);
    process.exit(1);
  });

  server.on('exit', (code) => {
    console.log(`서버 종료 (code=${code})`);
    process.exit(code ?? 0);
  });
}

(async () => {
  if (process.env.SKIP_DB_BOOTSTRAP === '1') {
    console.log('⏭️ SKIP_DB_BOOTSTRAP=1 — 마이그레이션/시드 건너뜀');
    startServer();
    return;
  }

  try {
    await run('node', ['scripts/run-migrations.cjs'], 'DB 마이그레이션');

    const shouldSeed =
      process.env.MVS_RUN_DB_SEED === '1' ||
      process.env.FORCE_DB_SEED === '1';

    if (shouldSeed) {
      await run('npx', ['ts-node', 'scripts/seed-data.ts'], 'DB 시드 (root/admin 계정)');
      console.log('\n✅ DB bootstrap 완료 — root / admin123 로 로그인 가능');
    } else {
      console.log('\n⏭️ DB 시드 건너뜀 (MVS_RUN_DB_SEED=1 이면 시드 실행). 마이그레이션만 적용됨');
    }
  } catch (error) {
    console.error('\n⚠️ DB bootstrap 실패:', error.message);
    console.error('마이그레이션 실패 시에도 서버를 기동합니다 (ensureAttendanceSchema 등 런타임 보정).');
  }

  startServer();
})();
