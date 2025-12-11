const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/user.model');
const usersRouter = require('../routes/users.routes');
const jwt = require('jsonwebtoken');

// Create a test app
const app = express();
app.use(express.json());
app.use('/users', usersRouter);

let authToken;

// Connect to test database
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/comp229-test';
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  // Create an auth token for protected routes
  const testUserId = new mongoose.Types.ObjectId();
  authToken = jwt.sign(
    { userId: testUserId, email: 'test@example.com' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
});

// Clean up after all tests
afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
});

// Clean up before each test
beforeEach(async () => {
  await User.deleteMany({});
});

describe('Users CRUD Operations', () => {
  
  describe('CREATE - POST /users', () => {
    it('should create a new user successfully', async () => {
      const newUser = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/users')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.firstname).toBe('John');
      expect(response.body.lastname).toBe('Doe');
      expect(response.body.email).toBe('john@example.com');
      expect(response.body).toHaveProperty('created');
      expect(response.body).toHaveProperty('updated');
    });

    it('should fail to create user without required fields', async () => {
      const invalidUser = {
        firstname: 'John'
        // missing lastname, email, password
      };

      await request(app)
        .post('/users')
        .send(invalidUser)
        .expect(500); // MongoDB validation error
    });

    it('should fail to create user with duplicate email', async () => {
      const user1 = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      await request(app).post('/users').send(user1);

      const user2 = {
        firstname: 'Jane',
        lastname: 'Doe',
        email: 'john@example.com', // duplicate email
        password: 'password456'
      };

      await request(app)
        .post('/users')
        .send(user2)
        .expect(500); // Duplicate key error
    });
  });

  describe('READ - GET /users', () => {
    it('should get all users', async () => {
      const user1 = await User.create({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      });

      const user2 = await User.create({
        firstname: 'Jane',
        lastname: 'Doe',
        email: 'jane@example.com',
        password: 'password456'
      });

      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.some(u => u.email === 'john@example.com')).toBe(true);
      expect(response.body.some(u => u.email === 'jane@example.com')).toBe(true);
    });

    it('should return empty array when no users exist', async () => {
      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(response.body).toHaveLength(0);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get user by valid ID', async () => {
      const user = await User.create({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      });

      const response = await request(app)
        .get(`/users/${user._id}`)
        .expect(200);

      expect(response.body._id.toString()).toBe(user._id.toString());
      expect(response.body.firstname).toBe('John');
      expect(response.body.email).toBe('john@example.com');
    });

    it('should return 404 for non-existent user ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/users/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid user ID format', async () => {
      await request(app)
        .get('/users/invalid-id')
        .expect(400);
    });
  });

  describe('UPDATE - PUT /users/:id', () => {
    it('should update user successfully', async () => {
      const user = await User.create({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      });

      const updates = {
        firstname: 'Jonathan',
        lastname: 'Smith'
      };

      const response = await request(app)
        .put(`/users/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.firstname).toBe('Jonathan');
      expect(response.body.lastname).toBe('Smith');
      expect(response.body.email).toBe('john@example.com'); // unchanged
      expect(response.body.updated).not.toBe(user.updated); // should be newer
    });

    it('should update only specific fields', async () => {
      const user = await User.create({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      });

      const updates = {
        firstname: 'Jane'
      };

      const response = await request(app)
        .put(`/users/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.firstname).toBe('Jane');
      expect(response.body.lastname).toBe('Doe'); // unchanged
      expect(response.body.email).toBe('john@example.com'); // unchanged
    });

    it('should return 404 when updating non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .put(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstname: 'Test' })
        .expect(404);
    });

    it('should return 400 for invalid user ID format on update', async () => {
      await request(app)
        .put('/users/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstname: 'Test' })
        .expect(400);
    });

    it('should auto-update the updated timestamp', async () => {
      const user = await User.create({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      });

      const originalUpdated = user.updated;

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .put(`/users/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstname: 'Jane' })
        .expect(200);

      expect(new Date(response.body.updated).getTime()).toBeGreaterThan(
        new Date(originalUpdated).getTime()
      );
    });
  });

  describe('DELETE - DELETE /users/:id', () => {
    it('should delete user by ID', async () => {
      const user = await User.create({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      });

      const response = await request(app)
        .delete(`/users/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('User deleted');

      // Verify user is deleted
      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 when deleting non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 for invalid user ID format on delete', async () => {
      await request(app)
        .delete('/users/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should delete all users', async () => {
      await User.create({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      });

      await User.create({
        firstname: 'Jane',
        lastname: 'Doe',
        email: 'jane@example.com',
        password: 'password456'
      });

      const response = await request(app)
        .delete('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.deletedCount).toBe(2);

      // Verify all users are deleted
      const users = await User.find();
      expect(users).toHaveLength(0);
    });

    it('should return 0 deleted count when deleting from empty collection', async () => {
      const response = await request(app)
        .delete('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.deletedCount).toBe(0);
    });
  });
});
