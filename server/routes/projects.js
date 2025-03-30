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
        // Get username for activity log
        const user = await User.findById(req.user.userId);
        const username = user ? user.username : 'Unknown User';

        const newProject = new Project({ 
            title, 
            description, 
            deadline, 
            domain, 
            status, 
            userId: req.user.userId,
            activities: [{
                type: 'project_created',
                userId: req.user.userId,
                username: username,
                details: 'Project was created',
                timestamp: new Date()
            }]
        });
        
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
        const project = await Project.findOne({ _id: id, userId: req.user.userId });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found or you do not have permission to update this project' });
        }
        
        // Get username for activity log
        const user = await User.findById(req.user.userId);
        const username = user ? user.username : 'Unknown User';
        
        // Add activity for status change
        project.activities.push({
            type: 'status_change',
            userId: req.user.userId,
            username: username,
            details: 'Project status was updated',
            oldValue: project.status,
            newValue: status,
            timestamp: new Date()
        });
        
        // Update status
        project.status = status;
        await project.save();
        
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

// Enroll in a project (now creates a request)
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

        // Check if user already has a pending request
        const existingRequest = project.enrollmentRequests.find(
            request => request.userId.toString() === userId
        );
        
        if (existingRequest) {
            return res.status(400).json({ message: 'You already have a pending enrollment request' });
        }

        // Check if team is full
        if (project.enrolledUsers.length >= project.maxTeamSize) {
            return res.status(400).json({ message: 'Team is full' });
        }

        // Get username for activity log
        const user = await User.findById(userId);
        const username = user ? user.username : 'Unknown User';

        // Add enrollment request
        project.enrollmentRequests.push({ userId });
        
        // Add activity for enrollment request
        project.activities.push({
            type: 'enrollment_request',
            userId: userId,
            username: username,
            details: 'Requested to join the project',
            timestamp: new Date()
        });
        
        await project.save();

        res.status(200).json({ 
            message: 'Enrollment request sent successfully',
            requestId: project.enrollmentRequests[project.enrollmentRequests.length - 1]._id
        });
    } catch (error) {
        res.status(500).json({ message: 'Error sending enrollment request', error });
    }
});

// Get enrollment requests for a project (owner only)
router.get('/:id/requests', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user is the owner
        if (project.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Only the project owner can view enrollment requests' });
        }

        // Populate user details for each request
        const populatedProject = await Project.findById(id).populate({
            path: 'enrollmentRequests.userId',
            select: 'username'
        });

        const requests = populatedProject.enrollmentRequests.map(request => ({
            requestId: request._id,
            userId: request.userId._id,
            username: request.userId.username,
            requestDate: request.requestDate
        }));

        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching enrollment requests', error });
    }
});

// Approve or reject an enrollment request
router.patch('/:id/requests/:requestId', authenticate, async (req, res) => {
    const { id, requestId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user is the owner
        if (project.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Only the project owner can approve or reject requests' });
        }

        // Find the request
        const requestIndex = project.enrollmentRequests.findIndex(
            request => request._id.toString() === requestId
        );

        if (requestIndex === -1) {
            return res.status(404).json({ message: 'Enrollment request not found' });
        }

        const request = project.enrollmentRequests[requestIndex];
        
        // Get username of the requester for activity log
        const requester = await User.findById(request.userId);
        const requesterUsername = requester ? requester.username : 'Unknown User';
        
        // Get username of the owner for activity log
        const owner = await User.findById(userId);
        const ownerUsername = owner ? owner.username : 'Unknown User';

        if (action === 'approve') {
            // Check if team is full
            if (project.enrolledUsers.length >= project.maxTeamSize) {
                return res.status(400).json({ message: 'Team is full' });
            }

            // Add user to enrolled users
            project.enrolledUsers.push(request.userId);
            
            // Add activity for enrollment acceptance
            project.activities.push({
                type: 'enrollment_accepted',
                userId: userId, // Owner who accepted
                username: ownerUsername,
                details: `Accepted enrollment request from ${requesterUsername}`,
                timestamp: new Date()
            });
        }

        // Remove the request
        project.enrollmentRequests.splice(requestIndex, 1);
        await project.save();

        res.status(200).json({ 
            message: action === 'approve' ? 'Enrollment request approved' : 'Enrollment request rejected',
            enrolledUsers: project.enrolledUsers,
            isFull: project.enrolledUsers.length >= project.maxTeamSize
        });
    } catch (error) {
        res.status(500).json({ message: 'Error processing enrollment request', error });
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

        const isEnrolled = project.enrolledUsers.some(id => id.toString() === userId);
        const isOwner = project.userId.toString() === userId;
        const isFull = project.enrolledUsers.length >= project.maxTeamSize;
        const hasPendingRequest = project.enrollmentRequests.some(
            request => request.userId.toString() === userId
        );
        const requestCount = isOwner ? project.enrollmentRequests.length : 0;

        res.status(200).json({
            isEnrolled,
            isOwner,
            isFull,
            hasPendingRequest,
            requestCount,
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

// Get user's ID by username
router.get('/user/byUsername/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ userId: user._id });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user ID', error });
    }
});

// Get recommended projects based on domain (excluding current project and user's own projects)
router.get('/:id/recommended', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        // Get the current project to find its domain
        const currentProject = await Project.findById(id);
        
        if (!currentProject) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Find projects with the same domain, excluding the current project and user's own projects
        const recommendedProjects = await Project.find({
            _id: { $ne: id },
            userId: { $ne: userId },
            domain: currentProject.domain,
            status: { $ne: 'Closed' } // Optionally exclude closed projects
        }).limit(5); // Limit to 5 recommended projects

        res.json(recommendedProjects);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recommended projects', error });
    }
});

// Get project activities
router.get('/:id/activities', async (req, res) => {
    const { id } = req.params;
    
    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        
        // Sort activities by timestamp (newest first)
        const activities = project.activities.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        res.json(activities);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching project activities', error });
    }
});

// Increment project view count
router.post('/:id/view', async (req, res) => {
    const { id } = req.params;
    
    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        
        // Initialize viewCount if it doesn't exist
        if (!project.viewCount) {
            project.viewCount = 0;
        }
        
        // Increment view count
        project.viewCount += 1;
        
        await project.save();
        
        res.status(200).json({ 
            message: 'View count incremented successfully',
            viewCount: project.viewCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error incrementing view count', error });
    }
});

// Check if user has access to project dashboard (owner or enrolled)
router.get('/:id/access', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        // Find the project
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user is the owner
        const isOwner = project.userId.toString() === userId;
        
        // Check if user is enrolled
        let isEnrolled = false;
        
        // Check if enrolled as userId
        if (project.enrolledUsers && project.enrolledUsers.length > 0) {
            isEnrolled = project.enrolledUsers.some(enrolledUserId => 
                enrolledUserId.toString() === userId
            );
        }
        
        // Check legacy enrollments
        if (!isEnrolled && project.enrollments && Array.isArray(project.enrollments)) {
            // Get user to check username
            const user = await User.findById(userId);
            const username = user ? user.username : null;
            
            if (username && project.enrollments.some(enrollment => 
                enrollment.username === username && enrollment.status === 'accepted'
            )) {
                isEnrolled = true;
            }
        }
        
        // Return access status
        res.json({ 
            hasAccess: isOwner || isEnrolled,
            isOwner,
            isEnrolled
        });
    } catch (error) {
        res.status(500).json({ message: 'Error checking project access', error });
    }
});

module.exports = router;