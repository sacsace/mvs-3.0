#!/usr/bin/env node

// MVS 3.0 통합 테스트 실행기

const { IntegrationTestSuite } = require('./test-setup');
const { execSync } = require('child_process');

// 명령행 인수 파싱
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose'),
  securityOnly: args.includes('--security-only'),
  help: args.includes('--help')
};

if (options.help) {
  console.log(`
MVS 3.0 통합 테스트 실행기

사용법:
  node run-integration-tests.js [옵션]

옵션:
  --verbose        상세한 로그 출력
  --security-only  보안 테스트만 실행
  --help          도움말 표시

예시:
  node run-integration-tests.js
  node run-integration-tests.js --verbose
  node run-integration-tests.js --security-only
`);
  process.exit(0);
}

// 테스트 실행
async function main() {
  console.log('🚀 MVS 3.0 통합 테스트 실행기 시작\n');

  try {
    // 환경 확인
    console.log('📋 환경 확인 중...');
    
    // Docker 서비스 확인
    try {
      execSync('docker-compose ps', { stdio: 'pipe' });
      console.log('✅ Docker Compose 서비스 실행 중');
    } catch (error) {
      console.error('❌ Docker Compose 서비스가 실행되지 않았습니다.');
      console.log('다음 명령어로 서비스를 시작하세요:');
      console.log('  docker-compose up -d');
      process.exit(1);
    }

    // Node.js 버전 확인
    const nodeVersion = process.version;
    console.log(`✅ Node.js 버전: ${nodeVersion}`);

    // 테스트 실행
    const testSuite = new IntegrationTestSuite();
    
    if (options.securityOnly) {
      console.log('🔒 보안 테스트만 실행합니다...\n');
      await testSuite.testSecurity();
    } else {
      console.log('🧪 전체 통합 테스트를 실행합니다...\n');
      await testSuite.runAllTests();
    }

    // 결과에 따른 종료 코드 설정
    if (testSuite.testResults.failed === 0) {
      console.log('\n🎉 모든 테스트가 성공적으로 완료되었습니다!');
      process.exit(0);
    } else {
      console.log('\n⚠️ 일부 테스트가 실패했습니다. 로그를 확인하세요.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ 테스트 실행 중 오류 발생:', error.message);
    if (options.verbose) {
      console.error('스택 트레이스:', error.stack);
    }
    process.exit(1);
  }
}

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('\n\n⚠️ 테스트가 중단되었습니다.');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ 예상치 못한 오류:', error.message);
  if (options.verbose) {
    console.error('스택 트레이스:', error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ 처리되지 않은 Promise 거부:', reason);
  if (options.verbose) {
    console.error('Promise:', promise);
  }
  process.exit(1);
});

// 메인 함수 실행
main().catch(error => {
  console.error('❌ 메인 함수 실행 중 오류:', error.message);
  process.exit(1);
});
