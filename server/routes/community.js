const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const Discussion = require('../models/Discussion');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

// Set up multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'Access denied' });
    
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Get all discussions
router.get('/', authenticateToken, async (req, res) => {
    try {
        const discussions = await Discussion.find()
            .populate('author', 'username')
            .populate('replies.author', 'username')
            .sort({ createdAt: -1 });
        
        // Note: We don't return image data in the listing to keep response size small
        res.json(discussions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching discussions', error: error.message });
    }
});

// Get discussions by current user
router.get('/myposts', authenticateToken, async (req, res) => {
    try {
        const discussions = await Discussion.find({ author: req.user.userId })
            .populate('author', 'username')
            .populate('replies.author', 'username')
            .sort({ createdAt: -1 });
        
        res.json(discussions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching discussions', error: error.message });
    }
});

// Get a single discussion by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id)
            .populate('author', 'username')
            .populate('replies.author', 'username');
        
        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }
        
        res.json(discussion);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching discussion', error: error.message });
    }
});

// Get image by discussion ID and image index
router.get('/:id/images/:index', async (req, res) => {
    try {
        console.log(`Fetching image for discussion ${req.params.id} at index ${req.params.index}`);
        const discussion = await Discussion.findById(req.params.id);
        
        if (!discussion) {
            console.log(`Discussion not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Discussion not found' });
        }
        
        console.log(`Discussion found: ${discussion._id}, has ${discussion.images ? discussion.images.length : 0} images`);
        
        if (!discussion.images || discussion.images.length === 0) {
            console.log(`No images found in discussion: ${req.params.id}`);
            return res.status(404).json({ message: 'No images found in this discussion' });
        }
        
        const imageIndex = parseInt(req.params.index);
        
        if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= discussion.images.length) {
            console.log(`Invalid image index: ${req.params.index} (max: ${discussion.images.length - 1})`);
            return res.status(404).json({ message: 'Image not found at this index' });
        }
        
        const image = discussion.images[imageIndex];
        
        if (!image) {
            console.log(`Image object not found at index: ${imageIndex}`);
            return res.status(404).json({ message: 'Image object not found' });
        }
        
        if (!image.data) {
            console.log(`Image data is null or undefined at index: ${imageIndex}`);
            return res.status(404).json({ message: 'Image data not found' });
        }
        
        console.log(`Image found at index ${imageIndex}:
          - Content type: ${image.contentType}
          - Filename: ${image.filename}
          - Data buffer length: ${image.data ? image.data.length : 'N/A'} bytes`);
        
        // Set headers
        res.set('Content-Type', image.contentType);
        res.set('Cache-Control', 'public, max-age=31557600'); // Cache for a year
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', '*');
        
        // Send the raw buffer data
        res.send(image.data);
        console.log(`Image sent successfully for discussion ${req.params.id} at index ${imageIndex}`);
    } catch (error) {
        console.error('Error fetching image:', error);
        return res.status(500).json({ message: 'Error fetching image', error: error.message });
    }
});

// Get reply image by discussion ID, reply index, and image index
router.get('/:id/replies/:replyIndex/images/:imageIndex', async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);
        
        if (!discussion) {
            console.log(`Discussion not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Discussion not found' });
        }
        
        if (!discussion.replies || discussion.replies.length === 0) {
            console.log(`No replies found in discussion: ${req.params.id}`);
            return res.status(404).json({ message: 'No replies found in this discussion' });
        }
        
        const replyIndex = parseInt(req.params.replyIndex);
        
        if (isNaN(replyIndex) || replyIndex < 0 || replyIndex >= discussion.replies.length) {
            console.log(`Invalid reply index: ${req.params.replyIndex} (max: ${discussion.replies.length - 1})`);
            return res.status(404).json({ message: 'Reply not found at this index' });
        }
        
        const reply = discussion.replies[replyIndex];
        
        if (!reply.images || reply.images.length === 0) {
            console.log(`No images found in reply at index: ${replyIndex}`);
            return res.status(404).json({ message: 'No images found in this reply' });
        }
        
        const imageIndex = parseInt(req.params.imageIndex);
        
        if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= reply.images.length) {
            console.log(`Invalid image index: ${req.params.imageIndex} (max: ${reply.images.length - 1})`);
            return res.status(404).json({ message: 'Image not found at this index' });
        }
        
        const image = reply.images[imageIndex];
        
        if (!image || !image.data) {
            console.log(`Image data not found in reply ${replyIndex} at image index: ${imageIndex}`);
            return res.status(404).json({ message: 'Image data not found' });
        }
        
        // Set headers
        res.set('Content-Type', image.contentType);
        res.set('Cache-Control', 'public, max-age=31557600'); // Cache for a year
        
        // Send the raw buffer data
        res.send(image.data);
    } catch (error) {
        console.error('Error fetching reply image:', error);
        return res.status(500).json({ message: 'Error fetching image', error: error.message });
    }
});

