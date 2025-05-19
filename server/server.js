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
const resourcesRouter = require('./routes/resources');
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
    origin: ['http://localhost:3000', 'https://schulen-app.onrender.com', 'https://schulen.tech', 'https://www.schulen.tech'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization,Origin,Accept,X-Requested-With'
}));

// Handle preflight OPTIONS requests globally
app.options('*', cors({
    origin: ['http://localhost:3000', 'https://schulen-app.onrender.com', 'https://schulen.tech', 'https://www.schulen.tech'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization,Origin,Accept,X-Requested-With'
}));

// Set Content Security Policy and CORS headers
app.use((req, res, next) => {
    // Get the origin from request
    const origin = req.headers.origin;
    const allowedOrigins = ['http://localhost:3000', 'https://schulen-app.onrender.com', 'https://schulen.tech', 'https://www.schulen.tech'];
    
    // Set the correct Access-Control-Allow-Origin header
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    }
    
    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Set Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' data: blob: * http://localhost:* https://schulen-app.onrender.com https://schulen-backend.onrender.com https://schulen.tech https://www.schulen.tech; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://schulen-backend.onrender.com https://schulen.tech https://www.schulen.tech;"
    );
    
    // Set Cross-Origin-Resource-Policy
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    next();
});

app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
    res.status(200).json({ mes: 'Server is running' });
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
const whiteboardRooms = {}; // Store whiteboard collaborators

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
    
    // Join a whiteboard room
    socket.on('joinWhiteboard', (data) => {
        const { projectId, username } = data;
        
        if (!projectId || !username) {
            console.error('Missing projectId or username in joinWhiteboard event');
            return;
        }
        
        // Create a specific room ID for this project's whiteboard
        const roomId = `whiteboard-${projectId}`;
        socket.join(roomId);
        console.log(`User ${username} joined whiteboard room: ${roomId}`);
        
        // Initialize whiteboard room if not exists
        if (!whiteboardRooms[roomId]) {
            whiteboardRooms[roomId] = {
                collaborators: new Set()
            };
        }
        
        // Add user to collaborators
        whiteboardRooms[roomId].collaborators.add(username);
        
        // Broadcast updated collaborator list to everyone in the room
        io.to(roomId).emit('whiteboardCollaborators', {
            collaborators: Array.from(whiteboardRooms[roomId].collaborators)
        });
    });
    
    // Handle whiteboard updates
    socket.on('whiteboardUpdate', (data) => {
        const { projectId, sender, elements } = data;
        
        if (!projectId || !sender) {
            console.error('Missing projectId or sender in whiteboardUpdate event');
            return;
        }
        
        const roomId = `whiteboard-${projectId}`;
        
        // Broadcast the update to all clients in the room except the sender
        socket.to(roomId).emit('whiteboardUpdate', {
            sender,
            elements
        });
    });
    
    // Leave whiteboard room
    socket.on('leaveWhiteboard', (data) => {
        const { projectId, username } = data;
        
        if (!projectId || !username) return;
        
        const roomId = `whiteboard-${projectId}`;
        socket.leave(roomId);
        console.log(`User ${username} left whiteboard room: ${roomId}`);
        
        // Remove user from collaborators
        if (whiteboardRooms[roomId] && whiteboardRooms[roomId].collaborators) {
            whiteboardRooms[roomId].collaborators.delete(username);
            
            // Broadcast updated collaborator list
            io.to(roomId).emit('whiteboardCollaborators', {
                collaborators: Array.from(whiteboardRooms[roomId].collaborators)
            });
            
            // Clean up if no more collaborators
            if (whiteboardRooms[roomId].collaborators.size === 0) {
                delete whiteboardRooms[roomId];
            }
        }
    });
    
    // Handle chat message
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
    
    // Handle meeting status updates
    socket.on('meetingStatusChanged', (data) => {
        try {
            const { projectId, active, creator, roomName } = data;
            
            if (!projectId) {
                console.error('Missing projectId in meetingStatusChanged event');
                return;
            }
            
            // Validate the active status is a boolean
            const meetingActive = !!active;
            
            // Broadcast meeting status change to all users in the project room
            socket.to(projectId).emit('meetingStatusChanged', {
                active: meetingActive,
                creator: meetingActive ? creator : null,
                roomName: meetingActive ? roomName : null
            });
            
            console.log(`Meeting status changed in project ${projectId}: active=${meetingActive}, creator=${creator || 'none'}, room=${roomName || 'none'}`);
        } catch (error) {
            console.error('Error handling meetingStatusChanged event:', error);
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

// Handle OPTIONS preflight request for login route specifically
app.options('/login', (req, res) => {
    const origin = req.headers.origin;
    const allowedOrigins = ['http://localhost:3000', 'https://schulen-app.onrender.com', 'https://schulen.tech', 'https://www.schulen.tech'];
    
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    }
    
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).end();
});

// Login route with explicit CORS handling
app.post('/login', async (req, res) => {
    // Set CORS headers for login specifically
    const origin = req.headers.origin;
    const allowedOrigins = ['http://localhost:3000', 'https://schulen-app.onrender.com', 'https://schulen.tech', 'https://www.schulen.tech'];
    
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    }
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    const { username, password } = req.body;
    
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, userId: user._id, message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Use projects router
app.use('/browseprojects', projectsRouter);

// Use blogs router
app.use('/blogs', blogsRouter);

// Use community router
app.use('/community', communityRouter);

// Mount resources router at multiple paths
app.use('/api', resourcesRouter);
app.use('/', resourcesRouter); // This will make /resources and /browseprojects/*/resources paths directly available

// Handle OPTIONS requests for manifest.json (CORS preflight)
app.options('/manifest.json', (req, res) => {
    const origin = req.headers.origin;
    const allowedOrigins = ['http://localhost:3000', 'https://schulen-app.onrender.com', 'https://schulen.tech', 'https://www.schulen.tech'];
    
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).end();
});

// Serve manifest.json with proper CORS headers
app.get('/manifest.json', (req, res) => {
    try {
        // Set explicit CORS headers for the manifest.json file
        const origin = req.headers.origin;
        const allowedOrigins = ['http://localhost:3000', 'https://schulen-app.onrender.com', 'https://schulen.tech', 'https://www.schulen.tech'];
        
        if (origin && allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        } else {
            res.header('Access-Control-Allow-Origin', '*');
        }
        
        res.header('Access-Control-Allow-Methods', 'GET');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept');
        res.header('Cross-Origin-Resource-Policy', 'cross-origin');
        
        // Return the manifest.json file
        res.sendFile(path.join(__dirname, '../public/manifest.json'));
    } catch (error) {
        console.error('Error serving manifest.json:', error);
        res.status(500).json({ message: 'Error serving manifest.json' });
    }
});

// Additional endpoint to serve manifest directly from public
app.get('/public/manifest.json', (req, res) => {
    // Set explicit CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Content-Type', 'application/json');
    
    // Return the manifest.json file from public
    try {
        res.sendFile(path.join(__dirname, '../public/manifest.json'));
    } catch (error) {
        console.error('Error serving manifest.json from public folder:', error);
        res.status(500).json({ message: 'Error serving manifest.json' });
    }
});

// Serve static files from the public directory with CORS headers
app.use(express.static(path.join(__dirname, '../build'), {
    setHeaders: function (res, filePath, stat) {
        // Add appropriate headers for manifest.json and other important static files
        if (path.extname(filePath) === '.json' || filePath.includes('manifest.json')) {
            // For manifest.json and other JSON files
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');
        } else if (path.extname(filePath) === '.js') {
            // For JavaScript files
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        } else if (path.extname(filePath) === '.css') {
            // For CSS files
            res.setHeader('Content-Type', 'text/css');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        }
    }
}));

// Catch-all route for React's client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
});

// Start the server with socket.io
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});