import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProjectDashboard.css';
import config from '../config';
import { FontAwesomeIcon } from '../fontawesome';
import MessagePanel from './MessagePanel';
import WhiteboardComponent from './WhiteboardComponent';
import { 
  faUsers, 
  faTasks,
  faCalendarAlt,
  faChartLine,
  faFileAlt,
  faComments,
  faArrowLeft,
  faCog,
  faEdit,
  faTrash,
  faPlus,
  faComment,
  faUser,
  faBars,
  faColumns,
  faVideo,
  faChalkboard,
  faBook,
  faCode,
  faChevronRight,
  faChevronLeft,
  faLink,
  faFile,
  faFolder,
  faDownload,
  faEye,
  faFolderOpen,
  faTimes,
  faFileWord,
  faFilePowerpoint,
  faFileExcel,
  faExternalLinkAlt,
  faFilePdf,
  faFileAudio,
  faFileVideo,
  faHome,
  faArrowUp,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import io from 'socket.io-client';
import JitsiMeetComponent from './JitsiMeetComponent';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Define motion variants for the draggable items
const itemVariants = {
  initial: { opacity: 0.5, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  drag: { opacity: 0.9, scale: 1.05, boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.15)" }
};

// Define variants for the drop area highlighting
const dropAreaVariants = {
  initial: { backgroundColor: "rgba(0, 0, 0, 0)" },
  hover: { backgroundColor: "rgba(0, 0, 0, 0.05)" }
};

// Sample task data structure
const initialTasks = {
  'not-started': [],
  'in-progress': [],
  'completed': []
};

// Sample user contribution data with user-specific colors
const initialContributions = {
  labels: [],
  datasets: [
    {
      label: 'Task Completion',
      data: [],
      backgroundColor: [], // Will be filled dynamically with user-specific colors
      borderColor: [], // Will be filled dynamically with user-specific colors
      borderWidth: 1,
    },
  ],
};

// Task component with Framer Motion
const Task = ({ task, index, columnId, onEdit, onDelete, onDragEnd }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      layout
      className="task-card"
      variants={itemVariants}
      initial="initial"
      animate={isDragging ? "drag" : "animate"}
      exit="exit"
      drag={true}
      dragSnapToOrigin={false}
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ 
        scale: 1.05, 
        boxShadow: "0px 10px 25px rgba(0,0,0,0.2)",
        zIndex: 100,
        cursor: "grabbing"
      }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(event, info) => {
        setIsDragging(false);
        onDragEnd(event, info, task, columnId);
      }}
    >
      <div className="task-content">
        <h5>{task.title}</h5>
        <p>{task.description}</p>
        <span className="task-assignee">Assigned to: {task.assignee}</span>
      </div>
      <div className="task-actions">
        <button onClick={() => onEdit(task)}>
          <FontAwesomeIcon icon={faEdit} />
        </button>
        <button onClick={() => onDelete(task.id)}>
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>
    </motion.div>
  );
};

