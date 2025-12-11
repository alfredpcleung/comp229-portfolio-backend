const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/user.model');
const authRouter = require('../routes/auth.routes');
const usersRouter = require('../routes/users.routes');
const jwt = require('jsonwebtoken');

// Create a test app
const app = express();
app.use(express.json());
app.use('/auth', authRouter);
app.use('/users', usersRouter);

let validToken;
let expiredToken;

// Connect to test database
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/comp229-test';
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  // Create a test user
  const user = await User.create({
    firstname: 'Auth',
    lastname: 'Test',
    email: 'authtest@example.com',
    password: 'hashedpassword'
  });

  // Generate valid token
  validToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  // Generate expired token (with 0 expiration)
  expiredToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '-1s' }
  );
});

// Clean up after all tests
afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe('Auth Middleware - JWT Verification', () => {
  
  describe('Missing/Invalid Authorization Header', () => {
    it('should return 401 when Authorization header is missing', async () => {
      await request(app)
        .put('/users/123456789012345678901234')
        .expect(401);
    });

    it('should return 401 for invalid Bearer format (no Bearer prefix)', async () => {
      await request(app)
        .put('/users/123456789012345678901234')
        .set('Authorization', `${validToken}`)
        .expect(401);
    });

    it('should return 401 for invalid Bearer format (extra parts)', async () => {
      await request(app)
        .put('/users/123456789012345678901234')
        .set('Authorization', `Bearer ${validToken} extra`)
        .expect(401);
    });

    it('should return 401 for malformed token', async () => {
      await request(app)
        .put('/users/123456789012345678901234')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  describe('Token Validation', () => {
    it('should return 401 for expired token', async () => {
      await request(app)
        .put('/users/123456789012345678901234')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should allow request with valid token', async () => {
      const user = await User.findOne({ email: 'authtest@example.com' });
      
      const response = await request(app)
        .put(`/users/${user._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ firstname: 'Updated' });

      // Should not return 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('Protected Routes', () => {
    it('should deny PUT /users/:id without token', async () => {
      await request(app)
        .put('/users/123456789012345678901234')
        .expect(401);
    });

    it('should deny DELETE /users/:id without token', async () => {
      await request(app)
        .delete('/users/123456789012345678901234')
        .expect(401);
    });

    it('should deny DELETE /users without token', async () => {
      await request(app)
        .delete('/users')
        .expect(401);
    });

    it('should allow GET /users without token', async () => {
      const response = await request(app)
        .get('/users');

      // Should not return 401
      expect(response.status).not.toBe(401);
    });

    it('should allow GET /users/:id without token', async () => {
      const user = await User.findOne({ email: 'authtest@example.com' });
      
      const response = await request(app)
        .get(`/users/${user._id}`);

      // Should not return 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('User Data Attachment', () => {
    it('should attach userId and email to req.user', async () => {
      const user = await User.findOne({ email: 'authtest@example.com' });

      // Make a request to a protected route
      const response = await request(app)
        .put(`/users/${user._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ firstname: 'NewName' });

      // The update should succeed, indicating middleware passed req.user correctly
      expect(response.status).not.toBe(401);
      expect(response.body).toHaveProperty('_id');
    });
  });

  describe('Bearer Token Case Sensitivity', () => {
    it('should accept "Bearer" with capital B', async () => {
      const user = await User.findOne({ email: 'authtest@example.com' });

      const response = await request(app)
        .put(`/users/${user._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ firstname: 'Test' });

      expect(response.status).not.toBe(401);
    });

    it('should reject "bearer" with lowercase b', async () => {
      const user = await User.findOne({ email: 'authtest@example.com' });

      await request(app)
        .put(`/users/${user._id}`)
        .set('Authorization', `bearer ${validToken}`)
        .expect(401);
    });
  });
});
