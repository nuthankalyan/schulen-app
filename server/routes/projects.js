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

// Dashboard API - Get project dashboard data
router.get('/:id/dashboard', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has access to this project
        const isOwner = project.userId.toString() === userId;
        const isEnrolled = project.enrolledUsers.some(
            enrolledUserId => enrolledUserId.toString() === userId
        );

        if (!isOwner && !isEnrolled) {
            return res.status(403).json({ message: 'You do not have access to this project dashboard' });
        }

        // Get owner username
        const owner = await User.findById(project.userId);
        const ownerUsername = owner ? owner.username : 'Unknown';

        // Prepare dashboard data
        const dashboardData = {
            projectId: project._id,
            title: project.title,
            description: project.description,
            status: project.status,
            deadline: project.deadline,
            domain: project.domain,
            ownerUsername,
            tasks: project.tasks || [],
            contributions: project.contributions || [],
            resources: project.resources || [],
            messages: project.messages || []
        };

        res.status(200).json(dashboardData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard data', error });
    }
});

// Check if user has access to a project dashboard
router.get('/:id/access', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has access to this project
        const isOwner = project.userId.toString() === userId;
        const isEnrolled = project.enrolledUsers.some(
            enrolledUserId => enrolledUserId.toString() === userId
        );

        res.status(200).json({ hasAccess: isOwner || isEnrolled });
    } catch (error) {
        res.status(500).json({ message: 'Error checking project access', error });
    }
});

// Task API - Create a new task
router.post('/:id/tasks', authenticate, async (req, res) => {
    const { id } = req.params;
    const { title, description, assignee } = req.body;
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has access to this project
        const isOwner = project.userId.toString() === userId;
        const isEnrolled = project.enrolledUsers.some(
            enrolledUserId => enrolledUserId.toString() === userId
        );

        if (!isOwner && !isEnrolled) {
            return res.status(403).json({ message: 'You do not have permission to add tasks to this project' });
        }

        // Get username for activity log
        const user = await User.findById(userId);
        const username = user ? user.username : 'Unknown User';

        // Create new task
        const taskId = `task-${Date.now()}`;
        const newTask = {
            id: taskId,
            title,
            description,
            assignee,
            status: 'not-started',
            createdBy: username,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Update project with new task
        project.tasks = project.tasks || [];
        project.tasks.push(newTask);

        // Add activity for task creation
        project.activities.push({
            type: 'task_created',
            userId,
            username,
            details: `Created task: ${title}`,
            timestamp: new Date()
        });

        await project.save();

        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ message: 'Error creating task', error });
    }
});

