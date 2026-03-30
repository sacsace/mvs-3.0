#!/usr/bin/env ts-node

/**
 * Railway 환경에서 마이그레이션 실행 스크립트
 * DATABASE_URL 환경 변수를 사용하여 마이그레이션 실행
 */

import { Sequelize } from 'sequelize';
import { readdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// 환경 변수 로드
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  console.error('💡 Railway 환경에서는 DATABASE_URL이 자동으로 설정됩니다.');
  process.exit(1);
}

// DATABASE_URL에서 연결 정보 추출
const sequelize = new Sequelize(DATABASE_URL, {
  logging: console.log,
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

async function runMigrations() {
  try {
    console.log('🔌 데이터베이스 연결 중...');
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공\n');

    // SequelizeMeta 테이블 생성 (마이그레이션 기록용)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        name VARCHAR(255) NOT NULL PRIMARY KEY
      );
    `);

    // 마이그레이션 파일 목록 가져오기
    const migrationsPath = join(__dirname, '..', 'migrations');
    const migrationFiles = readdirSync(migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort();

    console.log(`📋 발견된 마이그레이션 파일: ${migrationFiles.length}개\n`);

    // 실행된 마이그레이션 확인
    const [executedMigrations] = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name'
    ) as any[];

    const executedNames = executedMigrations.map((m: any) => m.name);
    console.log(`✅ 이미 실행된 마이그레이션: ${executedNames.length}개`);

    // 실행되지 않은 마이그레이션 찾기
    const pendingMigrations = migrationFiles.filter(
      file => !executedNames.includes(file.replace('.js', ''))
    );

    if (pendingMigrations.length === 0) {
      console.log('\n✅ 모든 마이그레이션이 이미 실행되었습니다.');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`\n🔄 실행할 마이그레이션: ${pendingMigrations.length}개\n`);

    // 각 마이그레이션 실행
    for (const file of pendingMigrations) {
      try {
        console.log(`📦 실행 중: ${file}...`);
        const migration = require(join(migrationsPath, file));
        
        if (migration.up) {
          await migration.up(sequelize.getQueryInterface(), Sequelize);
          
          // 마이그레이션 기록
          const migrationName = file.replace('.js', '');
          await sequelize.query(
            `INSERT INTO "SequelizeMeta" (name) VALUES ('${migrationName}')`
          );
          
          console.log(`   ✅ 완료: ${file}\n`);
        } else {
          console.log(`   ⚠️  up 함수가 없습니다: ${file}\n`);
        }
      } catch (error: any) {
        console.error(`   ❌ 오류: ${file}`);
        console.error(`   ${error.message}\n`);
        throw error;
      }
    }

    console.log('🎉 모든 마이그레이션이 성공적으로 실행되었습니다!');
    await sequelize.close();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 마이그레이션 실행 실패:', error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigrations();
