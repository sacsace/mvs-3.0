// MVS 3.0 성능 테스트 스크립트 (k6)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 커스텀 메트릭
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// 테스트 설정
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 20 }, // Sustained load
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate
  },
};

// 테스트 데이터
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const TEST_USER = {
  userid: 'testuser',
  password: 'TestPassword123!'
};

// 전역 변수
let authToken = null;

export function setup() {
  console.log('🚀 MVS 3.0 성능 테스트 시작');
  console.log(`대상 URL: ${BASE_URL}`);
  
  // 초기 인증
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginResponse.status === 200) {
    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.token;
    console.log('✅ 초기 인증 성공');
  } else {
    console.error('❌ 초기 인증 실패');
  }
  
  return { authToken };
}

export default function(data) {
  const scenarios = [
    healthCheck,
    userAuthentication,
    userManagement,
    menuManagement,
    databaseOperations
  ];
  
  // 랜덤 시나리오 선택
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
  
  sleep(1);
}

// 시나리오 1: 헬스체크
function healthCheck() {
  const response = http.get(`${BASE_URL}/health`);
  
  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

// 시나리오 2: 사용자 인증
function userAuthentication() {
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => JSON.parse(r.body).token !== undefined,
    'login response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  if (loginSuccess) {
    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.token;
    
    // 토큰 검증
    const verifyResponse = http.get(`${BASE_URL}/api/auth/verify`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    
    check(verifyResponse, {
      'token verification status is 200': (r) => r.status === 200,
      'token verification response time < 500ms': (r) => r.timings.duration < 500,
    });
  }
  
  errorRate.add(!loginSuccess);
  responseTime.add(loginResponse.timings.duration);
}

// 시나리오 3: 사용자 관리
function userManagement() {
  if (!authToken) return;
  
  // 사용자 목록 조회
  const listResponse = http.get(`${BASE_URL}/api/users`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  
  const listSuccess = check(listResponse, {
    'user list status is 200': (r) => r.status === 200,
    'user list response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  // 사용자 생성
  const randomId = Math.floor(Math.random() * 10000);
  const newUser = {
    userid: `perfuser${randomId}`,
    username: `Performance User ${randomId}`,
    email: `perf${randomId}@test.com`,
    password: 'TestPassword123!',
    role: 'user',
    department: 'Test',
    position: 'Tester'
  };
  
  const createResponse = http.post(`${BASE_URL}/api/users`, JSON.stringify(newUser), {
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
  });
  
  const createSuccess = check(createResponse, {
    'user creation status is 201': (r) => r.status === 201,
    'user creation response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!listSuccess || !createSuccess);
  responseTime.add(listResponse.timings.duration + createResponse.timings.duration);
}

// 시나리오 4: 메뉴 관리
function menuManagement() {
  if (!authToken) return;
  
  const response = http.get(`${BASE_URL}/api/menus`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  
  const success = check(response, {
    'menu list status is 200': (r) => r.status === 200,
    'menu list response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

// 시나리오 5: 데이터베이스 작업
function databaseOperations() {
  if (!authToken) return;
  
  const endpoints = ['/api/companies', '/api/tenants', '/api/partners'];
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const response = http.get(`${BASE_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  
  const success = check(response, {
    'database operation status is 200': (r) => r.status === 200,
    'database operation response time < 1500ms': (r) => r.timings.duration < 1500,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

export function teardown(data) {
  console.log('🏁 성능 테스트 완료');
  console.log('테스트 결과는 k6 메트릭으로 확인하세요.');
}
