import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProjectDashboard.css';
import config from '../config';
import { FontAwesomeIcon } from '../fontawesome';
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
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// StrictMode compatibility for react-beautiful-dnd
// This is needed because React 18 StrictMode causes issues with the library
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Using a timeout to prevent React 18 double-rendering issues
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
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

export const ProjectDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('kanban');
  const [hasAccess, setHasAccess] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [contributions, setContributions] = useState(initialContributions);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignee: '' });
  
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

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
        
        if (!accessData.hasAccess) {
          console.log("Access denied by API");
          
          // Direct access check for enrolled users
          const currentUserId = localStorage.getItem('userId');
          
          // Perform client-side check with the project data
          if (data.enrolledUsers && Array.isArray(data.enrolledUsers)) {
            // Check if current user is in the enrolledUsers array
            const isDirectlyEnrolled = data.enrolledUsers.some(userId => 
              userId === currentUserId || 
              (userId && userId.toString && userId.toString() === currentUserId)
            );
            
            if (isDirectlyEnrolled) {
              console.log("User is directly enrolled in the project, overriding API response");
              setHasAccess(true);
              setError(null);
              return; // Skip the error message and redirect
            }
          }
          
          setError('You do not have access to this project dashboard');
          setTimeout(() => {
            navigate('/main/myprojects');
          }, 3000);
        }
      } else {
        console.log("Access check failed, falling back to client-side check");
        // Fallback to client-side access check
        checkAccessClientSide(data);
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
    if (!projectData || !username) {
      setHasAccess(false);
      return;
    }

    const currentUserId = localStorage.getItem('userId');

    // Check if user is the owner
    if (projectData.userId === currentUserId || 
        (projectData.userId && projectData.userId.toString() === currentUserId)) {
      setHasAccess(true);
      return;
    }

    // Check if user is enrolled
    let isEnrolled = false;

    // Check enrollment structure - handle both object IDs and string comparisons
    if (projectData.enrolledUsers && Array.isArray(projectData.enrolledUsers)) {
      isEnrolled = projectData.enrolledUsers.some(enrolledUser => {
        // If enrolledUser is an object with username property
        if (typeof enrolledUser === 'object' && enrolledUser !== null) {
          // Check if username matches
          if (enrolledUser.username === username) return true;
          
          // Check if it has an _id property that matches userId
          if (enrolledUser._id === currentUserId) return true;
        }
        
        // If enrolledUser is a string representation of userId
        if (typeof enrolledUser === 'string' && (enrolledUser === currentUserId)) return true;
        
        // If enrolledUser is an object ID
        if (enrolledUser && typeof enrolledUser.toString === 'function') {
          return enrolledUser.toString() === currentUserId;
        }
        
        return false;
      });
    }

    // Check legacy enrollments
    if (!isEnrolled && projectData.enrollments && Array.isArray(projectData.enrollments)) {
      isEnrolled = projectData.enrollments.some(enrollment => 
        (enrollment.username === username && enrollment.status === 'accepted') ||
        (enrollment.userId === currentUserId && enrollment.status === 'accepted')
      );
    }

    console.log("Access check result:", { isEnrolled, userId: currentUserId, enrolledUsers: projectData.enrolledUsers });
    setHasAccess(isEnrolled);
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
      
      // Set up contribution data
      if (project.contributions && Array.isArray(project.contributions) && project.contributions.length > 0) {
        // Use contribution data from project
        setContributions({
          labels: project.contributions.map(contrib => contrib.username || 'Unknown'),
          datasets: [
            {
              label: 'Completed Tasks',
              data: project.contributions.map(contrib => contrib.taskCount || 0),
              backgroundColor: project.contributions.map(contrib => 
                contrib.color || getRandomColor(contrib.username || 'user-' + Math.random())),
              borderColor: project.contributions.map(contrib => 
                adjustColorBrightness(contrib.color || getRandomColor(contrib.username || 'user-' + Math.random()), -20)),
              borderWidth: 1,
            },
          ],
        });
      } else {
        // Generate mock contribution data
        const users = [
          username || 'You', 
          project.ownerUsername || 'Project Owner'
        ].filter(Boolean); // Filter out any undefined values
        
        // Create a local copy of tasks to avoid dependency on the tasks state
        const localCompletedTasks = project.tasks && Array.isArray(project.tasks) 
          ? project.tasks.filter(task => task && task.status === 'completed')
          : [];
        
        const completedTasksCount = {
          [username || 'You']: localCompletedTasks.filter(task => 
            task && task.assignee === (username || 'You')).length,
          [project.ownerUsername || 'Project Owner']: localCompletedTasks.filter(task => 
            task && task.assignee === (project.ownerUsername || 'Project Owner')).length
        };
        
        // Generate unique colors for each user
        const userColors = {};
        users.forEach(user => {
          userColors[user] = getRandomColor(user);
        });
        
        setContributions({
          labels: users,
          datasets: [
            {
              label: 'Completed Tasks',
              data: users.map(user => completedTasksCount[user] || 0),
              backgroundColor: users.map(user => userColors[user]),
              borderColor: users.map(user => adjustColorBrightness(userColors[user], -20)),
              borderWidth: 1,
            },
          ],
        });
      }
    }
  }, [project, username]); // Removed tasks from dependencies to avoid infinite loop

  // Generate a consistent color based on username string
  const getRandomColor = (str) => {
    // Handle undefined or null input
    if (!str) {
      return `hsl(${Math.floor(Math.random() * 360)}, 70%, 65%)`;
    }

    // Generate a hash from the string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to RGB
    const hue = ((hash % 360) + 360) % 360; // Ensure positive value
    return `hsl(${hue}, 70%, 65%)`;
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

  // Handle drag and drop
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    
    // Dropped outside a droppable area
    if (!destination) return;
    
    // No change in position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    // Moving within the same column
    if (source.droppableId === destination.droppableId) {
      const column = Array.from(tasks[source.droppableId]);
      const [removed] = column.splice(source.index, 1);
      column.splice(destination.index, 0, removed);
      
      setTasks({
        ...tasks,
        [source.droppableId]: column
      });
      return;
    }
    
    // Moving from one column to another
    const sourceColumn = Array.from(tasks[source.droppableId]);
    const destColumn = Array.from(tasks[destination.droppableId]);
    const [removed] = sourceColumn.splice(source.index, 1);
    destColumn.splice(destination.index, 0, removed);
    
    // Update local state first for better UX
    setTasks({
      ...tasks,
      [source.droppableId]: sourceColumn,
      [destination.droppableId]: destColumn
    });
    
    // Update task status on server
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/tasks/${removed.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          status: destination.droppableId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
      
      // If moving to completed column, update contribution data
      if (destination.droppableId === 'completed' && source.droppableId !== 'completed') {
        const assignee = removed.assignee;
        updateContributionData(assignee);
      } else if (source.droppableId === 'completed' && destination.droppableId !== 'completed') {
        const assignee = removed.assignee;
        decreaseContributionData(assignee);
      }
      
      console.log('Task status updated successfully');
    } catch (error) {
      console.error('Error updating task status:', error);
      // You might want to show an error message to the user here
      // And possibly revert the local state change
    }
  };

  // Update contribution data when a task is moved to completed
  const updateContributionData = (assignee) => {
    const newContributions = { ...contributions };
    const index = newContributions.labels.indexOf(assignee);
    
    if (index >= 0) {
      newContributions.datasets[0].data[index]++;
    } else {
      const userColor = getRandomColor(assignee);
      newContributions.labels.push(assignee);
      newContributions.datasets[0].data.push(1);
      newContributions.datasets[0].backgroundColor.push(userColor);
      newContributions.datasets[0].borderColor.push(adjustColorBrightness(userColor, -20));
    }
    
    setContributions(newContributions);
    
    // This would be where we'd update the project data in a real application
    // updateProjectContributions(assignee);
  };

  // Decrease contribution data when a task is moved from completed
  const decreaseContributionData = (assignee) => {
    const newContributions = { ...contributions };
    const index = newContributions.labels.indexOf(assignee);
    
    if (index >= 0) {
      newContributions.datasets[0].data[index] = Math.max(0, newContributions.datasets[0].data[index] - 1);
    }
    
    setContributions(newContributions);
  };

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
    // Delete from server first
    const success = await deleteTaskFromServer(taskId);
    
    // If deletion was successful, update local state
    if (success) {
      const updatedTasks = { ...tasks };
      
      // Find which column contains the task
      for (const [col, taskList] of Object.entries(tasks)) {
        const index = taskList.findIndex(t => t.id === taskId);
        if (index >= 0) {
          // If deleting from completed column, update contribution data
          if (col === 'completed') {
            const task = taskList[index];
            decreaseContributionData(task.assignee);
          }
          
          updatedTasks[col] = taskList.filter(t => t.id !== taskId);
          break;
        }
      }
      
      setTasks(updatedTasks);
    }
  };

  const saveTaskToProject = async (task) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          assignee: task.assignee
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
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      
      const updatedTask = await response.json();
      console.log('Task updated successfully:', updatedTask);
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      // You might want to show an error message to the user here
    }
  };

  const deleteTaskFromServer = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      
      console.log('Task deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      // You might want to show an error message to the user here
      return false;
    }
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
        <button className="back-button" onClick={handleBackToProjects}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Projects
        </button>
        <h1>{project?.title || 'Project Dashboard'}</h1>
        <div className="dashboard-actions">
          <button className="messages-button">
            <FontAwesomeIcon icon={faComment} /> Messages
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

              {/* Kanban Board */}
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="kanban-board">
                  <div className="kanban-column not-started-column">
                    <div className="kanban-column-header">
                      <h4>Not Yet Started</h4>
                    </div>
                    <StrictModeDroppable droppableId="not-started">
                      {(provided) => (
                        <div
                          className="task-list"
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          {tasks["not-started"] && tasks["not-started"].map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided) => (
                                <div
                                  className="task-card"
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <div className="task-content">
                                    <h5>{task.title}</h5>
                                    <p>{task.description}</p>
                                    <span className="task-assignee">Assigned to: {task.assignee}</span>
                                  </div>
                                  <div className="task-actions">
                                    <button onClick={() => handleEditTask(task)}>
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button onClick={() => handleDeleteTask(task.id)}>
                                      <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </StrictModeDroppable>
                  </div>

                  <div className="kanban-column in-progress-column">
                    <div className="kanban-column-header">
                      <h4>In Progress</h4>
                    </div>
                    <StrictModeDroppable droppableId="in-progress">
                      {(provided) => (
                        <div
                          className="task-list"
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          {tasks["in-progress"] && tasks["in-progress"].map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided) => (
                                <div
                                  className="task-card"
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <div className="task-content">
                                    <h5>{task.title}</h5>
                                    <p>{task.description}</p>
                                    <span className="task-assignee">Assigned to: {task.assignee}</span>
                                  </div>
                                  <div className="task-actions">
                                    <button onClick={() => handleEditTask(task)}>
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button onClick={() => handleDeleteTask(task.id)}>
                                      <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </StrictModeDroppable>
                  </div>

                  <div className="kanban-column completed-column">
                    <div className="kanban-column-header">
                      <h4>Completed</h4>
                    </div>
                    <StrictModeDroppable droppableId="completed">
                      {(provided) => (
                        <div
                          className="task-list"
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          {tasks["completed"] && tasks["completed"].map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided) => (
                                <div
                                  className="task-card"
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <div className="task-content">
                                    <h5>{task.title}</h5>
                                    <p>{task.description}</p>
                                    <span className="task-assignee">Assigned to: {task.assignee}</span>
                                  </div>
                                  <div className="task-actions">
                                    <button onClick={() => handleEditTask(task)}>
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button onClick={() => handleDeleteTask(task.id)}>
                                      <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </StrictModeDroppable>
                  </div>
                </div>
              </DragDropContext>

              {/* Contribution Section */}
              <div className="contribution-section">
                <h3>Contribution</h3>
                <div className="contribution-chart">
                  <Pie data={contributions} options={{ responsive: true, maintainAspectRatio: true }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'virtual-meet' && (
            <div className="virtual-meet-view">
              <div className="section-header">
                <h3>Virtual Meet</h3>
              </div>
              <div className="empty-state">
                <p>Virtual meeting functionality is not yet implemented.</p>
                <button>Set up a meeting</button>
              </div>
            </div>
          )}

          {activeTab === 'whiteboard' && (
            <div className="whiteboard-view">
              <div className="section-header">
                <h3>White Board</h3>
              </div>
              <div className="empty-state">
                <p>Whiteboard functionality is not yet implemented.</p>
                <button>Start collaborating</button>
              </div>
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
              <input 
                type="text" 
                value={newTask.assignee} 
                onChange={(e) => setNewTask({...newTask, assignee: e.target.value})}
                placeholder="Enter assignee username"
              />
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
    </div>
  );
};

export default ProjectDashboard; 