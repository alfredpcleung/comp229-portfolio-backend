const User = require('../models/user.model');
const mongoose = require('mongoose');
const createError = require('http-errors');

// GET all
exports.getAll = async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) { next(err); }
};

// GET by ID
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(createError(400, 'Invalid ID format'));
    }
    const user = await User.findById(id);
    if (!user) return next(createError(404, 'User not found'));
    res.json(user);
  } catch (err) { next(err); }
};

// POST create
exports.create = async (req, res, next) => {
  try {
    // created and updated both set on creation
    const newUser = await User.create({
      ...req.body,
      created: new Date(),
      updated: new Date()
    });
    res.status(201).json(newUser);
  } catch (err) { next(err); }
};

// PUT update
exports.updateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(createError(400, 'Invalid ID format'));
    }
    // always refresh the updated field
    req.body.updated = new Date();
    const updated = await User.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return next(createError(404, 'User not found'));
    res.json(updated);
  } catch (err) { next(err); }
};

// DELETE by ID
exports.removeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(createError(400, 'Invalid ID format'));
    }
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return next(createError(404, 'User not found'));
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

// DELETE all
exports.removeAll = async (req, res, next) => {
  try {
    const result = await User.deleteMany({});
    res.json({ deletedCount: result.deletedCount });
  } catch (err) { next(err); }
};
