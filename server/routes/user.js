const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Middleware to authenticate user
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Access denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token', error: error.message });
    }
};

// Update user (username and/or password)
router.put('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;
    try {
        // Only allow user to update their own account
        if (req.user.userId !== id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        // Username uniqueness check
        if (username && username !== user.username) {
            const existing = await User.findOne({ username });
            if (existing) {
                return res.status(409).json({ message: 'Username already exists' });
            }
            user.username = username;
        }
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            user.password = hashed;
        }
        await user.save();
        res.json({ message: 'User updated', username: user.username });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
});

// Delete user
router.delete('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        // Only allow user to delete their own account
        if (req.user.userId !== id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});

// Search users by username (case-insensitive, partial match)
router.get('/search', authenticate, async (req, res) => {
    const { query } = req.query;
    if (!query || query.length < 2) {
        return res.json([]); // Require at least 2 chars for search
    }
    try {
        // Only return _id and username (add email if your model has it)
        const users = await User.find({
            username: { $regex: query, $options: 'i' }
        }).select('_id username');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error searching users', error: error.message });
    }
});

module.exports = router; 