import { config } from 'dotenv';
import { ENV_CONFIG, SYSTEM_CONSTANTS } from './constants';

// 환경 변수 로드
config();

// 필수 환경 변수 검증
const requiredEnvVars = [
  'DB_HOST',
  'DB_NAME', 
  'DB_USER',
  'DB_PASSWORD'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ 필수 환경 변수가 누락되었습니다:', missingVars.join(', '));
  console.error('💡 .env 파일을 확인하거나 환경 변수를 설정해주세요.');
  process.exit(1);
}

// 환경별 설정 가져오기
const currentEnv = process.env.NODE_ENV || 'development';
const envConfig = ENV_CONFIG[currentEnv as keyof typeof ENV_CONFIG];

// 환경 변수 검증 및 기본값 설정
export const env = {
  // 서버 설정
  NODE_ENV: currentEnv,
  PORT: parseInt(process.env.PORT || SYSTEM_CONSTANTS.DEFAULT_PORT.toString()),
  
  // 데이터베이스 설정
  DB_HOST: process.env.DB_HOST || envConfig.DB_HOST,
  DB_PORT: parseInt(process.env.DB_PORT || envConfig.DB_PORT.toString()),
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  
  // CORS 설정
  CORS_ORIGIN: process.env.CORS_ORIGIN || envConfig.CORS_ORIGIN,
  
  // 보안 설정
  JWT_SECRET: process.env.JWT_SECRET || SYSTEM_CONSTANTS.JWT.SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET || SYSTEM_CONSTANTS.SESSION.SECRET,
  
  // 외부 서비스
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  
  // 로깅
  LOG_LEVEL: process.env.LOG_LEVEL || envConfig.LOG_LEVEL,
  
  // 파일 업로드
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || SYSTEM_CONSTANTS.UPLOAD.MAX_FILE_SIZE,
  
  // 알림 설정
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  
  // SMS 설정
  SMS_API_KEY: process.env.SMS_API_KEY,
  SMS_API_SECRET: process.env.SMS_API_SECRET,
  
  // AI 서비스
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // 모니터링
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  HEALTH_CHECK_TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000')
};

// 환경 변수 검증 함수
export const validateEnv = () => {
  const errors: string[] = [];
  
  // 포트 번호 검증
  if (env.PORT < 1 || env.PORT > 65535) {
    errors.push('PORT는 1-65535 범위여야 합니다.');
  }
  
  // 데이터베이스 포트 검증
  if (env.DB_PORT < 1 || env.DB_PORT > 65535) {
    errors.push('DB_PORT는 1-65535 범위여야 합니다.');
  }
  
  // JWT 시크릿 검증
  if (env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET은 최소 32자 이상이어야 합니다.');
  }
  
  // 프로덕션 환경에서 추가 검증
  if (env.NODE_ENV === 'production') {
    if (env.CORS_ORIGIN === 'http://localhost:3000') {
      errors.push('프로덕션 환경에서는 CORS_ORIGIN을 localhost로 설정하면 안됩니다.');
    }
    
    if (env.JWT_SECRET === SYSTEM_CONSTANTS.JWT.SECRET) {
      errors.push('프로덕션 환경에서는 기본 JWT_SECRET을 사용하면 안됩니다.');
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ 환경 변수 검증 실패:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  console.log('✅ 환경 변수 검증 완료');
};

// 환경 정보 출력
export const printEnvInfo = () => {
  console.log('🔧 환경 설정 정보:');
  console.log(`  - 환경: ${env.NODE_ENV}`);
  console.log(`  - 포트: ${env.PORT}`);
  console.log(`  - DB 호스트: ${env.DB_HOST}:${env.DB_PORT}`);
  console.log(`  - CORS Origin: ${env.CORS_ORIGIN}`);
  console.log(`  - 로그 레벨: ${env.LOG_LEVEL}`);
};
