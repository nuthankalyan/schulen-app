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
  faCog
} from '@fortawesome/free-solid-svg-icons';

export const ProjectDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasAccess, setHasAccess] = useState(false);
  
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

  const handleBackToProjects = () => {
    navigate('/main/myprojects');
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
          <button className="settings-button">
            <FontAwesomeIcon icon={faCog} /> Settings
          </button>
        </div>
      </div>

      {/* Dashboard Navigation */}
      <div className="dashboard-navigation">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          <FontAwesomeIcon icon={faChartLine} /> Overview
        </button>
        <button 
          className={activeTab === 'tasks' ? 'active' : ''} 
          onClick={() => setActiveTab('tasks')}
        >
          <FontAwesomeIcon icon={faTasks} /> Tasks
        </button>
        <button 
          className={activeTab === 'team' ? 'active' : ''} 
          onClick={() => setActiveTab('team')}
        >
          <FontAwesomeIcon icon={faUsers} /> Team
        </button>
        <button 
          className={activeTab === 'documents' ? 'active' : ''} 
          onClick={() => setActiveTab('documents')}
        >
          <FontAwesomeIcon icon={faFileAlt} /> Documents
        </button>
        <button 
          className={activeTab === 'calendar' ? 'active' : ''} 
          onClick={() => setActiveTab('calendar')}
        >
          <FontAwesomeIcon icon={faCalendarAlt} /> Calendar
        </button>
        <button 
          className={activeTab === 'discussions' ? 'active' : ''} 
          onClick={() => setActiveTab('discussions')}
        >
          <FontAwesomeIcon icon={faComments} /> Discussions
        </button>
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="dashboard-overview">
            <div className="overview-section status">
              <h3>Project Status</h3>
              <div className={`status-badge ${project?.status.toLowerCase()}`}>
                {project?.status || 'Unknown'}
              </div>
              <p>Domain: {project?.domain || 'Not specified'}</p>
              <p>Deadline: {project?.deadline || 'Not specified'}</p>
            </div>

            <div className="overview-section description">
              <h3>Description</h3>
              <p>{project?.description || 'No description available'}</p>
            </div>

            <div className="overview-section quick-stats">
              <h3>Quick Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <FontAwesomeIcon icon={faUsers} />
                  <div className="stat-value">{project?.enrolledUsers?.length || 0}</div>
                  <div className="stat-label">Team Members</div>
                </div>
                <div className="stat-item">
                  <FontAwesomeIcon icon={faTasks} />
                  <div className="stat-value">0</div>
                  <div className="stat-label">Tasks</div>
                </div>
                <div className="stat-item">
                  <FontAwesomeIcon icon={faFileAlt} />
                  <div className="stat-value">0</div>
                  <div className="stat-label">Documents</div>
                </div>
                <div className="stat-item">
                  <FontAwesomeIcon icon={faComments} />
                  <div className="stat-value">0</div>
                  <div className="stat-label">Comments</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'tasks' && (
          <div className="dashboard-tasks">
            <div className="section-header">
              <h3>Project Tasks</h3>
              <button className="add-button">+ Add Task</button>
            </div>
            <div className="empty-state">
              <p>No tasks have been added to this project yet.</p>
              <button>Create your first task</button>
            </div>
          </div>
        )}
        
        {activeTab === 'team' && (
          <div className="dashboard-team">
            <div className="section-header">
              <h3>Team Members</h3>
              <button className="add-button">+ Invite Member</button>
            </div>
            <div className="team-list">
              {project?.enrolledUsers?.length > 0 ? (
                <div className="team-grid">
                  {/* Owner */}
                  <div className="team-member owner">
                    <div className="member-avatar">
                      {project.ownerUsername?.substring(0, 1) || 'O'}
                    </div>
                    <div className="member-info">
                      <h4>{project.ownerUsername || 'Project Owner'}</h4>
                      <span className="role">Owner</span>
                    </div>
                  </div>
                  
                  {/* Other team members would go here */}
                  <p>Other team members will appear here</p>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No team members have been added to this project yet.</p>
                  <button>Invite team members</button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div className="dashboard-documents">
            <div className="section-header">
              <h3>Project Documents</h3>
              <button className="add-button">+ Add Document</button>
            </div>
            <div className="empty-state">
              <p>No documents have been added to this project yet.</p>
              <button>Upload your first document</button>
            </div>
          </div>
        )}
        
        {activeTab === 'calendar' && (
          <div className="dashboard-calendar">
            <div className="section-header">
              <h3>Project Calendar</h3>
              <button className="add-button">+ Add Event</button>
            </div>
            <div className="empty-state">
              <p>No events have been added to the calendar yet.</p>
              <button>Create your first event</button>
            </div>
          </div>
        )}
        
        {activeTab === 'discussions' && (
          <div className="dashboard-discussions">
            <div className="section-header">
              <h3>Project Discussions</h3>
              <button className="add-button">+ New Discussion</button>
            </div>
            <div className="empty-state">
              <p>No discussions have been started for this project yet.</p>
              <button>Start the first discussion</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDashboard; 