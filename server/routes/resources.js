const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
  }
});

// Get all resources for a project
router.get('/browseprojects/:projectId/resources', auth, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    // Find all resources for this project
    const resources = await Resource.find({ projectId });
    
    // Don't send file data in the list view for performance
    const sanitizedResources = resources.map(resource => {
      const resourceObj = resource.toObject();
      // Remove large data fields from the response
      if (resourceObj.data) {
        delete resourceObj.data;
      }
      if (resourceObj.files) {
        resourceObj.files = resourceObj.files.map(file => {
          const fileObj = { ...file };
          if (fileObj.data) {
            delete fileObj.data;
          }
          return fileObj;
        });
      }
      return resourceObj;
    });

    res.json(sanitizedResources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific resource
router.get('/resources/:resourceId', auth, async (req, res) => {
  try {
    const { resourceId } = req.params;

    // Validate resourceId
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.json(resource);
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Download a file
router.get('/resources/:resourceId/download', auth, async (req, res) => {
  try {
    const { resourceId } = req.params;
    
    // Log request details for debugging
    console.log(`Download request for resource ${resourceId}`);
    console.log(`Authorization header: ${req.headers.authorization ? 'Present' : 'Missing'}`);

    // Validate resourceId
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (resource.type !== 'file') {
      return res.status(400).json({ message: 'Resource is not a file' });
    }

    // Set headers for file download
    res.set({
      'Content-Type': resource.fileType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${resource.name}"`,
      'Content-Length': resource.fileSize
    });

    // Send the file data
    res.send(resource.data);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new resource (file upload)
router.post('/browseprojects/:projectId/resources/file', auth, upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;
    const file = req.file;

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    // Check if file was uploaded
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get file extension
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);

    // Create a new resource
    const newResource = new Resource({
      name: name || file.originalname,
      type: 'file',
      description,
      projectId,
      uploadedBy: req.user.username || 'Anonymous',
      fileType: file.mimetype,
      fileSize: file.size,
      fileExtension,
      data: file.buffer
    });

    await newResource.save();

    // Don't send file data back in the response
    const responseResource = newResource.toObject();
    delete responseResource.data;

    res.status(201).json(responseResource);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new folder
router.post('/browseprojects/:projectId/resources/folder', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, parentFolderId } = req.body;

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    // Validate parent folder if provided
    if (parentFolderId && !mongoose.Types.ObjectId.isValid(parentFolderId)) {
      return res.status(400).json({ message: 'Invalid parent folder ID' });
    }

    // Create a new folder resource
    const newFolder = new Resource({
      name,
      type: 'folder',
      description,
      projectId,
      uploadedBy: req.user.username || 'Anonymous',
      parentFolderId: parentFolderId || null,
      files: []
    });

    await newFolder.save();

    res.status(201).json(newFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new link resource
router.post('/browseprojects/:projectId/resources/link', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, url } = req.body;

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    // Validate URL
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    // Create a new link resource
    const newLink = new Resource({
      name,
      type: 'link',
      description,
      projectId,
      uploadedBy: req.user.username || 'Anonymous',
      url
    });

    await newLink.save();

    res.status(201).json(newLink);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a resource (rename)
router.put('/resources/:resourceId', auth, async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { name, description } = req.body;

    // Validate resourceId
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Update resource fields
    if (name) resource.name = name;
    if (description !== undefined) resource.description = description;

    await resource.save();

    // Don't send file data back in the response
    const responseResource = resource.toObject();
    if (responseResource.data) {
      delete responseResource.data;
    }

    res.json(responseResource);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a resource
router.delete('/resources/:resourceId', auth, async (req, res) => {
  try {
    const { resourceId } = req.params;

    // Validate resourceId
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // If it's a folder, delete all resources that have this folder as parent
    if (resource.type === 'folder') {
      await Resource.deleteMany({ parentFolderId: resourceId });
    }

    // Delete the resource
    await Resource.findByIdAndDelete(resourceId);

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload a file to a folder
router.post('/resources/:folderId/files', auth, upload.single('file'), async (req, res) => {
  try {
    const { folderId } = req.params;
    const { folderPath } = req.body;
    const file = req.file;

    // Validate folderId
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: 'Invalid folder ID' });
    }

    // Check if file was uploaded
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const folder = await Resource.findById(folderId);
    
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.type !== 'folder') {
      return res.status(400).json({ message: 'Resource is not a folder' });
    }

    // Get file extension
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);

    // Create a new file entry
    const newFile = {
      name: file.originalname,
      path: folderPath || '',
      fullPath: folderPath ? `${folderPath}/${file.originalname}` : file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      fileExtension,
      uploadedAt: new Date(),
      data: file.buffer
    };

    // Add the file to the folder's files array
    folder.files.push(newFile);
    await folder.save();

    // Don't send file data back in the response
    const responseFile = { ...newFile.toObject() };
    delete responseFile.data;

    res.status(201).json(responseFile);
  } catch (error) {
    console.error('Error uploading file to folder:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// View a file in browser (for opening in new tabs)
router.post('/resources/:resourceId/view', auth, async (req, res) => {
  try {
    const { resourceId } = req.params;
    
    // Log request details for debugging
    console.log(`View request for resource ${resourceId}`);
    console.log(`Authorization header: ${req.headers.authorization ? 'Present' : 'Missing'}`);

    // Validate resourceId
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).send('Invalid resource ID');
    }

    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      return res.status(404).send('Resource not found');
    }

    if (resource.type !== 'file') {
      return res.status(400).send('Resource is not a file');
    }

    // Set headers based on file type
    let contentDisposition = 'inline';
    
    // For certain types of files, force download instead of inline display
    if (['application/zip', 'application/x-rar-compressed', 'application/x-tar'].includes(resource.fileType)) {
      contentDisposition = 'attachment';
    }

    // Set headers for file display
    res.set({
      'Content-Type': resource.fileType || 'application/octet-stream',
      'Content-Disposition': `${contentDisposition}; filename="${resource.name}"`,
      'Content-Length': resource.fileSize
    });

    // Send the file data
    res.send(resource.data);
  } catch (error) {
    console.error('Error viewing file:', error);
    res.status(500).send(`Server error: ${error.message}`);
  }
});

// Also support GET for viewing files (duplicate of POST endpoint above for compatibility)
router.get('/resources/:resourceId/view', auth, async (req, res) => {
  try {
    const { resourceId } = req.params;
    
    // Log request details for debugging
    console.log(`GET View request for resource ${resourceId}`);
    console.log(`Authorization header: ${req.headers.authorization ? 'Present' : 'Missing'}`);

    // Validate resourceId
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).send('Invalid resource ID');
    }

    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      return res.status(404).send('Resource not found');
    }

    if (resource.type !== 'file') {
      return res.status(400).send('Resource is not a file');
    }

    // Set headers based on file type
    let contentDisposition = 'inline';
    
    // For certain types of files, force download instead of inline display
    if (['application/zip', 'application/x-rar-compressed', 'application/x-tar'].includes(resource.fileType)) {
      contentDisposition = 'attachment';
    }

    // Set headers for file display
    res.set({
      'Content-Type': resource.fileType || 'application/octet-stream',
      'Content-Disposition': `${contentDisposition}; filename="${resource.name}"`,
      'Content-Length': resource.fileSize
    });

    // Send the file data
    res.send(resource.data);
  } catch (error) {
    console.error('Error viewing file:', error);
    res.status(500).send(`Server error: ${error.message}`);
  }
});

// Download a file from a folder
router.get('/resources/:folderId/files/:fileIndex/download', auth, async (req, res) => {
  try {
    const { folderId, fileIndex } = req.params;
    
    // Log request information
    console.log(`Download request for folder ${folderId}, file index ${fileIndex}`);
    console.log(`Authorization: ${req.headers.authorization ? 'Present' : 'Missing'}`);

    // Validate folderId
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: 'Invalid folder ID' });
    }

    // Validate fileIndex
    const idx = parseInt(fileIndex, 10);
    if (isNaN(idx)) {
      return res.status(400).json({ message: 'Invalid file index' });
    }

    const folder = await Resource.findById(folderId);
    
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.type !== 'folder') {
      return res.status(400).json({ message: 'Resource is not a folder' });
    }

    // Check if file exists at the specified index
    if (!folder.files || idx < 0 || idx >= folder.files.length) {
      return res.status(404).json({ message: 'File not found in folder' });
    }

    const file = folder.files[idx];

    // Set headers for file download
    res.set({
      'Content-Type': file.fileType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.name}"`,
      'Content-Length': file.fileSize
    });

    // Send the file data
    res.send(file.data);
  } catch (error) {
    console.error('Error downloading file from folder:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// View a file from a folder
router.get('/resources/:folderId/files/:fileIndex/view', auth, async (req, res) => {
  try {
    const { folderId, fileIndex } = req.params;
    
    // Log request information
    console.log(`View request for folder ${folderId}, file index ${fileIndex}`);
    console.log(`Authorization: ${req.headers.authorization ? 'Present' : 'Missing'}`);

    // Validate folderId
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: 'Invalid folder ID' });
    }

    // Validate fileIndex
    const idx = parseInt(fileIndex, 10);
    if (isNaN(idx)) {
      return res.status(400).json({ message: 'Invalid file index' });
    }

    const folder = await Resource.findById(folderId);
    
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.type !== 'folder') {
      return res.status(400).json({ message: 'Resource is not a folder' });
    }

    // Check if file exists at the specified index
    if (!folder.files || idx < 0 || idx >= folder.files.length) {
      return res.status(404).json({ message: 'File not found in folder' });
    }

    const file = folder.files[idx];

    // Set headers for file view (inline)
    let contentDisposition = 'inline';
    
    // For certain file types, force download instead of inline display
    if (['application/zip', 'application/x-rar-compressed', 'application/x-tar'].includes(file.fileType)) {
      contentDisposition = 'attachment';
    }

    // Set headers for file display
    res.set({
      'Content-Type': file.fileType || 'application/octet-stream',
      'Content-Disposition': `${contentDisposition}; filename="${file.name}"`,
      'Content-Length': file.fileSize
    });

    // Send the file data
    res.send(file.data);
  } catch (error) {
    console.error('Error viewing file from folder:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 