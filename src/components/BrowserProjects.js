import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './BrowserProjects.css';
import { useNavigate, Link } from 'react-router-dom';
import {Header} from './Header';
import config from '../config';
import { FontAwesomeIcon } from '../fontawesome';
import { 
  faProjectDiagram, 
  faFolderOpen, 
  faEnvelope, 
  faSignOutAlt, 
  faArrowLeft 
} from '@fortawesome/free-solid-svg-icons';

Modal.setAppElement('#root'); // Set the root element for accessibility

export const BrowseProjects = () => {
    const [projects, setProjects] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [domain, setDomain] = useState('Data Science');
    const [status, setStatus] = useState('Open');
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId'); // Assuming userId is stored in localStorage
    console.log(userId)
    // Load projects from the backend when the component mounts
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(`${config.API_BASE_URL}/browseprojects`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setProjects(data);
            } catch (error) {
                console.error('Error fetching projects:', error);
            }
        };

        fetchProjects();
    }, []);

    const handleAddProject = async (e) => {
        e.preventDefault();
        const newProject = { title, description, deadline, domain, status };
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${config.API_BASE_URL}/browseprojects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token,
                },
                body: JSON.stringify(newProject),
            });

            if (response.ok) {
                const createdProject = await response.json();
                setProjects([createdProject, ...projects]); // Prepend the new project
                setTitle('');
                setDescription('');
                setDeadline('');
                setDomain('Data Science');
                setStatus('Open');
                setModalIsOpen(false); // Close the modal after adding the project
                document.body.classList.remove('modal-open'); // Remove class from body
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error adding project:', error);
        }
    };

    const handleDeleteProject = async (projectId) => {
        const token = localStorage.getItem('token');
        if (window.confirm('Are you sure you want to delete this project?')) {
            try {
                const response = await fetch(`${config.API_BASE_URL}/browseprojects/${projectId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': token,
                    },
                });

                if (response.ok) {
                    setProjects(projects.filter(project => project._id !== projectId));
                } else {
                    const data = await response.json();
                    alert(data.message);
                }
            } catch (error) {
                console.error('Error deleting project:', error);
            }
        }
    };

    const handleChangeStatus = async (projectId, newStatus) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${config.API_BASE_URL}/browseprojects/${projectId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setProjects(projects.map(project => 
                    project._id === projectId ? { ...project, status: newStatus } : project
                ));
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error changing project status:', error);
        }
    };

    const openModal = () => {
        setModalIsOpen(true);
        document.body.classList.add('modal-open'); // Add class to body
    };

    const closeModal = () => {
        setModalIsOpen(false);
        document.body.classList.remove('modal-open'); // Remove class from body
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId'); // Remove userId from localStorage
        navigate('/login');
    };

   

    return (
        <div className="main-container">
            <Header />
            {/* <button className="back-button" onClick={handleGoBack}>
                <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
                Back
            </button> */}
            <nav className="main_elements">
                <ul>
                    <li>
                        <Link to="/main/browseprojects" className="active">
                            <FontAwesomeIcon icon={faProjectDiagram} className="nav-icon" />
                            <span>Browse Projects</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/my-projects">
                            <FontAwesomeIcon icon={faFolderOpen} className="nav-icon" />
                            <span>My Projects</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/messages">
                            <FontAwesomeIcon icon={faEnvelope} className="nav-icon" />
                            <span>Messages</span>
                        </Link>
                    </li>
                    <li>
                        <button onClick={handleLogout}>
                            <FontAwesomeIcon icon={faSignOutAlt} className="nav-icon" />
                            <span>Logout</span>
                        </button>
                    </li>
                </ul>
            </nav>
            <div className="content">
                <div className="content-header">
                    <h1>Browse Projects</h1>
                    <button onClick={openModal} id="create-project-button">Create a Project</button>
                </div>
                <Modal
                    isOpen={modalIsOpen}
                    onRequestClose={closeModal}
                    contentLabel="Create Project"
                    className="modal"
                    overlayClassName="overlay"
                >
                    <h2>Create a Project</h2>
                    <form className="project-form" onSubmit={handleAddProject}>
                        <div className="form-group">
                            <label htmlFor="title">Project Title:</label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="description">Description:</label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            ></textarea>
                        </div>
                        <div className="form-group">
                            <label htmlFor="deadline">Deadline:</label>
                            <input
                                type="date"
                                id="deadline"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="domain">Domain:</label>
                            <select
                                id="domain"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                            >
                                <option value="Data Science">Data Science</option>
                                <option value="Web Development">Web Development</option>
                                <option value="Blockchain">Blockchain</option>
                                <option value="AIML">AIML</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="status">Project Status:</label>
                            <select
                                id="status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="Open">Open</option>
                                <option value="Closed">Closed</option>
                                <option value="In Progress">In Progress</option>
                            </select>
                        </div>
                        <button type="submit">Add Project</button>
                        <button type="button" onClick={closeModal}>Cancel</button>
                    </form>
                </Modal>
                <div className="project-cards">
                    {projects.length === 0 ? (
                        <div className="noprojmsg">Come back after some time for new projects!!</div>
                    ) : (
                        projects.map((project, index) => (
                            <div key={index} className="project-card">
                                <p id="browseprojectcardtitle">{project.title}</p>
                                <div className={`status-box ${project.status === 'Open' ? 'status-open' : project.status === 'Closed' ? 'status-closed' : 'status-inprogress'}`}>
                                    {project.status}
                                </div>
                                
                                <p><strong>Deadline:</strong> {project.deadline}</p>
                                <p><strong>Domain:</strong> {project.domain}</p>
                                <div className="options" onClick={(e) => e.stopPropagation()}>
                                    <button className="options-button" onClick={(e) => {
                                        const optionsMenu = e.target.nextElementSibling;
                                        optionsMenu.style.display = optionsMenu.style.display === 'block' ? 'none' : 'block';
                                    }}>⋮</button>
                                    <div className="options-menu">
                                        {project.userId === userId || (
                                            <>
                                                <button onClick={() => handleDeleteProject(project._id)} id="projdelete">Delete</button>
                                                {project.status !== 'Open' && (
                                                    <button onClick={() => handleChangeStatus(project._id, 'Open')}>Open</button>
                                                )}
                                                {project.status !== 'In Progress' && (
                                                    <button onClick={() => handleChangeStatus(project._id, 'In Progress')}>In Progress</button>
                                                )}
                                                {project.status !== 'Closed' && (
                                                    <button onClick={() => handleChangeStatus(project._id, 'Closed')}>Close</button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button className="view-project-button" onClick={() => navigate(`/main/browseprojects/${project._id}`)}>
                                    View Project
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};