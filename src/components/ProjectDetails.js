// filepath: /e:/Schulen/schulen_app/src/components/ProjectDetails.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import './ProjectDetails.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faUsers, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

export const ProjectDetails = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [ownerUsername, setOwnerUsername] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState({
    isEnrolled: false,
    isOwner: false,
    isFull: false,
    enrolledCount: 0,
    maxTeamSize: 4
  });
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

  useEffect(() => {
    fetchProject();
    fetchEnrollmentStatus();
  }, [fetchProject, fetchEnrollmentStatus]);

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
        throw new Error(data.message || 'Failed to enroll in project');
      }
      
      // Update enrollment status
      setEnrollmentStatus(prev => ({
        ...prev,
        isEnrolled: true,
        enrolledCount: prev.enrolledCount + 1,
        isFull: data.isFull
      }));
      
      alert('Successfully enrolled in project!');
    } catch (error) {
      alert(error.message);
      console.error('Error enrolling in project:', error);
    } finally {
      setEnrollmentLoading(false);
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
          <FontAwesomeIcon icon={faUsers} className="enroll-icon" />
          Project Owner
        </button>
      );
    }

    if (enrollmentStatus.isEnrolled) {
      return (
        <button className="enroll-button enrolled-button" disabled>
          <FontAwesomeIcon icon={faCheckCircle} className="enroll-icon" />
          Enrolled
        </button>
      );
    }

    if (enrollmentStatus.isFull) {
      return (
        <button className="enroll-button full-button" disabled>
          <FontAwesomeIcon icon={faUsers} className="enroll-icon" />
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
        <FontAwesomeIcon icon={faUserPlus} className="enroll-icon" />
        {enrollmentLoading ? 'Enrolling...' : 'Enroll in Project'}
        {enrollmentStatus.enrolledCount > 0 && 
          ` (${enrollmentStatus.enrolledCount}/${enrollmentStatus.maxTeamSize})`}
      </button>
    );
  };

  return (
    <div className="project-details-container">
      <div className={`status-box_p ${statusClass}`}>{project.status}</div>
      <span id="project_title">{project.title}</span>
      <div id="project_user">by {ownerUsername}</div>
      <div id="project_description_title">Project Description</div>    
      <div id="project_description">{project.description}</div>
      <div id="project_domain_title">Domain</div>
      <div id="project_domain">{project.domain}</div>
      
      <div className="enroll-button-container">
        {renderEnrollButton()}
      </div>
    </div>
  );
};