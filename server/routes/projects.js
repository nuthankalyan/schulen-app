const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
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

// Enroll in a project
router.post('/:id/enroll', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        // Find the project
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if project is closed
        if (project.status === 'Closed') {
            return res.status(400).json({ message: 'Cannot enroll in a closed project' });
        }

        // Check if user is the owner
        if (project.userId.toString() === userId) {
            return res.status(400).json({ message: 'You cannot enroll in your own project' });
        }

        // Check if user is already enrolled
        if (project.enrolledUsers.includes(userId)) {
            return res.status(400).json({ message: 'You are already enrolled in this project' });
        }

        // Check if team is full
        if (project.enrolledUsers.length >= project.maxTeamSize) {
            return res.status(400).json({ message: 'Team is full' });
        }

        // Add user to enrolled users
        project.enrolledUsers.push(userId);
        await project.save();

        res.status(200).json({ 
            message: 'Successfully enrolled in project',
            enrolledUsers: project.enrolledUsers,
            isFull: project.enrolledUsers.length >= project.maxTeamSize
        });
    } catch (error) {
        res.status(500).json({ message: 'Error enrolling in project', error });
    }
});

// Get enrollment status for a project
router.get('/:id/enrollment', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isEnrolled = project.enrolledUsers.includes(userId);
        const isOwner = project.userId.toString() === userId;
        const isFull = project.enrolledUsers.length >= project.maxTeamSize;

        res.status(200).json({
            isEnrolled,
            isOwner,
            isFull,
            enrolledCount: project.enrolledUsers.length,
            maxTeamSize: project.maxTeamSize
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching enrollment status', error });
    }
});

// Get user's username by ID
router.get('/user/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ username: user.username });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error });
    }
});

module.exports = router;