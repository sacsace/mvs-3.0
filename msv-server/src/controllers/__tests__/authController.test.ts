// MVS 3.0 백엔드 단위 테스트 예제
// msv-server/src/controllers/__tests__/authController.test.ts

import request from 'supertest';
import { app } from '../../index';
import { connectDB } from '../../models';

describe('AuthController', () => {
  beforeAll(async () => {
    // 테스트 데이터베이스 연결
    await connectDB();
  });

  afterAll(async () => {
    // 테스트 데이터베이스 연결 해제
    // await sequelize.close();
  });

  describe('POST /api/auth/login', () => {
    test('유효한 사용자 로그인 성공', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'admin',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('userid', 'admin');
    });

    test('잘못된 사용자 ID로 로그인 실패', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'invalid_user',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('잘못된 비밀번호로 로그인 실패', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'admin',
          password: 'wrong_password'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('필수 필드 누락 시 로그인 실패', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'admin'
          // password 누락
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('로그아웃 성공', async () => {
      // 먼저 로그인
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'admin',
          password: 'password123'
        });

      const token = loginResponse.body.token;

      // 로그아웃
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '로그아웃 성공');
    });
  });

  describe('GET /api/auth/me', () => {
    test('인증된 사용자 정보 조회 성공', async () => {
      // 먼저 로그인
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'admin',
          password: 'password123'
        });

      const token = loginResponse.body.token;

      // 사용자 정보 조회
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('userid', 'admin');
    });

    test('인증되지 않은 사용자 정보 조회 실패', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
