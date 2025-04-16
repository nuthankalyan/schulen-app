// Load environment variables first
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('MongoDB URI:', process.env.MONGODB_URI); // Debug log
console.log('Current directory:', __dirname);

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const projectsRouter = require('./routes/projects');
const blogsRouter = require('./routes/blogs');
const communityRouter = require('./routes/community');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ['http://localhost:3000', 'https://schulen-app.onrender.com', 'https://schulen.tech', 'https://www.schulen.tech'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// Use CORS middleware
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000', 
            'https://schulen-app.onrender.com', 
            'https://schulen.tech', 
            'https://www.schulen.tech'
        ];
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization,Origin,Accept,X-Requested-With'
}));

// Set Content Security Policy
app.use((req, res, next) => {
    // Get the origin from request (for dev and prod environments)
    const origin = req.get('origin') || 'http://localhost:3000';
    
    // Allow both localhost and the deployment domain
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' data: blob: * http://localhost:* http://localhost:5000 https://schulen-app.onrender.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
    );
    
    // Set cross-origin headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    next();
});

app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Server is running' });
});

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

// Use blogs router
app.use('/blogs', blogsRouter);

// Use community router
app.use('/community', communityRouter);

// Serve manifest.json with proper CORS headers
app.get('/manifest.json', (req, res) => {
    try {
        // Return the manifest.json file
        res.sendFile('manifest.json', { root: __dirname + '/../public' });
    } catch (error) {
        console.error('Error serving manifest.json:', error);
        res.status(500).json({ message: 'Error serving manifest.json' });
    }
});

// Start the server with socket.io
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});