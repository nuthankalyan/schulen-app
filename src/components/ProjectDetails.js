// filepath: /e:/Schulen/schulen_app/src/components/ProjectDetails.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './ProjectDetails.css';

export const ProjectDetails = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`http://localhost:5000/browseprojects/${id}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setProject(data);
      } catch (error) {
        console.error('Error fetching project:', error);
      }
    };

    fetchProject();
  }, [id]);

  if (!project) {
    return <div>Loading...</div>;
  }

  return (
    <div className="project-details-container">
      <h1>{project.title}</h1>
      <p>{project.description}</p>
      <p><strong>Deadline:</strong> {project.deadline}</p>
      <p><strong>Domain: </strong>{project.domain}</p>
      <p><strong>Status: </strong>{project.status}</p>
    </div>
  );
};