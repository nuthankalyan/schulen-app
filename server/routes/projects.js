const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret'; // Replace with your own secret

// Middleware to authenticate user
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Get all projects (No authentication required)
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching projects', error });
    }
});

// Get a specific project (No authentication required)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching project', error });
    }
});

// Create a new project
router.post('/', authenticate, async (req, res) => {
    const { title, description, deadline, domain, status } = req.body;

    try {
        const newProject = new Project({ title, description, deadline, domain, status, userId: req.user.userId });
        await newProject.save();
        res.status(201).json(newProject);
    } catch (error) {
        res.status(400).json({ message: 'Enter Valid details', error });
    }
});

// Update project status
router.patch('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const project = await Project.findOneAndUpdate({ _id: id, userId: req.user.userId }, { status }, { new: true });
        if (!project) {
            return res.status(404).json({ message: 'Project not found or you do not have permission to update this project' });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error updating project status', error });
    }
});

// Delete a project
router.delete('/:id', authenticate, async (req, res) => {
    const { id } = req.params;

    try {
        const project = await Project.findOneAndDelete({ _id: id, userId: req.user.userId });
        if (!project) {
            return res.status(404).json({ message: 'Project not found or you do not have permission to delete this project' });
        }
        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting project', error });
    }
});

module.exports = router;