const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// File Schema for files within folders
const FileSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  path: {
    type: String,
    default: ''
  },
  fullPath: {
    type: String
  },
  fileType: {
    type: String
  },
  fileSize: {
    type: Number
  },
  fileExtension: {
    type: String
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  // Store the file content as Buffer data or use GridFS for larger files
  data: {
    type: Buffer
  },
  // For cloud storage reference (optional)
  cloudStorageRef: {
    type: String
  }
});

// Main Resource Schema
const ResourceSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['file', 'folder', 'link'],
    required: true
  },
  description: {
    type: String
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  // For files
  fileType: {
    type: String
  },
  fileSize: {
    type: Number
  },
  fileExtension: {
    type: String
  },
  data: {
    type: Buffer
  },
  // For links
  url: {
    type: String
  },
  // For folders
  files: [FileSchema],
  // For parent-child relationships (nested folders)
  parentFolderId: {
    type: Schema.Types.ObjectId,
    ref: 'Resource',
    default: null
  }
}, {
  timestamps: true
});

// Create text indexes for search
ResourceSchema.index({
  name: 'text',
  description: 'text'
});

module.exports = mongoose.model('Resource', ResourceSchema); 