#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 MVS 3.0 데이터베이스 마이그레이션 시작...\n');

try {
  // 마이그레이션 실행
  console.log('📊 데이터베이스 마이그레이션 실행 중...');
  execSync('npx sequelize-cli db:migrate', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('\n✅ 데이터베이스 마이그레이션이 성공적으로 완료되었습니다!');
  
  // 시드 데이터 실행
  console.log('\n🌱 시드 데이터 삽입 중...');
  execSync('npx sequelize-cli db:seed:all', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('\n🎉 MVS 3.0 데이터베이스 설정이 완료되었습니다!');
  console.log('\n📋 생성된 테이블:');
  console.log('   - tenant (테넌트)');
  console.log('   - company (회사)');
  console.log('   - company_gst_number (회사 GST 번호)');
  console.log('   - user (사용자)');
  console.log('   - menu (메뉴)');
  console.log('   - user_menu_permission (사용자 메뉴 권한)');
  console.log('   - partner (파트너)');
  console.log('   - organization (조직도)');
  console.log('   - system_settings (시스템 설정)');
  console.log('   - attendance (근태)');
  console.log('   - payroll (급여)');
  console.log('   - project (프로젝트)');
  console.log('   - e_invoice (E-Invoice)');
  console.log('   - inventory (재고)');
  console.log('   - customer (고객)');
  console.log('   - notification (알림)');
  console.log('   - chat_room (채팅방)');
  console.log('   - chat_message (채팅 메시지)');
  console.log('   - system_log (시스템 로그)');
  console.log('\n🔗 총 19개의 핵심 테이블이 생성되었습니다.');

} catch (error) {
  console.error('\n❌ 마이그레이션 실행 중 오류가 발생했습니다:', error.message);
  process.exit(1);
}
