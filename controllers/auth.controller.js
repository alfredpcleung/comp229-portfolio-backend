const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const createError = require('http-errors');

// POST signup - register new user
exports.signup = async (req, res, next) => {
  try {
    const { firstname, lastname, email, password } = req.body;

    // Validate required fields
    if (!firstname || !lastname || !email || !password) {
      return next(createError(400, 'All fields are required'));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createError(409, 'Email already registered'));
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = await User.create({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      created: new Date(),
      updated: new Date()
    });

    // Generate JWT token (24 hours expiration)
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return token and user info (exclude password)
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        _id: newUser._id,
        firstname: newUser.firstname,
        lastname: newUser.lastname,
        email: newUser.email,
        created: newUser.created
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST login - authenticate user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return next(createError(400, 'Email and password are required'));
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(createError(404, 'User not found'));
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next(createError(401, 'Invalid password'));
    }

    // Generate JWT token (24 hours expiration)
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return token and user info (exclude password)
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        created: user.created
      }
    });
  } catch (err) {
    next(err);
  }
};
