import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './Main.css';
import './BrowserProjects.css';
import { useNavigate } from 'react-router-dom';

Modal.setAppElement('#root'); // Set the root element for accessibility

export const BrowseProjects = () => {
    const [projects, setProjects] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const navigate = useNavigate();

    // Load projects from the backend when the component mounts
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch('http://localhost:5000/browseprojects');
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
        const newProject = { title, description, deadline };

        try {
            const response = await fetch('http://localhost:5000/browseprojects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newProject),
            });

            if (response.ok) {
                const createdProject = await response.json();
                setProjects([createdProject, ...projects]); // Prepend the new project
                setTitle('');
                setDescription('');
                setDeadline('');
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
        if (window.confirm('Are you sure you want to delete this project?')) {
            try {
                const response = await fetch(`http://localhost:5000/browseprojects/${projectId}`, {
                    method: 'DELETE',
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
        navigate('/login');
    };

    return (
        <div className="main-container">
            <nav className="main_elements">
                <ul>
                    <li><a href="/main/browseprojects">Browse Projects</a></li>
                    <li><a href="/my-projects">My Projects</a></li>
                    <li><a href="/messages">Messages</a></li>
                    <li><button onClick={handleLogout}>Logout</button></li>
                </ul>
            </nav>
            <div className="content">
                <h1>Browse Projects</h1>
                <button onClick={openModal}>Create a Project</button>
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
                                <h2>{project.title}</h2>
                                <p>{project.description}</p>
                                <p><strong>Deadline:</strong> {project.deadline}</p>
                                <button onClick={() => handleDeleteProject(project._id)}>Delete</button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};