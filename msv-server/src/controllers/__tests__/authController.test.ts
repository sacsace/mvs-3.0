// MVS 3.0 Backend Unit Test Example
// msv-server/src/controllers/__tests__/authController.test.ts

import request from 'supertest';
import { app } from '../../index';

describe('AuthController', () => {
  beforeAll(async () => {
    // Test database connection
    // await connectDB();
  });

  afterAll(async () => {
    // Close test database connection
    // await sequelize.close();
  });

  describe('POST /api/auth/login', () => {
    test('Valid user login success', async () => {
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

    test('Invalid user ID login failure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'invalid_user',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('Invalid password login failure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'admin',
          password: 'wrong_password'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('Missing required fields login failure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'admin'
          // password missing
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('Logout success', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'admin',
          password: 'password123'
        });

      const token = loginResponse.body.token;

      // Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });
  });

  describe('GET /api/auth/me', () => {
    test('Authenticated user info retrieval success', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          userid: 'admin',
          password: 'password123'
        });

      const token = loginResponse.body.token;

      // Get user info
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('userid', 'admin');
    });

    test('Unauthenticated user info retrieval failure', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
