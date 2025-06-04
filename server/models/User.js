const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    email: { type: String },
    age: { type: Number },
    photo: { type: String }, // Store photo as base64 string or URL
    rating: { type: Number, default: 0 },
    techStack: { type: String },
    enrolledProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }]
});

const User = mongoose.model('User', UserSchema);

module.exports = User;