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
  faCode
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
                <button className="add-button">
                  <FontAwesomeIcon icon={faPlus} /> Add Resource
                </button>
              </div>
              <div className="empty-state">
                <p>No resources have been added to this project yet.</p>
                <button>Upload your first resource</button>
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