// KanbanColumn component with Framer Motion
const KanbanColumn = ({ title, status, tasks, onEditTask, onDeleteTask, onDragEnd, color }) => {
  return (
    <div className={`kanban-column ${status}-column`}>
      <div className="kanban-column-header" style={{ backgroundColor: color }}>
        <h4>{title}</h4>
      </div>
      <motion.div
        className="task-list"
        data-status={status}
        whileHover={{ backgroundColor: "rgba(0,0,0,0.03)" }}
      >
        <AnimatePresence>
          {tasks.map((task, index) => (
            <Task 
              key={task.id}
              task={task}
              index={index}
              columnId={status}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onDragEnd={onDragEnd}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Resource Upload Modal with backend integration
const ResourceUploadModal = ({ isOpen, onClose, onUpload, projectId }) => {
  const [uploadType, setUploadType] = useState('file'); // 'file', 'folder', or 'link'
  const [resourceName, setResourceName] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  
  const handleUpload = async () => {
    if (isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication token missing. Please log in again.');
        setIsUploading(false);
        return;
      }
      
      if (uploadType === 'link' && !resourceUrl) {
        alert('Please enter a valid URL');
        setIsUploading(false);
        return;
      }
      
      if (uploadType === 'file' && !selectedFile) {
        alert('Please select a file to upload');
        setIsUploading(false);
        return;
      }
      
      if (uploadType === 'folder' && selectedFiles.length === 0) {
        alert('Please select a folder with files to upload');
        setIsUploading(false);
        return;
      }
      
      let result = null;
      
      // Upload based on type
      if (uploadType === 'link') {
        // Create link resource
        const response = await fetch(`${config.API_BASE_URL}/browseprojects/${projectId}/resources/link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify({
            name: resourceName,
            description: resourceDescription,
            url: resourceUrl
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create link: ${response.status} ${response.statusText}`);
        }
        
        result = await response.json();
        
      } else if (uploadType === 'file') {
        // Upload individual file
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', resourceName || selectedFile.name);
        formData.append('description', resourceDescription);
        
        const xhr = new XMLHttpRequest();
        
        // Add progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });
        
        // Create a promise to handle the XHR request
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.open('POST', `${config.API_BASE_URL}/browseprojects/${projectId}/resources/file`);
          xhr.setRequestHeader('Authorization', token);
          
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(`HTTP Error: ${xhr.status}`));
            }
          };
          
          xhr.onerror = function() {
            reject(new Error('Network error occurred'));
          };
          
          xhr.send(formData);
        });
        
        result = await uploadPromise;
        
      } else if (uploadType === 'folder') {
        // Create folder first
        const folderName = resourceName || (selectedFiles[0] ? selectedFiles[0].webkitRelativePath.split('/')[0] : 'Uploaded Folder');
        
        const folderResponse = await fetch(`${config.API_BASE_URL}/browseprojects/${projectId}/resources/folder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify({
            name: folderName,
            description: resourceDescription
          })
        });
        
        if (!folderResponse.ok) {
          throw new Error(`Failed to create folder: ${folderResponse.status} ${folderResponse.statusText}`);
        }
        
        const folderResult = await folderResponse.json();
        const folderId = folderResult._id;
        
        // Upload files to the folder
        let uploadedCount = 0;
        
        for (const file of selectedFiles) {
          // Get path relative to the root folder
          const pathParts = file.webkitRelativePath.split('/');
          pathParts.shift(); // Remove the root folder name
          const relativePath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
          
          const fileFormData = new FormData();
          fileFormData.append('file', file);
          fileFormData.append('folderPath', relativePath); // Changed from 'path' to 'folderPath' to match server
          
          await fetch(`${config.API_BASE_URL}/resources/${folderId}/files`, {
            method: 'POST',
            headers: {
              'Authorization': token
            },
            body: fileFormData
          });
          
          uploadedCount++;
          setUploadProgress(Math.round((uploadedCount / selectedFiles.length) * 100));
        }
        
        // Reload the folder to get complete structure
        const refreshFolderResponse = await fetch(`${config.API_BASE_URL}/resources/${folderId}`, {
          headers: {
            'Authorization': token
          }
        });
        
        if (!refreshFolderResponse.ok) {
          throw new Error(`Failed to refresh folder: ${refreshFolderResponse.status}`);
        }
        
        result = await refreshFolderResponse.json();
      }
      
      // Send the result to parent component
      if (result) {
        onUpload(result);
      }
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error uploading resource:', error);
      alert(`Failed to upload resource: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleFolderSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };
  
  const resetForm = () => {
    setResourceName('');
    setResourceUrl('');
    setResourceDescription('');
    setSelectedFile(null);
    setSelectedFiles([]);
    setUploadType('file');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };
  
  const handleCancel = () => {
    resetForm();
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="resource-modal">
        <div className="resource-modal-header">
          <h3>Add Resource</h3>
          <button className="close-button" onClick={handleCancel}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="resource-type-selector">
          <button 
            className={`resource-type-btn ${uploadType === 'file' ? 'active' : ''}`}
            onClick={() => setUploadType('file')}
          >
            <FontAwesomeIcon icon={faFile} /> File
          </button>
          <button 
            className={`resource-type-btn ${uploadType === 'folder' ? 'active' : ''}`}
            onClick={() => setUploadType('folder')}
          >
            <FontAwesomeIcon icon={faFolder} /> Folder
          </button>
          <button 
            className={`resource-type-btn ${uploadType === 'link' ? 'active' : ''}`}
            onClick={() => setUploadType('link')}
          >
            <FontAwesomeIcon icon={faLink} /> Link
          </button>
        </div>
        
        <div className="form-group">
          <label>{uploadType === 'link' ? 'Resource Name' : 'Name (optional)'}</label>
          <input 
            type="text" 
            value={resourceName} 
            onChange={(e) => setResourceName(e.target.value)}
            placeholder={uploadType === 'link' ? 'Enter resource name' : 'Default: file/folder name'}
          />
        </div>
        
        {uploadType === 'link' && (
          <div className="form-group">
            <label>URL</label>
            <input 
              type="url" 
              value={resourceUrl} 
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>
        )}
        
        {uploadType === 'file' && (
          <div className="form-group">
            <label>Select File</label>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="file-input"
            />
            {selectedFile && (
              <div className="selected-file-info">
                <p>{selectedFile.name}</p>
                <p>{Math.round(selectedFile.size / 1024)} KB</p>
              </div>
            )}
          </div>
        )}
        
        {uploadType === 'folder' && (
          <div className="form-group">
            <label>Select Folder</label>
            <input 
              type="file" 
              ref={folderInputRef}
              onChange={handleFolderSelect}
              className="file-input"
              webkitdirectory="true"
              directory="true"
              mozdirectory="true"
              multiple
            />
            {selectedFiles.length > 0 && (
              <div className="selected-file-info">
                <p>Folder: {selectedFiles[0].webkitRelativePath.split('/')[0]}</p>
                <p>{selectedFiles.length} files selected</p>
              </div>
            )}
          </div>
        )}
        
        <div className="form-group">
          <label>Description (optional)</label>
          <textarea 
            value={resourceDescription} 
            onChange={(e) => setResourceDescription(e.target.value)}
            placeholder="Enter a brief description"
          />
        </div>
        
        {isUploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="progress-text">{uploadProgress}% Uploaded</p>
          </div>
        )}
        
        <div className="modal-actions">
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            className="save-button" 
            onClick={handleUpload}
            disabled={isUploading || 
              (uploadType === 'link' && !resourceUrl) || 
              (uploadType === 'file' && !selectedFile) ||
              (uploadType === 'folder' && selectedFiles.length === 0)}
          >
            {isUploading ? 'Uploading...' : 'Upload Resource'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Updated ResourceFileTree component with folder browsing and file management
const ResourceFileTree = ({ resources, onSelectResource, selectedResource, currentPath = '', onDeleteResource, onRenameResource }) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [resourceToRename, setResourceToRename] = useState(null);
  const [newName, setNewName] = useState('');
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [currentPathState, setCurrentPathState] = useState(currentPath);

  // Function to toggle folder expansion
  const toggleFolderExpansion = (e, folderId) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Function to get folders and files at the current path
  const getResourcesAtCurrentPath = () => {
    if (!currentPathState) {
      // At root level, return all top-level resources
      return resources;
    }

    // Find the folder resource that contains the current path
    const pathParts = currentPathState.split('/');
    const rootFolderName = pathParts[0];
    const folderResource = resources.find(r => r.type === 'folder' && r.name === rootFolderName);
    
    if (!folderResource || !folderResource.files) {
      return [];
    }

    // If we're inside a subfolder
    if (pathParts.length > 1) {
      const subfolder = pathParts.slice(1).join('/');
      
      // Get immediate children (files and folders) of the current path
      const filesAndFolders = [];
      
      // First, identify all unique immediate subfolders
      const subfolders = new Set();
      folderResource.files.forEach(file => {
        if (file.path && file.path.startsWith(subfolder + '/')) {
          const remaining = file.path.substring(subfolder.length + 1);
          const parts = remaining.split('/');
          if (parts.length > 0 && parts[0]) {
            subfolders.add(parts[0]);
          }
        }
      });
      
      // Add subfolders as folder items
      subfolders.forEach(subfolder => {
        filesAndFolders.push({
          id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: subfolder,
          type: 'folder',
          isSubfolder: true,
          parentPath: currentPathState
        });
      });
      
      // Add files that are direct children of this path
      folderResource.files.forEach(file => {
        if (file.path === subfolder || 
            (file.path && file.path.startsWith(subfolder + '/') && 
             !file.path.substring(subfolder.length + 1).includes('/'))) {
          filesAndFolders.push({
            ...file,
            parentFolder: rootFolderName
          });
        }
      });
      
      return filesAndFolders;
    } 
    
    // We're at the root of a folder
    const filesAndFolders = [];
    
    // First, identify all unique immediate subfolders
    const subfolders = new Set();
    folderResource.files.forEach(file => {
      if (file.path && file.path.includes('/')) {
        const parts = file.path.split('/');
        if (parts.length > 0 && parts[0]) {
          subfolders.add(parts[0]);
        }
      }
    });
    
    // Add subfolders as folder items
    subfolders.forEach(subfolder => {
      filesAndFolders.push({
        id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: subfolder,
        type: 'folder',
        isSubfolder: true,
        parentPath: rootFolderName
      });
    });
    
    // Add files that are direct children of the root folder
    folderResource.files.forEach(file => {
      if (!file.path || !file.path.includes('/')) {
        filesAndFolders.push({
          ...file,
          parentFolder: rootFolderName
        });
      }
    });
    
    return filesAndFolders;
  };

  // Get child resources for a folder
  const getFolderContents = (folder) => {
    if (!folder) return [];
    
    console.log(`Getting contents for folder:`, folder);
    
    // For top-level folders
    if (folder.type === 'folder' && !folder.isSubfolder && folder.files) {
      console.log(`Processing top-level folder ${folder.name} with ${folder.files.length} files`);
      // First get all files at the root level of the folder
      const rootFiles = folder.files.filter(file => !file.path || !file.path.includes('/'));
      console.log(`Found ${rootFiles.length} root files in folder ${folder.name}`);
      
      // Get all first-level subfolders
      const subfolders = new Set();
      folder.files.forEach(file => {
        if (file.path && file.path.includes('/')) {
          const firstFolder = file.path.split('/')[0];
          if (firstFolder) {
            subfolders.add(firstFolder);
          }
        }
      });
      
      console.log(`Found ${subfolders.size} subfolders in folder ${folder.name}:`, Array.from(subfolders));
      
      // Create folder objects
      const folderItems = Array.from(subfolders).map(subfolder => ({
        id: `folder-${subfolder}-${Date.now()}`,
        name: subfolder,
        type: 'folder',
        isSubfolder: true,
        parentPath: folder.name
      }));
      
      const result = [...folderItems, ...rootFiles];
      console.log(`Returning ${result.length} items from folder ${folder.name}`);
      return result;
    }
    
    // For subfolders
    if (folder.isSubfolder) {
      console.log(`Processing subfolder ${folder.name} with parent path ${folder.parentPath}`);
      const parentPath = folder.parentPath ? `${folder.parentPath}/` : '';
      const folderPath = `${parentPath}${folder.name}`;
      
      // Find the root folder resource
      const pathParts = folderPath.split('/');
      const rootFolderName = pathParts[0];
      const rootFolder = resources.find(r => r.type === 'folder' && r.name === rootFolderName);
      
      if (!rootFolder || !rootFolder.files) {
        console.log(`Could not find root folder ${rootFolderName} or it has no files`);
        return [];
      }
      
      // For multi-level paths
      if (pathParts.length > 1) {
        const subPath = pathParts.slice(1).join('/');
        console.log(`Looking for files in subfolder path: ${subPath}`);
        
        // Get files in this exact subfolder
        const files = rootFolder.files.filter(file => {
          // Files directly in this subfolder
          if (file.path === subPath) return true;
          
          // Files in a deeper level that start with this path
          if (file.path && file.path.startsWith(subPath + '/')) {
            const remainingPath = file.path.substring(subPath.length + 1);
            // Only include if it's a direct child (no further slashes)
            return !remainingPath.includes('/');
          }
          
          return false;
        });
        
        console.log(`Found ${files.length} files directly in subfolder path: ${subPath}`);
        
        // Get subfolders in this folder
        const subfolders = new Set();
        rootFolder.files.forEach(file => {
          if (file.path && file.path.startsWith(subPath + '/')) {
            const remainingPath = file.path.substring(subPath.length + 1);
            const parts = remainingPath.split('/');
            if (parts.length > 0 && parts[0]) {
              subfolders.add(parts[0]);
            }
          }
        });
        
        console.log(`Found ${subfolders.size} subfolders in path ${subPath}:`, Array.from(subfolders));
        
        // Create folder objects
        const folderItems = Array.from(subfolders).map(subfolder => ({
          id: `folder-${subfolder}-${Date.now()}`,
          name: subfolder,
          type: 'folder',
          isSubfolder: true,
          parentPath: folderPath
        }));
        
        const result = [...folderItems, ...files];
        console.log(`Returning ${result.length} items from subfolder ${folder.name}`);
        return result;
      }
    }
    
    console.log(`Folder ${folder.name} doesn't match criteria, returning empty array`);
    return [];
  };

  // Get all resources at current path
  const displayResources = getResourcesAtCurrentPath();

  // Handle resource click
  const handleResourceClick = (resource) => {
    const resourceId = resource._id || resource.id;
    
    if (resource.type === 'folder') {
      if (!expandedFolders[resourceId]) {
        // Expand the folder
        setExpandedFolders(prev => ({
          ...prev,
          [resourceId]: true
        }));
      }
    }
    onSelectResource(resource);
  };

  // Navigate up one level
  const handleNavigateUp = () => {
    if (!currentPathState) return;
    
    const pathParts = currentPathState.split('/');
    if (pathParts.length === 1) {
      // At root folder, go back to global root
      setCurrentPathState('');
      onSelectResource(null);
    } else {
      // Go up one subfolder level
      const newPath = pathParts.slice(0, -1).join('/');
      setCurrentPathState(newPath);
      
      // Try to select the parent folder
      const resources = getResourcesAtCurrentPath();
      const parentFolder = resources.find(r => r.type === 'folder');
      if (parentFolder) {
        onSelectResource(parentFolder);
      }
    }
  };

  // Open rename modal
  const handleRenameClick = (e, resource) => {
    e.stopPropagation();
    setResourceToRename(resource);
    setNewName(resource.name);
    setRenameModalOpen(true);
  };

  // Open delete modal
  const handleDeleteClick = (e, resource) => {
    e.stopPropagation();
    setResourceToDelete(resource);
    setConfirmDeleteModalOpen(true);
  };

  // Submit rename
  const handleRenameSubmit = async () => {
    if (!newName.trim() || !resourceToRename) {
      setRenameModalOpen(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication token missing. Please log in again.');
        setRenameModalOpen(false);
        return;
      }
      
      // Get the resource ID (either MongoDB _id or client-side id)
      const resourceId = resourceToRename._id || resourceToRename.id;
      
      // Call API to rename resource
      const response = await fetch(`${config.API_BASE_URL}/api/resources/${resourceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          name: newName,
          description: resourceToRename.description
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to rename resource: ${response.status} ${response.statusText}`);
      }
      
      const updatedResource = await response.json();
      
      // Call the parent component's rename handler with the updated resource
      if (onRenameResource) {
        onRenameResource(resourceToRename, updatedResource);
      }
      
      setRenameModalOpen(false);
      setResourceToRename(null);
      setNewName('');
    } catch (error) {
      console.error('Error renaming resource:', error);
      alert(`Failed to rename resource: ${error.message}`);
      setRenameModalOpen(false);
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!resourceToDelete) {
      setConfirmDeleteModalOpen(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication token missing. Please log in again.');
        setConfirmDeleteModalOpen(false);
        return;
      }
      
      // Get the resource ID (either MongoDB _id or client-side id)
      const resourceId = resourceToDelete._id || resourceToDelete.id;
      
      // Call API to delete resource
      const response = await fetch(`${config.API_BASE_URL}/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete resource: ${response.status} ${response.statusText}`);
      }
      
      // Call the parent component's delete handler
      if (onDeleteResource) {
        onDeleteResource(resourceToDelete);
      }
      
      setConfirmDeleteModalOpen(false);
      setResourceToDelete(null);
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert(`Failed to delete resource: ${error.message}`);
      setConfirmDeleteModalOpen(false);
    }
  };

  // Render breadcrumb navigation
  const renderBreadcrumbs = () => {
    if (!currentPathState) return null;
    
    const parts = currentPathState.split('/');
    
    return (
      <div className="file-tree-breadcrumbs">
        <button className="breadcrumb-home" onClick={() => {
          setCurrentPathState('');
          onSelectResource(null);
        }}>
          <FontAwesomeIcon icon={faHome} />
        </button>
        {parts.map((part, index) => {
          const path = parts.slice(0, index + 1).join('/');
          const isLast = index === parts.length - 1;
          
          return (
            <React.Fragment key={path}>
              <span className="breadcrumb-separator">/</span>
              <button 
                className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                onClick={() => {
                  if (!isLast) {
                    setCurrentPathState(path);
                    // Try to select the folder
                    const folderParts = path.split('/');
                    const folderName = folderParts[folderParts.length - 1];
                    const folder = displayResources.find(r => r.type === 'folder' && r.name === folderName);
                    if (folder) onSelectResource(folder);
                  }
                }}
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Recursive function to render folder contents
  const renderResourceItem = (resource, depth = 0) => {
    // Use either _id (from MongoDB) or id (from client-side)
    const resourceId = resource._id || resource.id;
    const isExpanded = expandedFolders[resourceId];
    const folderContents = resource.type === 'folder' ? getFolderContents(resource) : [];
    
    console.log(`Rendering resource: ${resource.name}, type: ${resource.type}, expanded: ${isExpanded}, folder contents: ${folderContents.length}`);
    
    // Check if this resource is selected
    const isSelected = selectedResource && 
      (selectedResource._id === resourceId || selectedResource.id === resourceId);
    
    return (
      <React.Fragment key={resourceId || `resource-${resource.name}-${Math.random()}`}>
        <li 
          className={`resource-item ${isSelected ? 'selected' : ''}`}
          onClick={() => handleResourceClick(resource)}
          style={{ paddingLeft: `${depth * 10 + 15}px` }}
        >
          <div className="resource-item-content">
            {resource.type === 'folder' && (
              <button 
                className="folder-toggle-btn"
                onClick={(e) => toggleFolderExpansion(e, resourceId)}
              >
                <FontAwesomeIcon 
                  icon={isExpanded ? faChevronDown : faChevronRight}
                  className="toggle-icon"
                />
              </button>
            )}
            <FontAwesomeIcon 
              icon={
                resource.type === 'folder' 
                  ? (isExpanded ? faFolderOpen : faFolder)
                  : resource.type === 'link' 
                    ? faLink 
                    : faFile
              } 
              className="resource-icon"
            />
            <span className="resource-name">{resource.name}</span>
          </div>
          <div className="resource-item-actions">
            <button 
              className="resource-action-btn" 
              onClick={(e) => handleRenameClick(e, resource)}
              title="Rename"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
            <button 
              className="resource-action-btn" 
              onClick={(e) => handleDeleteClick(e, resource)}
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        </li>
        
        {/* Render folder contents if expanded */}
        {resource.type === 'folder' && isExpanded && folderContents.length > 0 && (
          <li key={`folder-contents-${resourceId}`} className="folder-contents">
            <ul className="resource-sublist">
              {folderContents.map(item => renderResourceItem(item, depth + 1))}
            </ul>
          </li>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="resource-file-tree">
      <div className="file-tree-header">
        <h4>Resources</h4>
        {currentPathState && (
          <button className="navigate-up-btn" onClick={handleNavigateUp} title="Navigate Up">
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
        )}
      </div>
      
      {renderBreadcrumbs()}
      
      <div className="file-tree-content">
        {displayResources.length === 0 ? (
          <div className="empty-file-tree">
            <p>No resources {currentPathState ? 'in this folder' : 'yet'}</p>
          </div>
        ) : (
          <ul className="resource-list">
            {displayResources.map(resource => renderResourceItem(resource))}
          </ul>
        )}
      </div>
      
      {/* Rename Modal */}
      {renameModalOpen && (
        <div className="modal-overlay">
          <div className="rename-modal">
            <h3>Rename {resourceToRename?.type === 'folder' ? 'Folder' : 'File'}</h3>
            <div className="form-group">
              <label>New Name</label>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setRenameModalOpen(false)}>
                Cancel
              </button>
              <button 
                className="save-button" 
                onClick={handleRenameSubmit}
                disabled={!newName.trim()}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {confirmDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <h3>Delete {resourceToDelete?.type === 'folder' ? 'Folder' : 'File'}</h3>
            <p>Are you sure you want to delete "{resourceToDelete?.name}"?
              {resourceToDelete?.type === 'folder' ? ' This will delete all files within the folder.' : ''}
            </p>
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setConfirmDeleteModalOpen(false)}>
                Cancel
              </button>
              <button 
                className="delete-button" 
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FilePreview = ({ file }) => {
  const extension = file.fileExtension?.toLowerCase();
  const [textContent, setTextContent] = useState('');
  const [csvContent, setCsvContent] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  
  // Clean up blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);
  
  // Create a blob URL for image and PDF files
  useEffect(() => {
    // Only for image files and PDFs
    if (!['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'pdf'].includes(extension)) {
      return;
    }
    
    const fetchFileAsBlob = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token missing');
        }
        
        const fileId = file._id || file.id;
        if (!fileId) {
          throw new Error('File ID is missing');
        }
        
        // Determine the correct URL
        let url;
        if (file.fileIndex !== undefined) {
          // File is within a folder
          url = `${config.API_BASE_URL}/resources/${fileId}/files/${file.fileIndex}/view`;
        } else {
          // Regular file directly in resources
          url = `${config.API_BASE_URL}/resources/${fileId}/view`;
        }
        
        console.log(`Fetching ${extension} file as blob from:`, url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': token
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
        
        // Get blob and create URL
        const blob = await response.blob();
        console.log('Retrieved blob:', blob.type, blob.size, 'bytes');
        
        // Create and store the blob URL
        const blobUrl = URL.createObjectURL(blob);
        console.log('Created blob URL for file:', blobUrl);
        setBlobUrl(blobUrl);
      } catch (error) {
        console.error('Error creating blob URL:', error);
        setError(`Failed to load file: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch if we don't already have a blob URL and this is a server-side file
    if (!blobUrl && !file.previewUrl && (file._id || file.id)) {
      fetchFileAsBlob();
    }
  }, [file, extension, blobUrl]);
  
  // Helper function to get preview URL for server-stored files
  const getPreviewUrl = useCallback(() => {
    console.log('Getting preview URL for file:', file);
    
    // If we have a client-side previewUrl, use it
    if (file.previewUrl) {
      console.log('Using client-side previewUrl:', file.previewUrl);
      return file.previewUrl;
    }
    
    // For server-side stored files
    const fileId = file._id || file.id;
    if (fileId) {
      console.log(`File ID found: ${fileId}, fileIndex: ${file.fileIndex}`);
      
      // If this is a file within a folder (has fileIndex property)
      if (file.fileIndex !== undefined) {
        // Use the view endpoint for preview, not download
        const url = `${config.API_BASE_URL}/resources/${fileId}/files/${file.fileIndex}/view`;
        console.log('Using folder file view URL:', url);
        return url;
      }
      
      // Regular file directly in resources
      const url = `${config.API_BASE_URL}/resources/${fileId}/view`;
      console.log('Using regular file view URL:', url);
      return url;
    }
    
    console.warn('No previewUrl or fileId available');
    return null;
  }, [file]);
  
  // Helper for fetching text content from server
  const fetchTextContent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching text content for file:', file);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token missing');
      }
      
      const fileId = file._id || file.id;
      if (!fileId) {
        throw new Error('File ID is missing');
      }
      
      // Adjust URL based on whether it's a file in a folder or directly in resources
      let url;
      if (file.fileIndex !== undefined) {
        // File is within a folder
        console.log(`Using folder file endpoint with fileId: ${fileId}, fileIndex: ${file.fileIndex}`);
        url = `${config.API_BASE_URL}/resources/${fileId}/files/${file.fileIndex}/download`;
      } else {
        // Regular file directly in resources
        console.log(`Using regular file endpoint with fileId: ${fileId}`);
        url = `${config.API_BASE_URL}/resources/${fileId}/download`;
      }
      
      console.log('Fetching from URL:', url);
      const response = await fetch(url, {
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      
      // Check response headers
      const contentType = response.headers.get('Content-Type');
      const contentLength = response.headers.get('Content-Length');
      console.log(`Response content type: ${contentType}, length: ${contentLength}`);
      
      // Get the blob first to analyze it
      const blob = await response.blob();
      console.log(`Received blob of type: ${blob.type}, size: ${blob.size} bytes`);
      
      // For text files, read as text
      const text = await blob.text();
      
      console.log(`Text file content length: ${text.length} characters`);
      
      if (extension === 'csv') {
        // Parse CSV content
        const rows = text.split('\n').map(row => row.split(','));
        console.log(`CSV parsed into ${rows.length} rows`);
        setCsvContent(rows);
      } else {
        // Set as text content
        setTextContent(text);
      }
    } catch (error) {
      console.error('Error fetching text content:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [file, extension]);
  
  useEffect(() => {
    // Reset states when file changes
    setTextContent('');
    setCsvContent([]);
    setError(null);
    
    // Text file handling
    const isTextFile = ['txt', 'md', 'js', 'jsx', 'css', 'html', 'json', 'xml'].includes(extension);
    
    if (isTextFile || extension === 'csv') {
      if (file.file) {
        // Client-side file - use FileReader
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          
          if (extension === 'csv') {
            // Parse CSV content
            const rows = content.split('\n').map(row => row.split(','));
            setCsvContent(rows);
          } else {
            // Set as text content
            setTextContent(content);
          }
        };
        reader.readAsText(file.file);
      } else if (file._id || file.id) {
        // Server-side file - fetch content
        fetchTextContent();
      }
    }
  }, [file, extension, fetchTextContent]);
  
  // Helper function for downloading files
  const downloadFile = async () => {
    try {
      console.log('Starting file download process');
      // Check if we have a local file blob or need to fetch from server
      if (file.file && file.previewUrl) {
        console.log('Using local file blob for download');
        // We have a local file blob
        const link = document.createElement('a');
        link.href = file.previewUrl;
        link.download = file.name || `download.${extension || 'file'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.log('Need to fetch file from server');
        // We need to fetch from the server
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found in localStorage');
          alert('Authentication token missing. Please log in again.');
          return;
        }

        // Get the file ID
        const fileId = file._id || file.id;
        
        if (!fileId) {
          console.error('File ID is missing', file);
          alert('Unable to download file: File ID is missing');
          return;
        }

        console.log(`Downloading file with ID: ${fileId}`);
        console.log(`Using token: ${token.substring(0, 10)}...`);

        // Determine URL based on whether it's a file in a folder
        let url;
        if (file.fileIndex !== undefined) {
          // File is within a folder
          url = `${config.API_BASE_URL}/resources/${fileId}/files/${file.fileIndex}/download`;
        } else {
          // Regular file directly in resources
          url = `${config.API_BASE_URL}/resources/${fileId}/download`;
        }

        // Instead of window.open, create a fetch request with proper authentication
        // and create a blob URL from the response
        try {
          const response = await fetch(url, {
            headers: {
              'Authorization': token
            }
          });
          
          if (!response.ok) {
            const responseText = await response.text();
            console.error(`Failed to download file: ${response.status} - ${responseText}`);
            throw new Error(`Failed to download file: ${response.status} - ${responseText}`);
          }
          
          // Get the blob from the response
          const blob = await response.blob();
          console.log(`Downloaded file blob of size: ${blob.size} bytes and type: ${blob.type}`);
          
          // Create a blob URL for the file
          const blobUrl = window.URL.createObjectURL(blob);
          
          // Create a link and click it to download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = file.name || `download.${extension || 'file'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the blob URL
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
          }, 100);
          
          console.log('File download completed successfully');
        } catch (error) {
          console.error('Error downloading file:', error);
          alert(`Download error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error in downloadFile function:', error);
      alert(`Failed to download file: ${error.message}`);
    }
  };
  
  // Helper function for opening in new tab
  const openInNewTab = async () => {
    try {
      const previewUrl = getPreviewUrl();
      if (!previewUrl) {
        alert('Preview URL is not available');
        return;
      }
      
      // Get the token
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token missing. Please log in again.');
        return;
      }
      
      // Get the file ID
      const fileId = file._id || file.id;
      if (!fileId) {
        alert('File ID is missing');
        return;
      }
      
      console.log(`Opening file with ID: ${fileId} in new tab`);
      
      // For client-side files, we can open directly
      if (file.previewUrl && file.file) {
        window.open(file.previewUrl, '_blank');
        return;
      }
      
      // For server files, we need to fetch with authentication
      let url;
      let method = 'GET';
      
      // Determine if this is a file in a folder
      if (file.fileIndex !== undefined) {
        // File is within a folder
        url = `${config.API_BASE_URL}/resources/${fileId}/files/${file.fileIndex}/view`;
        console.log('Using folder file view endpoint:', url);
      } else {
        // Regular file directly in resources
        url = `${config.API_BASE_URL}/resources/${fileId}/view`;
        console.log('Using regular file view endpoint:', url);
      }
      
      console.log(`Fetching file with method ${method} from: ${url}`);
      
      // Fetch the file with auth token
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      console.log('Retrieved blob:', blob.type, blob.size, 'bytes');
      
      // Create a blob URL and open in new tab
      const blobUrl = URL.createObjectURL(blob);
      console.log('Created blob URL:', blobUrl);
      window.open(blobUrl, '_blank');
      
      // Clean up the blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 5000); // Give it more time since we're opening in a new tab
    } catch (error) {
      console.error('Error opening file in new tab:', error);
      alert(`Failed to open file: ${error.message}`);
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="file-preview loading-preview">
        <div className="loading-spinner"></div>
        <p>Loading preview...</p>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="file-preview error-preview">
        <div className="error-icon">
          <FontAwesomeIcon icon={faTimes} size="3x" />
        </div>
        <h3>Error Loading Preview</h3>
        <p>{error}</p>
        <div className="preview-actions">
          <button className="resource-action-button" onClick={downloadFile}>
            <FontAwesomeIcon icon={faDownload} /> Download Instead
          </button>
        </div>
      </div>
    );
  }
  
  // Create a generic preview for file types that can't be displayed due to CSP
  const createGenericPreview = (icon, title, description) => {
    return (
      <div className="file-preview generic-preview">
        <div className="generic-preview-content">
          <div className="preview-icon">
            <FontAwesomeIcon icon={icon} size="4x" />
          </div>
          <h3 className="preview-title">{title}</h3>
          <p className="preview-description">{description}</p>
          <div className="preview-actions">
            <button className="resource-action-button" onClick={openInNewTab}>
              <FontAwesomeIcon icon={faExternalLinkAlt} /> Open in New Tab
            </button>
            <button className="resource-action-button" onClick={downloadFile}>
              <FontAwesomeIcon icon={faDownload} /> Download
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Image preview using img tag (generally allowed in CSP)
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
    // Use the blob URL if available, or fall back to getPreviewUrl
    const imageUrl = blobUrl || getPreviewUrl();
    console.log('Image URL for preview:', imageUrl);
    
    if (imageUrl) {
      return (
        <div className="file-preview image-preview">
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Loading image...</p>
            </div>
          )}
          <img 
            src={imageUrl} 
            alt={file.name} 
            style={{ display: isLoading ? 'none' : 'block' }}
            onLoad={() => setIsLoading(false)}
            onError={(e) => {
              console.error('Error loading image:', e);
              setError('Failed to load image preview');
            }} 
          />
          <div className="preview-actions">
            <button className="resource-action-button" onClick={openInNewTab}>
              <FontAwesomeIcon icon={faExternalLinkAlt} /> Open in New Tab
            </button>
            <button className="resource-action-button" onClick={downloadFile}>
              <FontAwesomeIcon icon={faDownload} /> Download
            </button>
          </div>
        </div>
      );
    }
  }
  
  // PDF preview using PDF.js or direct embedding when possible
  if (extension === 'pdf') {
    // If we have a blob URL for the PDF, use it for direct embedding
    if (blobUrl) {
      return (
        <div className="file-preview pdf-preview">
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Loading PDF document...</p>
            </div>
          )}
          <iframe
            src={blobUrl}
            title={file.name || "PDF Document"}
            width="100%"
            height="100%"
            style={{ border: 'none', display: isLoading ? 'none' : 'block' }}
            onLoad={() => setIsLoading(false)}
          />
          <div className="preview-actions">
            <button className="resource-action-button" onClick={openInNewTab}>
              <FontAwesomeIcon icon={faExternalLinkAlt} /> Open in New Tab
            </button>
            <button className="resource-action-button" onClick={downloadFile}>
              <FontAwesomeIcon icon={faDownload} /> Download
            </button>
          </div>
        </div>
      );
    }
    
    // If no blob URL yet, use generic preview while loading
    return createGenericPreview(
      faFilePdf,
      'PDF Document',
      'PDF preview is being prepared or Content Security Policy restricts direct embedding. You can download it or open it in a new tab.'
    );
  }
  
  // Office documents
  if (['doc', 'docx'].includes(extension)) {
    return createGenericPreview(
      faFileWord,
      'Word Document',
      'Microsoft Word documents cannot be previewed in the browser due to security restrictions. You can download it or open it in a new tab.'
    );
  }
  
  if (['ppt', 'pptx'].includes(extension)) {
    return createGenericPreview(
      faFilePowerpoint,
      'PowerPoint Presentation',
      'Microsoft PowerPoint presentations cannot be previewed in the browser due to security restrictions. You can download it or open it in a new tab.'
    );
  }
  
  if (['xls', 'xlsx'].includes(extension)) {
    return createGenericPreview(
      faFileExcel,
      'Excel Spreadsheet',
      'Microsoft Excel spreadsheets cannot be previewed in the browser due to security restrictions. You can download it or open it in a new tab.'
    );
  }
  
  // CSV preview (parsed and displayed directly, not using blob URL)
  if (extension === 'csv' && csvContent.length > 0) {
    return (
      <div className="file-preview csv-preview">
        <div className="csv-table-container">
          <table className="csv-table">
            <thead>
              {csvContent.length > 0 && (
                <tr>
                  {csvContent[0].map((cell, index) => (
                    <th key={index}>{cell}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {csvContent.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="preview-actions">
          <button className="resource-action-button" onClick={downloadFile}>
            <FontAwesomeIcon icon={faDownload} /> Download
          </button>
        </div>
      </div>
    );
  }
  
  // Text file preview (displayed directly, not using blob URL)
  if (['txt', 'md', 'js', 'jsx', 'css', 'html', 'json', 'xml'].includes(extension) && textContent !== '') {
    return (
      <div className="file-preview text-preview">
        <pre>{textContent}</pre>
        <div className="preview-actions">
          <button className="resource-action-button" onClick={downloadFile}>
            <FontAwesomeIcon icon={faDownload} /> Download
          </button>
        </div>
      </div>
    );
  }
  
  // Audio and video might also be restricted by CSP
  if (['mp3', 'wav', 'ogg', 'mp4', 'webm'].includes(extension)) {
    const mediaType = ['mp3', 'wav', 'ogg'].includes(extension) ? 'Audio' : 'Video';
    const icon = ['mp3', 'wav', 'ogg'].includes(extension) ? faFileAudio : faFileVideo;
    
    return createGenericPreview(
      icon,
      `${mediaType} File`,
      `Due to Content Security Policy restrictions, ${mediaType.toLowerCase()} files cannot be previewed directly. You can download it or open it in a new tab.`
    );
  }
  
  // Default: Generic preview for any other file type
  return createGenericPreview(
    faFile,
    file.name || 'File',
    'This file type cannot be previewed in the browser. You can download it or open it in a new tab.'
  );
};

// ResourceViewer component to display details of selected resources
const ResourceViewer = ({ resource, onClose, onNavigate }) => {
  console.log('ResourceViewer received resource:', resource);
  
  if (!resource) return null;
  
  // Handle file details display
  const getFileDetails = () => {
    // If this is a file from a folder (has fileIndex)
    if (resource.type === 'file' && resource.fileIndex !== undefined) {
      return (
        <div className="file-details">
          <p><strong>File Type:</strong> {resource.fileType || 'Unknown'}</p>
          <p><strong>Size:</strong> {resource.fileSize ? `${Math.round(resource.fileSize / 1024)} KB` : 'Unknown'}</p>
          {resource.path && <p><strong>Path:</strong> {resource.path}</p>}
          <p><strong>Location:</strong> Inside folder (file index: {resource.fileIndex})</p>
        </div>
      );
    }
    
    // Regular file
    return (
      <div className="file-details">
        <p><strong>File Type:</strong> {resource.fileType || 'Unknown'}</p>
        <p><strong>Size:</strong> {resource.fileSize ? `${Math.round(resource.fileSize / 1024)} KB` : 'Unknown'}</p>
        {resource.path && <p><strong>Path:</strong> {resource.path}</p>}
      </div>
    );
  };
  
  const getFileTypeIcon = (resource) => {
    if (resource.type === 'folder') return faFolder;
    if (resource.type === 'link') return faLink;
    
    // Determine icon based on file extension
    const extension = resource.fileExtension?.toLowerCase();
    if (!extension) return faFile;
    
    // Add more icons based on file types as needed
    const fileTypeIcons = {
      'pdf': faFilePdf,
      'doc': faFileWord,
      'docx': faFileWord,
      'xls': faFileExcel,
      'xlsx': faFileExcel,
      'ppt': faFilePowerpoint,
      'pptx': faFilePowerpoint,
      'txt': faFile,
      'jpg': faFile,
      'jpeg': faFile,
      'png': faFile,
      'gif': faFile
    };
    
    return fileTypeIcons[extension] || faFile;
  };
  
  // Handle downloading the file
  const handleDownload = async () => {
    if (resource.type !== 'file') return;
    
    try {
      // Check if we have a local file blob or need to fetch from server
      if (resource.previewUrl) {
        // We have a local file blob
        const link = document.createElement('a');
        link.href = resource.previewUrl;
        link.download = resource.name || resource.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // We need to fetch from the server
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Authentication token missing. Please log in again.');
          return;
        }

        // Get the resource ID
        const resourceId = resource._id || resource.id;
        
        if (!resourceId) {
          console.error('Resource ID is missing');
          alert('Unable to download file: Resource ID is missing');
          return;
        }

        // Instead of window.open, create a fetch request with proper authentication
        // and create a blob URL from the response
        try {
          const response = await fetch(`${config.API_BASE_URL}/resources/${resourceId}/download`, {
            headers: {
              'Authorization': token
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status}`);
          }
          
          // Get the blob from the response
          const blob = await response.blob();
          
          // Create a blob URL for the file
          const blobUrl = window.URL.createObjectURL(blob);
          
          // Create a link and click it to download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = resource.name || resource.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the blob URL
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
          }, 100);
        } catch (error) {
          console.error('Error downloading file:', error);
          alert(`Download error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert(`Failed to download file: ${error.message}`);
    }
  };
  
  // Render different views based on resource type
  const renderResourceContent = () => {
    if (resource.type === 'link') {
      return (
        <div className="link-resource">
          <p><strong>URL:</strong> <a href={resource.url} target="_blank" rel="noopener noreferrer">{resource.url}</a></p>
          {resource.description && (
            <div className="resource-description">
              <h4>Description</h4>
              <p>{resource.description}</p>
            </div>
          )}
          <button className="resource-action-button" onClick={() => window.open(resource.url, '_blank')}>
            <FontAwesomeIcon icon={faEye} /> Visit Link
          </button>
        </div>
      );
    } else if (resource.type === 'folder') {
      return (
        <div className="folder-resource">
          <div className="folder-info">
            <p><strong>Folder:</strong> {resource.name}</p>
            <p><strong>Files:</strong> {resource.files ? resource.files.length : 0}</p>
          </div>
          
          {resource.description && (
            <div className="resource-description">
              <h4>Description</h4>
              <p>{resource.description}</p>
            </div>
          )}
          
          <div className="folder-files">
            <h4>Files</h4>
            {resource.files && resource.files.length > 0 ? (
              <ul className="folder-file-list">
                {resource.files.map((file, index) => (
                  <li key={index} className="folder-file-item">
                    <div className="folder-file-details" onClick={() => {
                      console.log(`Navigating to file in folder, index: ${index}`, file);
                      onNavigate({
                        ...file,
                        _id: resource._id,
                        fileIndex: index,
                        type: 'file'
                      });
                    }}>
                      <FontAwesomeIcon icon={faFile} className="file-icon" />
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{Math.round(file.fileSize / 1024)} KB</span>
                    </div>
                    <button 
                      className="folder-file-download" 
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFolderFile(resource._id, index, file.name);
                      }}
                      title="Download file"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-folder">
                <p>This folder is empty</p>
              </div>
            )}
          </div>
        </div>
      );
    } else if (resource.type === 'file') {
      return (
        <div className="file-resource">
          {getFileDetails()}
          
          {resource.description && (
            <div className="resource-description">
              <h4>Description</h4>
              <p>{resource.description}</p>
            </div>
          )}
          
          {/* File Preview */}
          <FilePreview file={resource} />
          
          <button className="resource-action-button" onClick={handleDownload}>
            <FontAwesomeIcon icon={faDownload} /> Download
          </button>
        </div>
      );
    }
  };
  
  // Function to download a file from a folder
  const downloadFolderFile = async (folderId, fileIndex, fileName) => {
    try {
      console.log(`Downloading file from folder: ${folderId}, index: ${fileIndex}`);
      
      // Get the token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found in localStorage');
        alert('Authentication token missing. Please log in again.');
        return;
      }
      
      // Use fetch with proper headers instead of XMLHttpRequest
      const response = await fetch(`${config.API_BASE_URL}/resources/${folderId}/files/${fileIndex}/download`, {
        method: 'GET',
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server returned error: ${response.status} ${response.statusText}`);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a blob URL for the file
      const blobUrl = URL.createObjectURL(blob);
      
      // Create a link and click it to download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Error downloading file from folder:', error);
      alert(`Failed to download file: ${error.message}`);
    }
  };
  
  return (
    <div className="resource-viewer">
      <div className="resource-viewer-header">
        <div className="resource-title">
          <FontAwesomeIcon icon={getFileTypeIcon(resource)} className="resource-icon" />
          <h3>{resource.name}</h3>
        </div>
        <div className="resource-meta">
          <span>Uploaded by {resource.uploadedBy}</span>
          <span>on {new Date(resource.uploadedAt).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="resource-viewer-content">
        {renderResourceContent()}
      </div>
    </div>
  );
};

export const ProjectDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('kanban');
  const [hasAccess, setHasAccess] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [contributions, setContributions] = useState({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: []
    }]
  });
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignee: '' });
  const [projectUsers, setProjectUsers] = useState([]);
  const [isMessagePanelOpen, setIsMessagePanelOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [lastReadMessageTime, setLastReadMessageTime] = useState(null);
  
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  // Add color mapping state
  const [userColorMap, setUserColorMap] = useState({});
  
  // Refs for the columns to detect drop targets
  const columnRefs = {
    'not-started': useRef(null),
    'in-progress': useRef(null),
    'completed': useRef(null)
  };

  // Column colors
  const columnColors = {
    'not-started': '#3498db',
    'in-progress': '#f39c12',
    'completed': '#2ecc71'
  };

  // Define a color palette with four distinct colors
  const colorPalette = [
    '#FF6B6B', // Red
    '#9B59B6', // Purple
    '#3498DB', // Sky Blue
    '#008000'  // Dark Green
  ];

  // Add state for managing meeting
  const [meetingActive, setMeetingActive] = useState(false);
  const [meetingCreator, setMeetingCreator] = useState(null);

  // Socket reference
  const socketRef = useRef(null);

  // Add state for Jitsi meeting
  const [showMeeting, setShowMeeting] = useState(false);
  const [meetingRoom, setMeetingRoom] = useState('');

  // Add state for Resource Library
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [currentFolderPath, setCurrentFolderPath] = useState('');
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourceError, setResourceError] = useState(null);

  // Fetch project data
  const fetchProject = useCallback(async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching project data for ID:", id);
      
      // Try different API route patterns to ensure compatibility
      // First try with browseprojects prefix (the original)
      let apiBaseRoute = `${config.API_BASE_URL}/browseprojects`;
      let routeWorked = false;
      
      // First fetch the project data
      let response = await fetch(`${apiBaseRoute}/${id}`, {
        headers: {
          'Authorization': token
        }
      });
      
      // If browseprojects route fails, try the projects prefix
      if (!response.ok) {
        console.log("First route failed, trying alternative route prefix");
        apiBaseRoute = `${config.API_BASE_URL}/browseprojects`;
        response = await fetch(`${apiBaseRoute}/${id}`, {
          headers: {
            'Authorization': token
          }
        });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.status} ${response.statusText}`);
      } else {
        routeWorked = true;
      }
      
      const data = await response.json();
      console.log("Project data fetched:", data);
      setProject(data);
      console.log("Using API route:", apiBaseRoute);
      
      // Check if user has access (owner or accepted enrollment)
      const accessResponse = await fetch(`${apiBaseRoute}/${id}/access`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (accessResponse.ok) {
        const accessData = await accessResponse.json();
        console.log("Access check response:", accessData);
        setHasAccess(accessData.hasAccess);
      } else {
        console.log("Access check failed, using client-side fallback");
        // Use client-side fallback if API fails
        const hasAccess = checkAccessClientSide(data);
        setHasAccess(hasAccess);
      }
      
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Error loading project dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, token, navigate]);

  // Fallback client-side access check
  const checkAccessClientSide = (projectData) => {
    if (!projectData) return false;
    
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) return false;
    
    // Check if user is the project owner
    const isOwner = projectData.userId === currentUserId;
    
    // Check if user is enrolled
    const isEnrolled = projectData.enrolledUsers && 
                      Array.isArray(projectData.enrolledUsers) &&
                      projectData.enrolledUsers.some(id => 
                        id.toString() === currentUserId || 
                        (typeof id === 'object' && id._id && id._id.toString() === currentUserId)
                      );
    
    return isOwner || isEnrolled;
  };

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Load mock tasks and contributions data (this would come from an API in a real application)
  useEffect(() => {
    if (project) {
      // Initialize tasks state from project data if available
      if (project.tasks && Array.isArray(project.tasks)) {
        const tasksByStatus = {
          'not-started': [],
          'in-progress': [],
          'completed': []
        };
        
        // Organize tasks by their status
        project.tasks.forEach(task => {
          if (task && tasksByStatus[task.status]) {
            tasksByStatus[task.status].push(task);
          } else if (task) {
            // Default to not-started for tasks with invalid status
            tasksByStatus['not-started'].push({
              ...task,
              status: 'not-started'
            });
          }
        });
        
        setTasks(tasksByStatus);
      } else {
        // If no tasks in project data, use mock data
        const mockTasks = {
          'not-started': [
            { id: 'task-1', title: 'Create project plan', description: 'Outline the project scope and timeline', assignee: username || 'You' },
            { id: 'task-2', title: 'Define requirements', description: 'Document functional requirements', assignee: project.ownerUsername || 'Project Owner' }
          ],
          'in-progress': [
            { id: 'task-3', title: 'Design UI mockups', description: 'Create wireframes and prototypes', assignee: username || 'You' }
          ],
          'completed': [
            { id: 'task-4', title: 'Project kickoff', description: 'Initial team meeting', assignee: project.ownerUsername || 'Project Owner' }
          ]
        };
        
        setTasks(mockTasks);
      }
      
      // We'll update contributions when tasks change
    }
  }, [project, username]);

  // Add new useEffect to update the contributions chart whenever tasks change
  useEffect(() => {
    if (project && projectUsers.length > 0) {
      updateContributionsChart();
    }
  }, [tasks, projectUsers, project]);

  // Function to update the contributions chart based on completed tasks
  const updateContributionsChart = () => {
    if (!project || !projectUsers.length) return;

    // Get all completed tasks
    const completedTasks = tasks["completed"] || [];
    
    // Create a map to count completed tasks by user
    const taskCountByUser = {};
    
    // Initialize counts for all project users
    projectUsers.forEach(user => {
      taskCountByUser[user.username] = 0;
    });
    
    // Count completed tasks for each user
    completedTasks.forEach(task => {
      if (task && task.assignee) {
        taskCountByUser[task.assignee] = (taskCountByUser[task.assignee] || 0) + 1;
      }
    });
    
    // Get all users who have completed tasks or are in the project
    const allUsernames = Object.keys(taskCountByUser);

    // Assign colors from the palette based on the user index
    const userColors = {};
    allUsernames.forEach((username, index) => {
      // Give the owner a specific color (the last one in the palette)
      if (username === project.ownerUsername) {
        userColors[username] = colorPalette[3]; // Dark Green from the palette
      } else {
        userColors[username] = colorPalette[index % (colorPalette.length - 1)]; // Cycle through the first 3 colors
      }
    });
    
    // Update the contributions state
    setContributions({
      labels: allUsernames,
      datasets: [
        {
          label: 'Completed Tasks',
          data: allUsernames.map(username => taskCountByUser[username] || 0),
          backgroundColor: allUsernames.map(username => userColors[username]),
          borderColor: allUsernames.map(username => adjustColorBrightness(userColors[username], -20)),
          borderWidth: 1,
        },
      ],
    });
  };

  // Modify the getRandomColor function to ensure unique colors for enrolled users and the owner
  const getRandomColor = (username) => {
    // If user already has a color, return it
    if (userColorMap[username]) {
      return userColorMap[username];
    }

    // Find first available color from palette
    const usedColors = new Set(Object.values(userColorMap));
    let availableColor = colorPalette.find(color => !usedColors.has(color));

    // If no available color from the palette, generate a distinct one
    if (!availableColor) {
      // Generate a color based on username hash to ensure consistency
      const hashCode = username.split('').reduce(
        (hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0
      );
      const hue = Math.abs(hashCode % 360);
      availableColor = `hsl(${hue}, 70%, 65%)`;
    }
    
    // Update color mapping
    setUserColorMap(prev => ({
      ...prev,
      [username]: availableColor
    }));

    return availableColor;
  };

  // Adjust color brightness (for borders)
  const adjustColorBrightness = (color, amount) => {
    if (!color) {
      return `hsl(${Math.floor(Math.random() * 360)}, 70%, ${Math.max(Math.min(65 + amount, 100), 0)}%)`;
    }

    if (color.startsWith('#')) {
      let hex = color.slice(1);
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      
      let rgb = parseInt(hex, 16);
      let r = (rgb >> 16) + amount;
      let g = ((rgb >> 8) & 0x00FF) + amount;
      let b = (rgb & 0x0000FF) + amount;
      
      r = Math.max(Math.min(255, r), 0);
      g = Math.max(Math.min(255, g), 0);
      b = Math.max(Math.min(255, b), 0);
      
      return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    } else if (color.startsWith('hsl')) {
      try {
        // Parse the hsl color
        const [h, s, l] = color.match(/\d+/g).map(Number);
        // Adjust lightness for brighter/darker
        const newL = Math.max(Math.min(l + amount, 100), 0);
        return `hsl(${h}, ${s}%, ${newL}%)`;
      } catch (error) {
        // If parsing fails, return a fallback color
        return `hsl(${Math.floor(Math.random() * 360)}, 70%, ${Math.max(Math.min(65 + amount, 100), 0)}%)`;
      }
    }
    return color;
  };

  const handleBackToProjects = () => {
    navigate('/main/myprojects');
  };

  // Handle task drag end with Framer Motion
  const handleTaskDragEnd = (event, info, task, sourceColumnId) => {
    // Get the current pointer position
    const { point } = info;
    
    // Find all column elements
    const columns = document.querySelectorAll('.task-list');
    let targetColumn = null;
    
    // Find which column the pointer is over
    columns.forEach(column => {
      const rect = column.getBoundingClientRect();
      if (
        point.x >= rect.left &&
        point.x <= rect.right &&
        point.y >= rect.top &&
        point.y <= rect.bottom
      ) {
        targetColumn = column;
      }
    });
    
    // If not dropped on a column or dropped on the same column, do nothing
    if (!targetColumn) return;
    
    const targetColumnId = targetColumn.getAttribute('data-status');
    if (targetColumnId === sourceColumnId) return;
    
    console.log(`Moving task from ${sourceColumnId} to ${targetColumnId}`);
    
    // Validate that the target status is one of the accepted enum values
    if (!['not-started', 'in-progress', 'completed'].includes(targetColumnId)) {
      console.error(`Invalid target status: ${targetColumnId}. Must be one of: not-started, in-progress, completed`);
      return;
    }
    
    // Update tasks state
    const newTasks = { ...tasks };
    
    // Remove from source column
    newTasks[sourceColumnId] = newTasks[sourceColumnId].filter(t => t.id !== task.id);
    
    // Add to target column with updated status
    const updatedTask = { ...task, status: targetColumnId };
    newTasks[targetColumnId] = [...newTasks[targetColumnId], updatedTask];
    
    // Update UI state first for responsiveness
    setTasks(newTasks);
    
    // Update on server
    updateTaskOnServer(task.id, { status: targetColumnId })
      .catch(error => {
        console.error('Error updating task status:', error);
        // Revert state on error
        setTasks(tasks);
        // Alert the user
        alert(`Failed to update task status: ${error.message}`);
      });
  };

  // Fetch project users
  const fetchProjectUsers = useCallback(async () => {
    if (!token || !id) return;
    
    try {
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/users`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch project users: ${response.status} ${response.statusText}`);
      }
      
      const users = await response.json();
      console.log("Project users fetched:", users);
      setProjectUsers(users);
      
      // If we're editing a task, make sure the assignee is in the users list
      if (editingTask && !users.some(user => user.username === editingTask.assignee)) {
        setEditingTask({
          ...editingTask,
          assignee: username || 'You'
        });
      }
      
      // After fetching users, make sure to update the contributions chart
      updateContributionsChart();
    } catch (error) {
      console.error('Error fetching project users:', error);
    }
  }, [id, token, editingTask, username]);

  useEffect(() => {
    if (hasAccess) {
      fetchProjectUsers();
    }
  }, [hasAccess, fetchProjectUsers]);

  // Handle creating a new task
  const handleCreateTask = async () => {
    if (!newTask.title) return;
    
    const taskId = `task-${Date.now()}`;
    const task = {
      id: taskId,
      title: newTask.title,
      description: newTask.description || '',
      assignee: newTask.assignee || username,
      status: 'not-started',
      createdBy: username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to server first
    const savedTask = await saveTaskToProject(task);
    
    // If save was successful, update local state
    if (savedTask) {
      setTasks({
        ...tasks,
        'not-started': [...tasks['not-started'], savedTask]
      });
      
      setNewTask({ title: '', description: '', assignee: '' });
      setIsCreateTaskModalOpen(false);
    }
  };

  // Handle editing a task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description,
      assignee: task.assignee
    });
    setIsCreateTaskModalOpen(true);
  };

  // Handle updating a task
  const handleUpdateTask = async () => {
    // Find which column contains the task
    let columnId = '';
    let taskIndex = -1;
    
    for (const [col, taskList] of Object.entries(tasks)) {
      const index = taskList.findIndex(t => t.id === editingTask.id);
      if (index >= 0) {
        columnId = col;
        taskIndex = index;
        break;
      }
    }
    
    if (columnId === '' || taskIndex === -1) return;
    
    // Prepare updates
    const updates = {
      title: newTask.title,
      description: newTask.description,
      assignee: newTask.assignee
    };
    
    // Update on server first
    const updatedTask = await updateTaskOnServer(editingTask.id, updates);
    
    // If update was successful, update local state
    if (updatedTask) {
      const updatedTasks = { ...tasks };
      updatedTasks[columnId][taskIndex] = {
        ...editingTask,
        ...updatedTask
      };
      
      setTasks(updatedTasks);
      setEditingTask(null);
      setNewTask({ title: '', description: '', assignee: '' });
      setIsCreateTaskModalOpen(false);
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId) => {
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    // Delete from server first
    const success = await deleteTaskFromServer(taskId);
    
    // If deletion was successful, update local state
    if (success) {
      const updatedTasks = { ...tasks };
      
      // Find which column contains the task
      for (const [col, taskList] of Object.entries(tasks)) {
        const index = taskList.findIndex(t => t.id === taskId);
        if (index >= 0) {
          // If deleting from completed column, the pie chart will auto-update 
          // from the useEffect that watches tasks
          const task = taskList[index];
          
          updatedTasks[col] = taskList.filter(t => t.id !== taskId);
          break;
        }
      }
      
      setTasks(updatedTasks);
      console.log(`Task ${taskId} deleted successfully`);
    } else {
      // If server deletion failed, ask if user wants to remove from UI anyway
      const removeFromUI = window.confirm(
        'Failed to delete task from server. Would you like to remove it from the dashboard anyway?'
      );
      
      if (removeFromUI) {
        const updatedTasks = { ...tasks };
        
        // Find which column contains the task
        for (const [col, taskList] of Object.entries(tasks)) {
          const index = taskList.findIndex(t => t.id === taskId);
          if (index >= 0) {
            // If deleting from completed column, the pie chart will auto-update
            // from the useEffect that watches tasks
            
            updatedTasks[col] = taskList.filter(t => t.id !== taskId);
            break;
          }
        }
        
        setTasks(updatedTasks);
        console.log(`Task ${taskId} removed from UI only`);
      }
    }
  };

  const saveTaskToProject = async (task) => {
    try {
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username') || '';
      
      // Check if we have access to the project object and get the owner username
      const ownerUsername = (project && project.ownerUsername) ? project.ownerUsername : username;
      
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          assignee: task.assignee,
          ownerUsername: ownerUsername
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save task');
      }
      
      const savedTask = await response.json();
      console.log('Task saved successfully:', savedTask);
      return savedTask;
    } catch (error) {
      console.error('Error saving task:', error);
      // You might want to show an error message to the user here
    }
  };

  const updateTaskOnServer = async (taskId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username') || '';
      
      console.log(`Updating task ${taskId} with data:`, updates);
      
      // Get the owner username from the project if possible
      const ownerUsername = (project && project.ownerUsername) ? project.ownerUsername : username;
      
      // Include ownerUsername in the updates
      const updatedData = {
        ...updates,
        ownerUsername: ownerUsername
      };
      
      console.log('Sending update with data:', updatedData);
      
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(updatedData)
      });
      
      // Log the status of the response
      console.log(`Server response status: ${response.status}`);
      
      if (!response.ok) {
        // Get more details about the error
        const errorText = await response.text();
        console.error(`Server responded with status ${response.status}: ${errorText}`);
        throw new Error(`Failed to update task: ${response.status} ${response.statusText}`);
      }
      
      const updatedTask = await response.json();
      console.log('Task updated successfully:', updatedTask);
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error; // Re-throw the error to be handled by the caller
    }
  };

  const deleteTaskFromServer = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Log the task ID and project ID for debugging
      console.log(`Attempting to delete task ${taskId} from project ${id}`);
      
      // The server has a specific endpoint for deleting tasks: /:id/tasks/:taskId
      // This is defined in the server routes
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Get more details about the error
        const errorText = await response.text();
        console.error(`Server responded with status ${response.status}: ${errorText}`);
        
        // If the API attempt fails, we'll still allow the user to remove the task from the UI
        console.log('API deletion attempt failed, but we will still allow UI removal');
        return false;
      }
      
      console.log('Task deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      // Show a more detailed error message to the user
      alert(`Failed to delete task: ${error.message}`);
      return false;
    }
  };

  // Toggle message panel
  const toggleMessagePanel = () => {
    setIsMessagePanelOpen(!isMessagePanelOpen);
    
    // Reset unread count when opening the message panel
    if (!isMessagePanelOpen) {
      setUnreadMessageCount(0);
      setLastReadMessageTime(new Date());
    }
  };

  // Check for unread messages when project is loaded
  useEffect(() => {
    if (project && project.messages && project.messages.length > 0) {
      // If we haven't read any messages yet, all messages are unread
      if (!lastReadMessageTime) {
        setUnreadMessageCount(project.messages.length);
        return;
      }
      
      // Count messages newer than the last read time
      const lastReadTime = new Date(lastReadMessageTime);
      const unreadCount = project.messages.filter(
        msg => new Date(msg.timestamp) > lastReadTime
      ).length;
      
      setUnreadMessageCount(unreadCount);
    }
  }, [project, lastReadMessageTime]);

  // Handler for new message notifications
  const handleNewMessage = (message) => {
    // Increment unread count if message panel is closed
    if (!isMessagePanelOpen) {
      setUnreadMessageCount(prev => prev + 1);
    }
  };

  // Pass the handler to the MessagePanel component
  const messagePanelProps = {
    isOpen: isMessagePanelOpen,
    onClose: toggleMessagePanel,
    projectId: id,
    currentUsername: username,
    projectTitle: project?.title,
    onNewMessage: handleNewMessage,
    themeColors: {
      primary: 'rgb(41, 44, 88)',
      secondary: '#3498db'
    }
  };

  // Create a meeting function
  const createMeeting = async () => {
    try {
      // Check if token exists
      if (!token) {
        alert('Authentication token missing. Please log in again.');
        navigate('/login');
        return;
      }

      // Generate a unique meeting room ID based on project ID and timestamp
      const roomName = `schulen-project-${id}-${Date.now()}`;
      setMeetingRoom(roomName);
      
      console.log(`Creating meeting with room name: ${roomName}`);
      console.log(`Using token: ${token.substring(0, 10)}...`);
      
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/meeting`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          active: true,
          creatorUsername: username,
          roomName: roomName
        })
      });

      // Get full response text for better debugging
      const responseText = await response.text();
      console.log('Server response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Server returned invalid JSON: ${responseText}`);
      }

      if (!response.ok) {
        console.error('Server responded with error:', response.status, data);
        throw new Error(`Failed to create meeting: ${data.message || response.statusText}`);
      }
      
      // Update local state
      setMeetingActive(data.meetingActive);
      setMeetingCreator(data.meetingCreator);
      
      // Update the project state as well
      setProject({
        ...project,
        meetingActive: data.meetingActive,
        meetingCreator: data.meetingCreator,
        meetingStartTime: data.meetingStartTime,
        meetingRoom: roomName
      });

      // Emit socket event to notify other users
      if (socketRef.current) {
        socketRef.current.emit('meetingStatusChanged', {
          projectId: id,
          active: true,
          creator: username,
          roomName: roomName
        });
      }
      
      // Show the meeting interface
      setShowMeeting(true);

    } catch (error) {
      console.error('Error creating meeting:', error);
      alert(`Failed to create meeting: ${error.message}`);
    }
  };

  // Enter existing meeting
  const joinMeeting = () => {
    // Use the room name from the project state
    if (project && project.meetingRoom) {
      setMeetingRoom(project.meetingRoom);
      setShowMeeting(true);
    } else {
      alert('Meeting room information is missing. Please try again later.');
    }
  };

  // Handle closing the meeting
  const closeMeeting = async () => {
    try {
      // Close the meeting UI first to provide immediate feedback
      setShowMeeting(false);
      
      // If the user is the creator, end the meeting for everyone
      if (meetingCreator === username) {
        await endMeeting();
      } else {
        console.log('Left meeting without ending it for everyone');
      }
    } catch (error) {
      console.error('Error in closeMeeting:', error);
      // The UI is already closed at this point, so we just log the error
    }
  };

  // End a meeting function
  const endMeeting = async () => {
    try {
      console.log('Ending meeting for all participants...');
      
      // First, check if meeting is actually active to avoid unnecessary API calls
      if (!meetingActive) {
        console.log('Meeting is already inactive, skipping API call');
        setShowMeeting(false);
        return;
      }
      
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/meeting`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          active: false
        })
      });

      // Log the raw response for debugging
      console.log(`End meeting response status: ${response.status}`);
      
      // Get the response text for better error handling
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      // Try to parse the JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing response:', e);
        throw new Error(`Server returned invalid JSON: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(`Server error: ${data.message || response.statusText}`);
      }
      
      // Update local state
      setMeetingActive(false);
      setMeetingCreator(null);
      setMeetingRoom('');
      setShowMeeting(false);
      
      // Update the project state as well
      setProject({
        ...project,
        meetingActive: false,
        meetingCreator: null,
        meetingStartTime: null,
        meetingRoom: null
      });

      // Emit socket event to notify other users
      if (socketRef.current) {
        socketRef.current.emit('meetingStatusChanged', {
          projectId: id,
          active: false,
          creator: null,
          roomName: null
        });
      }

      console.log('Meeting ended successfully for all participants');
    } catch (error) {
      console.error('Error ending meeting:', error);
      
      // Even if the API call fails, we should update the UI state
      // This ensures the user can still close the meeting interface
      setShowMeeting(false);
      
      // Show a more helpful error message
      alert(`Failed to end meeting: ${error.message}. The meeting interface has been closed, but the meeting may still be active for other users.`);
    }
  };

  // Socket.io connection
  useEffect(() => {
    if (hasAccess && id) {
      // Connect to socket.io server
      socketRef.current = io(config.API_BASE_URL);
      
      // Join project room
      socketRef.current.emit('joinProject', id);
      
      // Listen for meeting status changes
      socketRef.current.on('meetingStatusChanged', (data) => {
        console.log('Meeting status changed:', data);
        setMeetingActive(data.active);
        setMeetingCreator(data.creator);
        
        // Update project state with room information
        setProject(prevProject => ({
          ...prevProject,
          meetingActive: data.active,
          meetingCreator: data.creator,
          meetingStartTime: data.active ? new Date() : null,
          meetingRoom: data.roomName
        }));
        
        // If meeting ended, close the meeting interface
        if (!data.active && showMeeting) {
          console.log('Meeting was ended by the creator. Closing interface...');
          setShowMeeting(false);
          
          // Show a notification to the user
          if (data.creator !== username) {
            alert('The meeting has been ended by the host.');
          }
        }
      });
      
      // Cleanup on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.emit('leaveProject', id);
          socketRef.current.disconnect();
        }
      };
    }
  }, [hasAccess, id, showMeeting, username]);

  // Fetch meeting status when project is loaded
  useEffect(() => {
    if (project) {
      setMeetingActive(project.meetingActive || false);
      setMeetingCreator(project.meetingCreator || null);
    }
  }, [project]);

  // Fetch resources from the backend
  const fetchResources = useCallback(async () => {
    if (!token || !id) return;
    
    try {
      setResourcesLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/resources`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch resources: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Fetched resources:", data);
      setResources(data);
      setResourcesLoading(false);
    } catch (error) {
      console.error('Error fetching resources:', error);
      setResourceError(error.message);
      setResourcesLoading(false);
    }
  }, [id, token]);

  // Load resources when the dashboard is loaded
  useEffect(() => {
    if (hasAccess) {
      fetchResources();
    }
  }, [hasAccess, fetchResources]);

  // Add a function to handle resource upload
  const handleResourceUpload = (resourceData) => {
    // Add the new resource to the state
    setResources(prev => [...prev, resourceData]);
    
    // Select the newly uploaded resource
    setSelectedResource(resourceData);
  };

  // Function to handle resource rename
  const handleRenameResource = (oldResource, updatedResource) => {
    // Get resource IDs (either MongoDB _id or client-side id)
    const oldResourceId = oldResource._id || oldResource.id;
    
    // Update the resources state with the renamed resource
    setResources(prev => 
      prev.map(res => {
        const resId = res._id || res.id;
        return resId === oldResourceId ? updatedResource : res;
      })
    );
    
    // If the renamed resource is currently selected, update it
    if (selectedResource) {
      const selectedId = selectedResource._id || selectedResource.id;
      if (selectedId === oldResourceId) {
        setSelectedResource(updatedResource);
      }
    }
  };

  // Function to handle resource deletion
  const handleDeleteResource = (deletedResource) => {
    // Get resource ID (either MongoDB _id or client-side id)
    const deletedResourceId = deletedResource._id || deletedResource.id;
    
    // Remove the resource from the state
    setResources(prev => {
      return prev.filter(res => {
        const resId = res._id || res.id;
        return resId !== deletedResourceId;
      });
    });
    
    // If the deleted resource was selected, clear the selection
    if (selectedResource) {
      const selectedId = selectedResource._id || selectedResource.id;
      if (selectedId === deletedResourceId) {
        setSelectedResource(null);
      }
    }
  };
  
  // Function to navigate to a file within a folder
  const handleNavigateToFile = (file) => {
    console.log('Navigating to file:', file);
    
    // Make sure all necessary properties are correctly set
    const fileObj = {
      ...file,
      type: 'file',
      _id: file._id,
      fileIndex: file.fileIndex
    };
    
    console.log('Setting selected resource to:', fileObj);
    // Set the selected file as the selected resource
    setSelectedResource(fileObj);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="project-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading project dashboard...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="project-dashboard error">
        <div className="error-message">
          <h3>{error}</h3>
          <p>Redirecting to My Projects...</p>
          <button onClick={handleBackToProjects}>Go back now</button>
        </div>
      </div>
    );
  }

  // Render no access state
  if (!hasAccess) {
    return (
      <div className="project-dashboard no-access">
        <div className="no-access-message">
          <h3>Access Denied</h3>
          <p>You do not have access to this project dashboard.</p>
          <button onClick={handleBackToProjects}>Back to My Projects</button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <button className="dashboard-back-button" onClick={handleBackToProjects}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Projects
        </button>
        <h1>{project?.title || 'Project Dashboard'}</h1>
        <div className="dashboard-actions">
          <button className="messages-button" onClick={toggleMessagePanel}>
            <FontAwesomeIcon icon={faComment} /> Messages
            {unreadMessageCount > 0 && (
              <span className="message-notification">{unreadMessageCount}</span>
            )}
          </button>
          <button className="profile-button">
            <FontAwesomeIcon icon={faUser} /> Profile
          </button>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Sidebar Navigation */}
        <div className="dashboard-sidebar">
          <button 
            className={activeTab === 'kanban' ? 'active' : ''} 
            onClick={() => setActiveTab('kanban')}
          >
            <FontAwesomeIcon icon={faColumns} /> Kanban Chart
          </button>
          <button 
            className={activeTab === 'virtual-meet' ? 'active' : ''} 
            onClick={() => setActiveTab('virtual-meet')}
          >
            <FontAwesomeIcon icon={faVideo} /> Virtual Meet
          </button>
          <button 
            className={activeTab === 'whiteboard' ? 'active' : ''} 
            onClick={() => setActiveTab('whiteboard')}
          >
            <FontAwesomeIcon icon={faChalkboard} /> White Board
          </button>
          <button 
            className={activeTab === 'resources' ? 'active' : ''} 
            onClick={() => setActiveTab('resources')}
          >
            <FontAwesomeIcon icon={faBook} /> Resource Library
          </button>
          <button 
            className={activeTab === 'ide' ? 'active' : ''} 
            onClick={() => setActiveTab('ide')}
          >
            <FontAwesomeIcon icon={faCode} /> IDE
          </button>
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {activeTab === 'kanban' && (
            <div className="kanban-view">
              <div className="section-header">
                <h3>Task Management</h3>
                <button className="add-button" onClick={() => setIsCreateTaskModalOpen(true)}>
                  <FontAwesomeIcon icon={faPlus} /> Create Task
                </button>
              </div>

              {/* Kanban Board with Framer Motion */}
              <div className="kanban-board">
                <KanbanColumn
                  title="Not Yet Started"
                  status="not-started"
                  tasks={tasks["not-started"]}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onDragEnd={handleTaskDragEnd}
                  color={columnColors['not-started']}
                />
                <KanbanColumn
                  title="In Progress"
                  status="in-progress"
                  tasks={tasks["in-progress"]}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onDragEnd={handleTaskDragEnd}
                  color={columnColors['in-progress']}
                />
                <KanbanColumn
                  title="Completed"
                  status="completed"
                  tasks={tasks["completed"]}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onDragEnd={handleTaskDragEnd}
                  color={columnColors['completed']}
                />
              </div>

              {/* Contribution Section */}
              <div className="contribution-section">
                <h3>Contribution</h3>
                <div className="contribution-chart">
                  <Pie 
                    data={contributions} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: true,
                      plugins: {
                        title: {
                          display: true,
                          text: 'Team Task Contributions',
                          font: {
                            size: 16,
                            weight: 'bold'
                          },
                          padding: {
                            top: 10,
                            bottom: 20
                          }
                        },
                        legend: {
                          position: 'bottom',
                          labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                              size: 12
                            }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const label = context.label || '';
                              const value = context.raw || 0;
                              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                              const percentage = Math.round((value / total) * 100);
                              return `${label}: ${value} tasks (${percentage}%)`;
                            }
                          }
                        }
                      },
                      animation: {
                        animateScale: true,
                        animateRotate: true
                      }
                    }} 
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'virtual-meet' && (
            <div className="virtual-meet-view">
              <div className="section-header">
                <h3>Virtual Meet</h3>
              </div>
              {meetingActive ? (
                <div className="meeting-active">
                  {meetingCreator === username ? (
                    <>
                      <p>You started a meeting. Share with your team!</p>
                      <div className="meeting-buttons">
                        <button className="primary-button" onClick={joinMeeting}>Enter Meeting Room</button>
                        <button className="secondary-button" onClick={closeMeeting}>End Meeting</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{meetingCreator} has started a meeting</p>
                      <button className="primary-button" onClick={joinMeeting}>Join Meeting</button>
                    </>
                  )}
                </div>
              ) : (
                <div className="meeting-controls">
                  {/* Show meeting controls to both owner and enrolled users */}
                  {(checkAccessClientSide(project) || project?.enrolledUsers?.includes(localStorage.getItem('userId'))) && (
                    <>
                      <div className="meeting-actions">
                        <button className="primary-button" onClick={createMeeting}>Create Meeting</button>
                        <button className="secondary-button">Schedule Meeting</button>
                      </div>
                    </>
                  )}
                  <div className="empty-state">
                    <p>No active meetings at the moment.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'whiteboard' && (
            <div className="whiteboard-view">
              <div className="section-header">
                <h3>White Board</h3>
              </div>
              <WhiteboardComponent 
                projectId={id} 
                username={username || localStorage.getItem('username')} 
              />
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="resources-view">
              <div className="section-header">
                <h3>Resource Library and Knowledge Base</h3>
                <button className="add-button" onClick={() => setIsResourceModalOpen(true)}>
                  <FontAwesomeIcon icon={faPlus} /> Add Resource
                </button>
              </div>
              
              <div className="resources-container">
                {/* File Tree */}
                <div className="resource-sidebar">
                  <ResourceFileTree 
                    resources={resources}
                    onSelectResource={setSelectedResource}
                    selectedResource={selectedResource}
                    currentPath={currentFolderPath}
                    onDeleteResource={handleDeleteResource}
                    onRenameResource={handleRenameResource}
                  />
                </div>
                
                {/* Resource Content */}
                <div className="resource-content">
                  {selectedResource ? (
                    <ResourceViewer 
                      resource={selectedResource}
                      onClose={() => setSelectedResource(null)}
                      onNavigate={handleNavigateToFile}
                    />
                  ) : (
                    <div className="empty-resource-viewer">
                      <FontAwesomeIcon icon={faFileAlt} className="empty-icon" />
                      <p>Select a resource to view its details</p>
                      <button className="add-resource-btn" onClick={() => setIsResourceModalOpen(true)}>
                        <FontAwesomeIcon icon={faPlus} /> Add Resource
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ide' && (
            <div className="ide-view">
              <div className="section-header">
                <h3>Integrated Development Environment</h3>
              </div>
              <div className="empty-state">
                <p>IDE functionality is not yet implemented.</p>
                <button>Start coding</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      {isCreateTaskModalOpen && (
        <div className="modal-overlay">
          <div className="task-modal">
            <h3>{editingTask ? 'Edit Task' : 'Create Task'}</h3>
            <div className="form-group">
              <label>Title</label>
              <input 
                type="text" 
                value={newTask.title} 
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                placeholder="Enter task title"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea 
                value={newTask.description} 
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                placeholder="Enter task description"
              />
            </div>
            <div className="form-group">
              <label>Assignee</label>
              <select 
                value={newTask.assignee} 
                onChange={(e) => setNewTask({...newTask, assignee: e.target.value})}
                className="assignee-dropdown"
              >
                <option value="">Select assignee</option>
                {projectUsers.map(user => (
                  <option key={user.userId} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => {
                setIsCreateTaskModalOpen(false);
                setEditingTask(null);
                setNewTask({ title: '', description: '', assignee: '' });
              }}>
                Cancel
              </button>
              <button 
                className="save-button" 
                onClick={editingTask ? handleUpdateTask : handleCreateTask}
                disabled={!newTask.title}
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resource Upload Modal */}
      <ResourceUploadModal 
        isOpen={isResourceModalOpen}
        onClose={() => setIsResourceModalOpen(false)}
        onUpload={handleResourceUpload}
        projectId={id}
      />

      {project && (
        <MessagePanel {...messagePanelProps} />
      )}

      {/* Jitsi Meet Component */}
      {showMeeting && (
        <JitsiMeetComponent
          roomName={meetingRoom}
          displayName={username}
          onClose={closeMeeting}
          isCreator={meetingCreator === username}
        />
      )}
    </div>
  );
};

export default ProjectDashboard; 