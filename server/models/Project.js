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
    maxTeamSize: { type: Number, default: 4 }
});

const Project = mongoose.model('Project', ProjectSchema);

module.exports = Project;