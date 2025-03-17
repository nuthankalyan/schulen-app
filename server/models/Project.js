const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    deadline: { type: String, required: true },
    domain: { type: String, required: true },
    status: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enrolledUsers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    enrollmentRequests: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requestDate: { type: Date, default: Date.now }
    }],
    maxTeamSize: { type: Number, default: 4 },
    viewCount: { type: Number, default: 0 },
    activities: [{
        type: { type: String, enum: ['status_change', 'enrollment_accepted', 'project_created', 'enrollment_request'] },
        timestamp: { type: Date, default: Date.now },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: { type: String },
        details: { type: String },
        oldValue: { type: String },
        newValue: { type: String }
    }]
});

const Project = mongoose.model('Project', ProjectSchema);

module.exports = Project;