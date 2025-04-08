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

// Sample user contribution data
const initialContributions = {
  labels: [],
  datasets: [
    {
      label: 'Task Completion',
      data: [],
      backgroundColor: [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
      ],
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
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      
      const data = await response.json();
      setProject(data);
      
      // Check if user has access (owner or accepted enrollment)
      const accessResponse = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/access`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (accessResponse.ok) {
        const accessData = await accessResponse.json();
        setHasAccess(accessData.hasAccess);
        
        if (!accessData.hasAccess) {
          setError('You do not have access to this project dashboard');
          setTimeout(() => {
            navigate('/main/myprojects');
          }, 3000);
        }
      } else {
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

    // Check if user is the owner
    if (projectData.userId === localStorage.getItem('userId')) {
      setHasAccess(true);
      return;
    }

    // Check if user is enrolled
    let isEnrolled = false;

    // Check enrollment structure
    if (projectData.enrolledUsers && Array.isArray(projectData.enrolledUsers)) {
      // Check if enrolledUsers contains objects with username
      if (projectData.enrolledUsers.some(user => 
        (typeof user === 'object' && user.username === username) ||
        (typeof user === 'string' && user === username)
      )) {
        isEnrolled = true;
      }
    }

    // Check legacy enrollments
    if (!isEnrolled && projectData.enrollments && Array.isArray(projectData.enrollments)) {
      isEnrolled = projectData.enrollments.some(enrollment => 
        enrollment.username === username && enrollment.status === 'accepted'
      );
    }

    setHasAccess(isEnrolled);
  };

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Load mock tasks and contributions data (this would come from an API in a real application)
  useEffect(() => {
    if (project) {
      // Mock tasks
      const mockTasks = {
        'not-started': [
          { id: 'task-1', title: 'Create project plan', description: 'Outline the project scope and timeline', assignee: username },
          { id: 'task-2', title: 'Define requirements', description: 'Document functional requirements', assignee: project.ownerUsername }
        ],
        'in-progress': [
          { id: 'task-3', title: 'Design UI mockups', description: 'Create wireframes and prototypes', assignee: username }
        ],
        'completed': [
          { id: 'task-4', title: 'Project kickoff', description: 'Initial team meeting', assignee: project.ownerUsername }
        ]
      };
      
      setTasks(mockTasks);
      
      // Mock contribution data
      const users = [username, project.ownerUsername];
      const completedTasksCount = {
        [username]: mockTasks.completed.filter(task => task.assignee === username).length,
        [project.ownerUsername]: mockTasks.completed.filter(task => task.assignee === project.ownerUsername).length
      };
      
      setContributions({
        labels: users,
        datasets: [
          {
            label: 'Completed Tasks',
            data: users.map(user => completedTasksCount[user] || 0),
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 99, 132, 0.6)',
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)',
            ],
            borderWidth: 1,
          },
        ],
      });
    }
  }, [project, username]);

  const handleBackToProjects = () => {
    navigate('/main/myprojects');
  };

  // Handle drag and drop
  const onDragEnd = (result) => {
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
    
    // If moving to completed column, update contribution data
    if (destination.droppableId === 'completed' && source.droppableId !== 'completed') {
      const assignee = removed.assignee;
      updateContributionData(assignee);
    } else if (source.droppableId === 'completed' && destination.droppableId !== 'completed') {
      const assignee = removed.assignee;
      decreaseContributionData(assignee);
    }
    
    setTasks({
      ...tasks,
      [source.droppableId]: sourceColumn,
      [destination.droppableId]: destColumn
    });
  };

  // Update contribution data when a task is moved to completed
  const updateContributionData = (assignee) => {
    const newContributions = { ...contributions };
    const index = newContributions.labels.indexOf(assignee);
    
    if (index >= 0) {
      newContributions.datasets[0].data[index]++;
    } else {
      newContributions.labels.push(assignee);
      newContributions.datasets[0].data.push(1);
    }
    
    setContributions(newContributions);
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
  const handleCreateTask = () => {
    if (!newTask.title) return;
    
    const taskId = `task-${Date.now()}`;
    const task = {
      id: taskId,
      title: newTask.title,
      description: newTask.description || '',
      assignee: newTask.assignee || username
    };
    
    setTasks({
      ...tasks,
      'not-started': [...tasks['not-started'], task]
    });
    
    setNewTask({ title: '', description: '', assignee: '' });
    setIsCreateTaskModalOpen(false);
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
  const handleUpdateTask = () => {
    const updatedTasks = { ...tasks };
    
    // Find which column contains the task
    let columnId = '';
    for (const [col, taskList] of Object.entries(tasks)) {
      const index = taskList.findIndex(t => t.id === editingTask.id);
      if (index >= 0) {
        columnId = col;
        updatedTasks[col][index] = {
          ...editingTask,
          title: newTask.title,
          description: newTask.description,
          assignee: newTask.assignee
        };
        break;
      }
    }
    
    setTasks(updatedTasks);
    setEditingTask(null);
    setNewTask({ title: '', description: '', assignee: '' });
    setIsCreateTaskModalOpen(false);
  };

  // Handle deleting a task
  const handleDeleteTask = (taskId) => {
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