// Create a new discussion with optional images
router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        
        console.log('Raw tags received:', tags);
        console.log('Tags type:', typeof tags);
        
        // Parse tags properly - handle both string and JSON string formats
        let parsedTags = [];
        if (tags) {
            try {
                // Try to parse as JSON first
                parsedTags = JSON.parse(tags);
                console.log('Successfully parsed tags as JSON:', parsedTags);
            } catch (e) {
                // If JSON parsing fails, fall back to comma-separated string
                parsedTags = tags.split(',').map(tag => tag.trim());
                console.log('Parsed tags as comma-separated string:', parsedTags);
            }
        }
        
        const newDiscussion = new Discussion({
            title,
            content,
            author: req.user.userId,
            tags: parsedTags
        });
        
        // Handle uploaded images
        if (req.files && req.files.length > 0) {
            console.log(`Processing ${req.files.length} uploaded images for new discussion`);
            
            newDiscussion.images = req.files.map(file => {
                console.log(`Processing file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size} bytes`);
                return {
                    data: file.buffer,
                    contentType: file.mimetype,
                    filename: file.originalname
                };
            });
        }
        
        const savedDiscussion = await newDiscussion.save();
        console.log(`Saved discussion with ID ${savedDiscussion._id}, has ${savedDiscussion.images ? savedDiscussion.images.length : 0} images`);
        console.log('Saved tags:', savedDiscussion.tags);
        
        const populatedDiscussion = await Discussion.findById(savedDiscussion._id)
            .populate('author', 'username');
        
        res.status(201).json(populatedDiscussion);
    } catch (error) {
        console.error('Error creating discussion:', error);
        res.status(400).json({ message: 'Error creating discussion', error: error.message });
    }
});

// Add a reply to a discussion with optional images
router.post('/:id/reply', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const { content } = req.body;
        
        const discussion = await Discussion.findById(req.params.id);
        
        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }
        
        const newReply = {
            content,
            author: req.user.userId
        };
        
        // Handle uploaded images
        if (req.files && req.files.length > 0) {
            console.log(`Processing ${req.files.length} uploaded images for reply to discussion ${req.params.id}`);
            
            newReply.images = req.files.map(file => {
                console.log(`Processing file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size} bytes`);
                return {
                    data: file.buffer,
                    contentType: file.mimetype,
                    filename: file.originalname
                };
            });
        }
        
        discussion.replies.push(newReply);
        
        await discussion.save();
        console.log(`Added reply to discussion ${req.params.id}, reply has ${newReply.images ? newReply.images.length : 0} images`);
        
        const updatedDiscussion = await Discussion.findById(req.params.id)
            .populate('author', 'username')
            .populate('replies.author', 'username');
        
        res.json(updatedDiscussion);
    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(400).json({ message: 'Error adding reply', error: error.message });
    }
});

// Diagnostic route to check image details
router.get('/:id/diagnose-image/:index', authenticateToken, async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);
        
        if (!discussion) {
            return res.json({ 
                status: 'error', 
                message: 'Discussion not found',
                discussionId: req.params.id
            });
        }
        
        const imageIndex = parseInt(req.params.index);
        
        if (!discussion.images) {
            return res.json({
                status: 'error',
                message: 'No images array in discussion',
                discussionId: req.params.id,
                hasImages: false
            });
        }
        
        if (discussion.images.length === 0) {
            return res.json({
                status: 'error',
                message: 'Images array is empty',
                discussionId: req.params.id,
                imagesCount: 0
            });
        }
        
        if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= discussion.images.length) {
            return res.json({
                status: 'error',
                message: 'Image index out of bounds',
                discussionId: req.params.id,
                requestedIndex: imageIndex,
                imagesCount: discussion.images.length,
                validIndices: Array.from({ length: discussion.images.length }, (_, i) => i)
            });
        }
        
        const image = discussion.images[imageIndex];
        
        if (!image) {
            return res.json({
                status: 'error',
                message: 'Image object is null or undefined',
                discussionId: req.params.id,
                index: imageIndex
            });
        }
        
        const imageStatus = {
            status: 'success',
            discussionId: req.params.id,
            index: imageIndex,
            contentType: image.contentType || 'none',
            filename: image.filename || 'none',
            hasData: !!image.data,
            dataLength: image.data ? image.data.length : 0,
            imagesCount: discussion.images.length
        };
        
        res.json(imageStatus);
    } catch (error) {
        console.error('Error diagnosing image:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Server error', 
            error: error.message 
        });
    }
});

module.exports = router; 