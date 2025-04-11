const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const auth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        console.log('Auth header:', authHeader);
        
        if (!authHeader) {
            return res.status(401).json({ message: 'No Authorization header provided' });
        }
        
        const token = authHeader.replace('Bearer ', '');
        console.log('Token:', token);
        
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);
        
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Authentication failed', error: error.message });
    }
};

// Get all blogs
router.get('/', async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 }).populate('author', 'username');
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching blogs', error });
    }
});

// Get a specific blog
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).populate('author', 'username');
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json(blog);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching blog', error });
    }
});

// Create a new blog (protected route)
router.post('/', auth, async (req, res) => {
    try {
        console.log('Creating new blog, request body:', req.body);
        console.log('User ID from token:', req.userId);
        
        const { title, caption, content } = req.body;
        
        if (!title || !caption || !content) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                provided: { 
                    title: !!title, 
                    caption: !!caption, 
                    content: !!content 
                }
            });
        }
        
        const blog = new Blog({
            title,
            caption,
            content,
            author: req.userId
        });
        
        console.log('Blog object created:', blog);
        
        await blog.save();
        console.log('Blog saved successfully');
        
        res.status(201).json(blog);
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(400).json({ message: 'Error creating blog', error: error.message });
    }
});

// Update a blog (protected route)
router.put('/:id', auth, async (req, res) => {
    try {
        const { title, caption, content } = req.body;
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        
        // Check if user is the author
        if (blog.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to update this blog' });
        }
        
        blog.title = title;
        blog.caption = caption;
        blog.content = content;
        
        await blog.save();
        res.json(blog);
    } catch (error) {
        res.status(400).json({ message: 'Error updating blog', error });
    }
});

// Delete a blog (protected route)
router.delete('/:id', auth, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        
        // Check if user is the author
        if (blog.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this blog' });
        }
        
        await Blog.deleteOne({ _id: req.params.id });
        res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting blog', error });
    }
});

module.exports = router; 