const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const projectsRouter = require('./routes/projects');
const User = require('./models/User');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ['http://localhost:3000', 'https://schulen-app.onrender.com', 'https://schulen.tech', 'https://www.schulen.tech/'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// CORS configuration
app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:3000', 'https://schulen-app.onrender.com', 'https://schulen.tech', 'https://www.schulen.tech/'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch((err) => console.error('MongoDB connection error:', err));

// Socket.io connection handling
const projectRooms = {};

io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Join a project room
    socket.on('joinProject', (projectId) => {
        socket.join(projectId);
        console.log(`User joined project room: ${projectId}`);
        
        // Initialize room if not exists
        if (!projectRooms[projectId]) {
            projectRooms[projectId] = {
                users: new Set()
            };
        }
    });
    
    // Handle chat messages
    socket.on('sendMessage', async (data) => {
        const { projectId, message, username } = data;
        
        try {
            // Save message to database
            if (projectId && message && username) {
                // Find the project
                const Project = mongoose.model('Project');
                const project = await Project.findById(projectId);
                
                if (project) {
                    // Add the message to the project
                    project.messages = project.messages || [];
                    const newMessage = {
                        sender: username,
                        text: message,
                        timestamp: new Date()
                    };
                    project.messages.push(newMessage);
                    await project.save();
                }
            }
            
            // Broadcast message to all users in the project room
            io.to(projectId).emit('newMessage', {
                sender: username,
                text: message,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });
    
    // Handle disconnections
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        // Clean up any user data if needed
    });
    
    // Leave project room
    socket.on('leaveProject', (projectId) => {
        socket.leave(projectId);
        console.log(`User left project room: ${projectId}`);
    });

    // Handle typing indicators
    socket.on('userTyping', (data) => {
        const { projectId, username } = data;
        
        if (!projectId || !username) return;
        
        // Broadcast to all users in the room except the sender
        socket.to(projectId).emit('userTyping', { username });
    });
});

// Signup route
app.post('/signup', async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error creating user', error });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, message: 'Login successful' });
});

// Use projects router
app.use('/browseprojects', projectsRouter);

// Start the server with socket.io
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});