const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/user.model');
const authRouter = require('../routes/auth.routes');
const jwt = require('jsonwebtoken');

// Create a test app
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

// Connect to test database
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/comp229-test';
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
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

describe('Auth - Signup Route', () => {
  
  it('should signup a new user successfully', async () => {
    const newUser = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@example.com',
      password: 'password123'
    };

    const response = await request(app)
      .post('/auth/signup')
      .send(newUser)
      .expect(201);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('john@example.com');
    expect(response.body.user.firstname).toBe('John');
    expect(response.body.user.lastname).toBe('Doe');
    expect(response.body.user).not.toHaveProperty('password'); // password should not be returned
  });

  it('should hash the password before saving', async () => {
    const newUser = {
      firstname: 'Jane',
      lastname: 'Doe',
      email: 'jane@example.com',
      password: 'secretpassword'
    };

    await request(app)
      .post('/auth/signup')
      .send(newUser)
      .expect(201);

    const savedUser = await User.findOne({ email: 'jane@example.com' });
    expect(savedUser.password).not.toBe('secretpassword'); // password should be hashed
    expect(savedUser.password.length).toBeGreaterThan(20); // bcrypt hash is long
  });

  it('should return a valid JWT token', async () => {
    const newUser = {
      firstname: 'Bob',
      lastname: 'Smith',
      email: 'bob@example.com',
      password: 'password456'
    };

    const response = await request(app)
      .post('/auth/signup')
      .send(newUser)
      .expect(201);

    expect(response.body.token).toBeDefined();
    
    // Verify token can be decoded
    const decoded = jwt.verify(
      response.body.token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    expect(decoded.email).toBe('bob@example.com');
  });

  it('should fail with missing required fields', async () => {
    const incompleteUser = {
      firstname: 'John',
      lastname: 'Doe'
      // missing email and password
    };

    await request(app)
      .post('/auth/signup')
      .send(incompleteUser)
      .expect(400);
  });

  it('should fail when email already registered', async () => {
    const user1 = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'duplicate@example.com',
      password: 'password123'
    };

    // First signup
    await request(app)
      .post('/auth/signup')
      .send(user1)
      .expect(201);

    // Try to signup with same email
    const user2 = {
      firstname: 'Jane',
      lastname: 'Doe',
      email: 'duplicate@example.com',
      password: 'password456'
    };

    const response = await request(app)
      .post('/auth/signup')
      .send(user2)
      .expect(409);

    expect(response.status).toBe(409);
  });

  it('should create user with created and updated timestamps', async () => {
    const newUser = {
      firstname: 'Alice',
      lastname: 'Johnson',
      email: 'alice@example.com',
      password: 'password789'
    };

    const response = await request(app)
      .post('/auth/signup')
      .send(newUser)
      .expect(201);

    expect(response.body.user).toHaveProperty('created');
    expect(response.body.user.created).toBeDefined();
  });
});

describe('Auth - Login Route', () => {
  
  beforeEach(async () => {
    // Create a test user for login tests
    const user = {
      firstname: 'Test',
      lastname: 'User',
      email: 'test@example.com',
      password: 'testpassword123'
    };

    await request(app)
      .post('/auth/signup')
      .send(user);
  });

  it('should login successfully with correct credentials', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'testpassword123'
    };

    const response = await request(app)
      .post('/auth/login')
      .send(loginData)
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Login successful');
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.user.firstname).toBe('Test');
  });

  it('should return 404 for non-existent user', async () => {
    const loginData = {
      email: 'nonexistent@example.com',
      password: 'anypassword'
    };

    await request(app)
      .post('/auth/login')
      .send(loginData)
      .expect(404);
  });

  it('should return 401 for invalid password', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await request(app)
      .post('/auth/login')
      .send(loginData)
      .expect(401);
  });

  it('should fail with missing email', async () => {
    const loginData = {
      password: 'testpassword123'
    };

    await request(app)
      .post('/auth/login')
      .send(loginData)
      .expect(400);
  });

  it('should fail with missing password', async () => {
    const loginData = {
      email: 'test@example.com'
    };

    await request(app)
      .post('/auth/login')
      .send(loginData)
      .expect(400);
  });

  it('should return valid JWT token on successful login', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'testpassword123'
    };

    const response = await request(app)
      .post('/auth/login')
      .send(loginData)
      .expect(200);

    expect(response.body.token).toBeDefined();
    
    // Verify token can be decoded
    const decoded = jwt.verify(
      response.body.token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    expect(decoded.email).toBe('test@example.com');
  });

  it('should not return password in response', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'testpassword123'
    };

    const response = await request(app)
      .post('/auth/login')
      .send(loginData)
      .expect(200);

    expect(response.body.user).not.toHaveProperty('password');
  });
});
