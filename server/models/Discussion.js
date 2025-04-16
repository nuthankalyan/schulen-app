const mongoose = require('mongoose');

const DiscussionSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    images: [{
        data: Buffer,
        contentType: String,
        filename: String
    }],
    author: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    tags: [{ 
        type: String,
        trim: true 
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    replies: [{
        content: { 
            type: String, 
            required: true 
        },
        images: [{
            data: Buffer,
            contentType: String,
            filename: String
        }],
        author: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User', 
            required: true 
        },
        createdAt: { 
            type: Date, 
            default: Date.now 
        }
    }]
});

const Discussion = mongoose.model('Discussion', DiscussionSchema);

module.exports = Discussion; 