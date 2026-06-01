/**
 * Railway/프로덕션용 마이그레이션 (ts-node 불필요)
 * DATABASE_URL 환경 변수 사용
 */

const { Sequelize } = require('sequelize');
const { readdirSync } = require('fs');
const { join } = require('path');
const { config } = require('dotenv');
const { getPostgresDialectOptions } = require('./postgres-dialect-options.cjs');

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  console.error('💡 Railway 환경에서는 DATABASE_URL이 자동으로 설정됩니다.');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  logging: console.log,
  dialect: 'postgres',
  dialectOptions: getPostgresDialectOptions(DATABASE_URL),
});

async function authenticateWithRetry(maxRetries = 8) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sequelize.authenticate();
      return;
    } catch (error) {
      console.error(`DB 연결 실패 (${attempt}/${maxRetries}):`, error.message);
      if (attempt >= maxRetries) throw error;
      const waitMs = 5000 * attempt;
      console.log(`${waitMs}ms 후 재시도...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

async function runMigrations() {
  try {
    console.log('🔌 데이터베이스 연결 중...');
    await authenticateWithRetry();
    console.log('✅ 데이터베이스 연결 성공\n');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        name VARCHAR(255) NOT NULL PRIMARY KEY
      );
    `);

    const migrationsPath = join(__dirname, '..', 'migrations');
    const migrationFiles = readdirSync(migrationsPath)
      .filter((file) => file.endsWith('.js'))
      .sort();

    console.log(`📋 발견된 마이그레이션 파일: ${migrationFiles.length}개\n`);

    const [executedMigrations] = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name'
    );

    const executedNames = executedMigrations.map((m) => m.name);
    console.log(`✅ 이미 실행된 마이그레이션: ${executedNames.length}개`);

    const pendingMigrations = migrationFiles.filter(
      (file) => !executedNames.includes(file.replace('.js', ''))
    );

    if (pendingMigrations.length === 0) {
      console.log('\n✅ 모든 마이그레이션이 이미 실행되었습니다.');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`\n🔄 실행할 마이그레이션: ${pendingMigrations.length}개\n`);

    for (const file of pendingMigrations) {
      try {
        console.log(`📦 실행 중: ${file}...`);
        const migration = require(join(migrationsPath, file));

        if (migration.up) {
          await migration.up(sequelize.getQueryInterface(), Sequelize);

          const migrationName = file.replace('.js', '');
          await sequelize.query(
            'INSERT INTO "SequelizeMeta" (name) VALUES ($1)',
            { bind: [migrationName] }
          );

          console.log(`   ✅ 완료: ${file}\n`);
        } else {
          console.log(`   ⚠️  up 함수가 없습니다: ${file}\n`);
        }
      } catch (error) {
        console.error(`   ❌ 오류: ${file}`);
        console.error(`   ${error.message}\n`);
        throw error;
      }
    }

    console.log('🎉 모든 마이그레이션이 성공적으로 실행되었습니다!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 마이그레이션 실행 실패:', error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigrations();
