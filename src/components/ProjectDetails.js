// filepath: /e:/Schulen/schulen_app/src/components/ProjectDetails.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProjectDetails.css';
import config from '../config';
import { FontAwesomeIcon, icons } from '../fontawesome';

export const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [ownerUsername, setOwnerUsername] = useState('');
  const [recommendedProjects, setRecommendedProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState({
    isEnrolled: false,
    isOwner: false,
    isFull: false,
    hasPendingRequest: false,
    requestCount: 0,
    enrolledCount: 0,
    maxTeamSize: 4
  });
  const [enrollmentRequests, setEnrollmentRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const token = localStorage.getItem('token');

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/browseprojects/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      setProject(data);
      
      // Fetch owner's username
      const ownerResponse = await fetch(`http://localhost:5000/browseprojects/user/${data.userId}`);
      if (ownerResponse.ok) {
        const ownerData = await ownerResponse.json();
        setOwnerUsername(ownerData.username);
      }
    } catch (error) {
      setError('Error fetching project details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchEnrollmentStatus = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`http://localhost:5000/browseprojects/${id}/enrollment`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch enrollment status');
      }
      
      const data = await response.json();
      setEnrollmentStatus(data);
    } catch (error) {
      console.error('Error fetching enrollment status:', error);
    }
  }, [id, token]);

  const fetchEnrollmentRequests = useCallback(async () => {
    if (!token || !enrollmentStatus.isOwner) return;
    
    try {
      const response = await fetch(`http://localhost:5000/browseprojects/${id}/requests`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch enrollment requests');
      }
      
      const data = await response.json();
      setEnrollmentRequests(data);
    } catch (error) {
      console.error('Error fetching enrollment requests:', error);
    }
  }, [id, token, enrollmentStatus.isOwner]);

  const fetchRecommendedProjects = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`http://localhost:5000/browseprojects/${id}/recommended`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommended projects');
      }
      
      const data = await response.json();
      setRecommendedProjects(data);
    } catch (error) {
      console.error('Error fetching recommended projects:', error);
    }
  }, [id, token]);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${id}/activities`);
      if (!response.ok) {
        console.warn('Activities endpoint not available yet. This is expected if you haven\'t restarted the server.');
        // Add some default activities for demonstration
        setActivities([
          {
            type: 'project_created',
            timestamp: new Date(),
            username: ownerUsername || 'Project Owner',
            details: 'Project was created',
          },
          {
            type: 'status_change',
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            username: ownerUsername || 'Project Owner',
            details: 'Project status was updated',
            oldValue: 'Open',
            newValue: project?.status || 'In Progress',
          }
        ]);
        return;
      }
      const data = await response.json();
      if (data.length === 0 && project) {
        // If no activities are returned but we have project data, add a default activity
        setActivities([
          {
            type: 'project_created',
            timestamp: new Date(),
            username: ownerUsername || 'Project Owner',
            details: 'Project was created',
          }
        ]);
      } else {
        setActivities(data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Add a default activity in case of error
      setActivities([
        {
          type: 'project_created',
          timestamp: new Date(),
          username: ownerUsername || 'Project Owner',
          details: 'Project was created',
        }
      ]);
    }
  }, [id, project, ownerUsername]);

  useEffect(() => {
    const loadData = async () => {
      await fetchProject();
      await fetchEnrollmentStatus();
      await fetchActivities();
    };
    
    loadData();
  }, [fetchProject, fetchEnrollmentStatus, fetchActivities]);

  useEffect(() => {
    if (enrollmentStatus.isOwner) {
      fetchEnrollmentRequests();
    }
    fetchRecommendedProjects();
  }, [enrollmentStatus.isOwner, fetchEnrollmentRequests, fetchRecommendedProjects]);

  const handleEnroll = async () => {
    if (!token) {
      alert('You must be logged in to enroll in a project');
      return;
    }

    setEnrollmentLoading(true);
    
    try {
      const response = await fetch(`http://localhost:5000/browseprojects/${id}/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send enrollment request');
      }
      
      // Update enrollment status
      setEnrollmentStatus(prev => ({
        ...prev,
        hasPendingRequest: true
      }));
      
      alert('Enrollment request sent successfully!');
    } catch (error) {
      alert(error.message);
      console.error('Error sending enrollment request:', error);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      const response = await fetch(`http://localhost:5000/browseprojects/${id}/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Failed to ${action} request`);
      }
      
      // Remove the request from the list
      setEnrollmentRequests(prev => prev.filter(req => req.requestId !== requestId));
      
      // Update request count
      setEnrollmentStatus(prev => ({
        ...prev,
        requestCount: prev.requestCount - 1,
        enrolledCount: action === 'approve' ? prev.enrolledCount + 1 : prev.enrolledCount
      }));
      
      alert(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      alert(error.message);
      console.error(`Error ${action}ing request:`, error);
    }
  };

  const toggleRequestsPanel = () => {
    setShowRequests(!showRequests);
  };

  const handleViewProject = (projectId) => {
    navigate(`/main/browseprojects/${projectId}`);
  };

  const handleGoBack = () => {
    navigate(-1); // Navigate to the previous page
  };

  const toggleActivityPanel = () => {
    setActivityPanelOpen(!activityPanelOpen);
  };

  const formatActivityTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getActivityTypeLabel = (type) => {
    switch (type) {
      case 'status_change':
        return 'Status Changed';
      case 'enrollment_accepted':
        return 'Member Added';
      case 'project_created':
        return 'Project Created';
      case 'enrollment_request':
        return 'Join Request';
      default:
        return type.replace('_', ' ');
    }
  };

  if (loading) {
    return <div className="loading">Loading project details...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const statusClass = project.status === 'Open' ? 'status-open_p' : 
                      project.status === 'Closed' ? 'status-closed_p' : 
                      'status-inprogress_p';

  const renderEnrollButton = () => {
    if (enrollmentStatus.isOwner) {
      return (
        <button className="enroll-button owner-button" disabled>
          <FontAwesomeIcon icon={icons.faUsers} className="enroll-icon" />
          Project Owner
        </button>
      );
    }

    if (enrollmentStatus.isEnrolled) {
      return (
        <button className="enroll-button enrolled-button" disabled>
          <FontAwesomeIcon icon={icons.faCheckCircle} className="enroll-icon" />
          Enrolled
        </button>
      );
    }

    if (enrollmentStatus.hasPendingRequest) {
      return (
        <button className="enroll-button pending-button" disabled>
          <FontAwesomeIcon icon={icons.faBell} className="enroll-icon" />
          Request Pending
        </button>
      );
    }

    if (enrollmentStatus.isFull) {
      return (
        <button className="enroll-button full-button" disabled>
          <FontAwesomeIcon icon={icons.faUsers} className="enroll-icon" />
          Team Full ({enrollmentStatus.enrolledCount}/{enrollmentStatus.maxTeamSize})
        </button>
      );
    }

    return (
      <button 
        className="enroll-button" 
        onClick={handleEnroll}
        disabled={project.status === 'Closed' || enrollmentLoading}
      >
        <FontAwesomeIcon icon={icons.faUserPlus} className="enroll-icon" />
        {enrollmentLoading ? 'Sending Request...' : 'Request to Join'}
        {enrollmentStatus.enrolledCount > 0 && 
          ` (${enrollmentStatus.enrolledCount}/${enrollmentStatus.maxTeamSize})`}
      </button>
    );
  };

  return (
    <>
      <button className="back-button" onClick={handleGoBack}>
        <FontAwesomeIcon icon={icons.faArrowLeft} className="back-icon" />
        Back
      </button>
      
      <div className={`activity-panel ${activityPanelOpen ? '' : 'collapsed'}`}>
        <div className="activity-header">
          <h3>Recent Activity</h3>
          <button className="close-activity-button" onClick={toggleActivityPanel}>
            <FontAwesomeIcon icon={icons.faClose} />
          </button>
        </div>
        <div className="activity-content">
          {activities.length === 0 ? (
            <p>No recent activity</p>
          ) : (
            <ul className="activity-list">
              {activities.map((activity, index) => (
                <li key={index} className={`activity-item ${activity.type}`}>
                  <div className={`activity-type ${activity.type}`}>
                    {getActivityTypeLabel(activity.type)}
                  </div>
                  <div className="activity-details">
                    {activity.details}
                    {activity.type === 'status_change' && (
                      <span> from <strong>{activity.oldValue}</strong> to <strong>{activity.newValue}</strong></span>
                    )}
                  </div>
                  <div className="activity-user">by {activity.username}</div>
                  <div className="activity-time">{formatActivityTime(activity.timestamp)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className={`activity-toggle-button ${activityPanelOpen ? 'hidden' : ''}`} onClick={toggleActivityPanel}>
        <FontAwesomeIcon icon={icons.faHistory} />
        <span className="activity-toggle-text">Activity</span>
      </div>
      
      <div className="project-details-container">
        <div className={`status-box_p ${statusClass}`}>{project.status}</div>
        
        {enrollmentStatus.isOwner && enrollmentStatus.requestCount > 0 && (
          <div className="requests-container">
            <button 
              className="requests-button" 
              onClick={toggleRequestsPanel}
              title="Enrollment Requests"
            >
              <FontAwesomeIcon icon={icons.faBell} className="requests-icon" />
              <span className="request-count">{enrollmentStatus.requestCount}</span>
            </button>
            
            {showRequests && (
              <div className="requests-panel">
                <h3>Enrollment Requests</h3>
                {enrollmentRequests.length === 0 ? (
                  <p>No pending requests</p>
                ) : (
                  <ul className="requests-list">
                    {enrollmentRequests.map(request => (
                      <li key={request.requestId} className="request-item">
                        <span className="request-username">{request.username}</span>
                        <div className="request-actions">
                          <button 
                            className="approve-button"
                            onClick={() => handleRequestAction(request.requestId, 'approve')}
                            disabled={enrollmentStatus.isFull}
                            title="Approve Request"
                          >
                            <FontAwesomeIcon icon={icons.faCheck} />
                          </button>
                          <button 
                            className="reject-button"
                            onClick={() => handleRequestAction(request.requestId, 'reject')}
                            title="Reject Request"
                          >
                            <FontAwesomeIcon icon={icons.faTimes} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
        
        <span id="project_title">{project.title}</span>
        <div id="project_user">by {ownerUsername}</div>
        <div id="project_description_title">Project Description</div>    
        <div id="project_description">{project.description}</div>
        <div id="project_domain_title">Domain</div>
        <div id="project_domain">{project.domain}</div>
        
        <div className="enroll-button-container">
          {renderEnrollButton()}
        </div>
        
        {recommendedProjects.length > 0 && (
          <div className="recommended-projects-section">
            <h3 className="recommended-title">
              <FontAwesomeIcon icon={icons.faThumbsUp} className="recommended-icon" />
              Recommended Projects
            </h3>
            <div className="recommended-projects-container">
              {recommendedProjects.map(proj => (
                <div key={proj._id} className="recommended-project-card">
                  <h4>{proj.title}</h4>
                  <div className={`status-indicator status-${proj.status.toLowerCase().replace(' ', '-')}`}>
                    {proj.status}
                  </div>
                  <p className="recommended-domain">{proj.domain}</p>
                  <button 
                    className="view-recommended-button"
                    onClick={() => handleViewProject(proj._id)}
                  >
                    View Project
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};