// Task API - Update task status
router.patch('/:id/tasks/:taskId', authenticate, async (req, res) => {
    const { id, taskId } = req.params;
    const { status, title, description, assignee } = req.body;
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has access to this project
        const isOwner = project.userId.toString() === userId;
        const isEnrolled = project.enrolledUsers.some(
            enrolledUserId => enrolledUserId.toString() === userId
        );

        if (!isOwner && !isEnrolled) {
            return res.status(403).json({ message: 'You do not have permission to update tasks in this project' });
        }

        // Get username for activity log
        const user = await User.findById(userId);
        const username = user ? user.username : 'Unknown User';

        // Find the task
        const taskIndex = project.tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const task = project.tasks[taskIndex];
        const oldStatus = task.status;
        
        // Update task
        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (assignee !== undefined) task.assignee = assignee;
        if (status !== undefined) task.status = status;
        task.updatedAt = new Date();

        // Update contribution data if task is moved to completed
        if (status === 'completed' && oldStatus !== 'completed') {
            // Find or create contribution entry for assignee
            let contributionIndex = project.contributions.findIndex(
                contrib => contrib.username === task.assignee
            );
            
            if (contributionIndex === -1) {
                // Create new contribution entry with a unique color
                project.contributions.push({
                    username: task.assignee,
                    taskCount: 1,
                    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 65%)`
                });
            } else {
                // Increment existing contribution
                project.contributions[contributionIndex].taskCount += 1;
            }

            // Add activity for task completion
            project.activities.push({
                type: 'task_completed',
                userId,
                username,
                details: `Completed task: ${task.title}`,
                timestamp: new Date()
            });
        } 
        // Decrease contribution count if task is moved from completed to another status
        else if (status !== 'completed' && oldStatus === 'completed') {
            const contributionIndex = project.contributions.findIndex(
                contrib => contrib.username === task.assignee
            );
            
            if (contributionIndex !== -1) {
                project.contributions[contributionIndex].taskCount = 
                    Math.max(0, project.contributions[contributionIndex].taskCount - 1);
            }
        }

        // Add activity for task update
        if (status !== oldStatus) {
            project.activities.push({
                type: 'task_updated',
                userId,
                username,
                details: `Updated task status: ${task.title}`,
                oldValue: oldStatus,
                newValue: status,
                timestamp: new Date()
            });
        }

        await project.save();

        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task', error });
    }
});

// Task API - Delete task
router.delete('/:id/tasks/:taskId', authenticate, async (req, res) => {
    const { id, taskId } = req.params;
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has access to this project
        const isOwner = project.userId.toString() === userId;
        const isEnrolled = project.enrolledUsers.some(
            enrolledUserId => enrolledUserId.toString() === userId
        );

        if (!isOwner && !isEnrolled) {
            return res.status(403).json({ message: 'You do not have permission to delete tasks in this project' });
        }

        // Find the task
        const taskIndex = project.tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const task = project.tasks[taskIndex];

        // If task was completed, update contribution count
        if (task.status === 'completed') {
            const contributionIndex = project.contributions.findIndex(
                contrib => contrib.username === task.assignee
            );
            
            if (contributionIndex !== -1) {
                project.contributions[contributionIndex].taskCount = 
                    Math.max(0, project.contributions[contributionIndex].taskCount - 1);
            }
        }

        // Get username for activity log
        const user = await User.findById(userId);
        const username = user ? user.username : 'Unknown User';

        // Remove task
        project.tasks.splice(taskIndex, 1);

        // Add activity for task deletion
        project.activities.push({
            type: 'task_deleted',
            userId,
            username,
            details: `Deleted task: ${task.title}`,
            timestamp: new Date()
        });

        await project.save();

        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting task', error });
    }
});

// Message API - Send a message
router.post('/:id/messages', authenticate, async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has access to this project
        const isOwner = project.userId.toString() === userId;
        const isEnrolled = project.enrolledUsers.some(
            enrolledUserId => enrolledUserId.toString() === userId
        );

        if (!isOwner && !isEnrolled) {
            return res.status(403).json({ message: 'You do not have permission to send messages in this project' });
        }

        // Get username for the message
        const user = await User.findById(userId);
        const username = user ? user.username : 'Unknown User';

        // Create new message
        const newMessage = {
            sender: username,
            text,
            timestamp: new Date()
        };

        // Add message to project
        project.messages = project.messages || [];
        project.messages.push(newMessage);

        await project.save();

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error });
    }
});

// Resource API - Add a resource
router.post('/:id/resources', authenticate, async (req, res) => {
    const { id } = req.params;
    const { title, url, type } = req.body;
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has access to this project
        const isOwner = project.userId.toString() === userId;
        const isEnrolled = project.enrolledUsers.some(
            enrolledUserId => enrolledUserId.toString() === userId
        );

        if (!isOwner && !isEnrolled) {
            return res.status(403).json({ message: 'You do not have permission to add resources to this project' });
        }

        // Get username for the resource
        const user = await User.findById(userId);
        const username = user ? user.username : 'Unknown User';

        // Create new resource
        const newResource = {
            title,
            url,
            type,
            uploadedBy: username,
            uploadedAt: new Date()
        };

        // Add resource to project
        project.resources = project.resources || [];
        project.resources.push(newResource);

        await project.save();

        res.status(201).json(newResource);
    } catch (error) {
        res.status(500).json({ message: 'Error adding resource', error });
    }
});

// Direct Enrollment API - Add a user directly to enrolledUsers
router.post('/:id/directEnroll', authenticate, async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    const requestingUserId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if the requesting user is the project owner
        if (project.userId.toString() !== requestingUserId) {
            return res.status(403).json({ message: 'Only the project owner can directly enroll users' });
        }

        // Find the user to enroll
        const userToEnroll = await User.findById(userId);
        if (!userToEnroll) {
            return res.status(404).json({ message: 'User to enroll not found' });
        }

        // Check if user is already enrolled
        if (project.enrolledUsers.some(id => id.toString() === userId)) {
            return res.status(400).json({ message: 'User is already enrolled in this project' });
        }

        // Add user to enrolledUsers
        project.enrolledUsers.push(userId);
        
        // Add activity for direct enrollment
        project.activities.push({
            type: 'enrollment_accepted',
            userId: requestingUserId,
            username: userToEnroll.username,
            details: `${userToEnroll.username} was directly enrolled by project owner`,
            timestamp: new Date()
        });
        
        await project.save();

        res.status(200).json({ 
            message: 'User enrolled successfully',
            enrolledUsers: project.enrolledUsers
        });
    } catch (error) {
        res.status(500).json({ message: 'Error enrolling user', error });
    }
});

// Debug route to view enrolled users
router.get('/:id/enrolledUsers', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Get detailed information about enrolled users
        const enrolledUsersDetails = [];
        for (const enrolledUserId of project.enrolledUsers) {
            const user = await User.findById(enrolledUserId);
            if (user) {
                enrolledUsersDetails.push({
                    userId: user._id,
                    username: user.username
                });
            } else {
                enrolledUsersDetails.push({
                    userId: enrolledUserId,
                    username: 'Unknown User'
                });
            }
        }

        res.status(200).json({
            projectId: project._id,
            projectTitle: project.title,
            enrolledUsers: enrolledUsersDetails,
            enrolledUserIds: project.enrolledUsers.map(id => id.toString())
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching enrolled users', error });
    }
});

module.exports = router;