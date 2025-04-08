import React, { useState, useEffect, useRef } from 'react';
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
  faSearch,
  faTimes
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
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [pageTitle, setPageTitle] = useState('Browse Projects');
    const searchRef = useRef(null);
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId'); // Assuming userId is stored in localStorage
    
    // Load projects from the backend when the component mounts
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(`${config.API_BASE_URL}/browseprojects`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                
                // Log the data to see what fields are available
                console.log("Fetched projects data:", data);
                
                // If projects don't have username information, we might need to fetch it separately
                // This is just a placeholder - adjust based on your actual API structure
                const projectsWithUsernames = await Promise.all(data.map(async (project) => {
                    // If the project already has username info, return it as is
                    if (project.username || project.createdBy || project.owner || project.userName || project.user) {
                        return project;
                    }
                    
                    // Otherwise, try to fetch the username for this project
                    try {
                        if (project.userId) {
                            const userResponse = await fetch(`${config.API_BASE_URL}/users/${project.userId}`);
                            if (userResponse.ok) {
                                const userData = await userResponse.json();
                                return {
                                    ...project,
                                    username: userData.username || userData.name
                                };
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching user data for project ${project._id}:`, error);
                    }
                    
                    return project;
                }));
                
                setProjects(projectsWithUsernames);
                setFilteredProjects(projectsWithUsernames);
            } catch (error) {
                console.error('Error fetching projects:', error);
            }
        };

        fetchProjects();
    }, []);

    // Fetch current user's username if not in localStorage
    useEffect(() => {
        const fetchCurrentUser = async () => {
            // Check if username is already in localStorage
            const storedUsername = localStorage.getItem('username');
            if (storedUsername) {
                return; // Username already exists in localStorage
            }
            
            // Get userId from localStorage
            const currentUserId = localStorage.getItem('userId');
            if (!currentUserId) {
                console.error('No userId found in localStorage');
                return;
            }
            
            try {
                // Fetch user data from the backend
                const response = await fetch(`${config.API_BASE_URL}/users/${currentUserId}`);
                if (response.ok) {
                    const userData = await response.json();
                    // Store username in localStorage
                    localStorage.setItem('username', userData.username || userData.name);
                    console.log('Username stored in localStorage:', userData.username || userData.name);
                } else {
                    console.error('Failed to fetch user data');
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        
        fetchCurrentUser();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle search input changes
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        
        if (value.trim() === '') {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        // Find matching projects
        const matchingProjects = projects.filter(project => 
            project.title.toLowerCase().includes(value.toLowerCase())
        );

        // Extract unique usernames from projects - check multiple possible field names
        const usernames = [...new Set(projects.map(project => {
            // Check different possible username field names
            return project.username || project.createdBy || project.owner || project.userName || project.user;
        }))].filter(username => 
            username && username.toLowerCase().includes(value.toLowerCase())
        );

        // Log for debugging
        console.log("Search term:", value);
        console.log("Projects:", projects);
        console.log("Extracted usernames:", usernames);

        // Combine results
        const results = [
            ...matchingProjects.map(project => ({ type: 'project', data: project })),
            ...usernames.map(username => ({ type: 'user', data: username }))
        ];

        // Remove duplicates (if a project title matches a username)
        const uniqueResults = results.filter((result, index, self) => 
            index === self.findIndex(r => 
                (r.type === 'project' && result.type === 'project' && r.data._id === result.data._id) ||
                (r.type === 'user' && result.type === 'user' && r.data === result.data)
            )
        );

        setSearchResults(uniqueResults);
        setShowDropdown(uniqueResults.length > 0);
    };

    // Handle selection from dropdown
    const handleSelectResult = (result) => {
        if (result.type === 'project') {
            navigate(`/main/browseprojects/${result.data._id}`);
        } else if (result.type === 'user') {
            setSelectedUser(result.data);
            setPageTitle(`Projects by ${result.data}`);
            
            // Filter projects by username - check multiple possible field names
            const userProjects = projects.filter(project => {
                // Get the username from any of the possible field names
                const projectUsername = project.username || project.createdBy || project.owner || project.userName || project.user;
                
                // Log for debugging
                console.log(`Comparing project username "${projectUsername}" with selected user "${result.data}"`);
                
                // Check if the username matches (case-insensitive)
                return projectUsername && projectUsername.toLowerCase() === result.data.toLowerCase();
            });
            
            console.log("Selected user:", result.data);
            console.log("Filtered projects:", userProjects);
            
            setFilteredProjects(userProjects);
        }
        
        setSearchTerm('');
        setShowDropdown(false);
    };

    // Clear filters
    const clearFilters = () => {
        setSelectedUser(null);
        setPageTitle('Browse Projects');
        setFilteredProjects(projects);
        setSearchTerm('');
    };

    const handleAddProject = async (e) => {
        e.preventDefault();
        
        // Get the current user's username from localStorage or fetch it
        const currentUsername = localStorage.getItem('username');
        
        // Create the new project object with username included
        const newProject = { 
            title, 
            description, 
            deadline, 
            domain, 
            status,
            username: currentUsername // Add the username to the project data
        };
        
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
                
                // If the backend doesn't return the username, add it manually
                if (!createdProject.username && currentUsername) {
                    createdProject.username = currentUsername;
                }
                
                setProjects([createdProject, ...projects]); // Prepend the new project
                setFilteredProjects([createdProject, ...filteredProjects]); // Update filtered projects too
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
                    setFilteredProjects(filteredProjects.filter(project => project._id !== projectId));
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
                setFilteredProjects(filteredProjects.map(project => 
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

    // Test function to check username search functionality
    const testUsernameSearch = () => {
        console.log("Testing username search functionality");
        console.log("Current projects:", projects);
        
        // Check if any projects have username information
        const projectsWithUsername = projects.filter(project => 
            project.username || project.createdBy || project.owner || project.userName || project.user
        );
        
        console.log("Projects with username info:", projectsWithUsername);
        
        if (projectsWithUsername.length === 0) {
            console.log("No projects have username information. This is likely the cause of the search issue.");
            
            // Check if projects have userId that we can use to fetch usernames
            const projectsWithUserId = projects.filter(project => project.userId);
            console.log("Projects with userId:", projectsWithUserId);
            
            if (projectsWithUserId.length > 0) {
                console.log("Projects have userId but no username. We need to fetch usernames from the backend.");
            }
        } else {
            // Test extracting usernames
            const usernames = [...new Set(projectsWithUsername.map(project => 
                project.username || project.createdBy || project.owner || project.userName || project.user
            ))];
            
            console.log("Extracted usernames:", usernames);
            
            // Test filtering by username
            if (usernames.length > 0) {
                const testUsername = usernames[0];
                console.log(`Testing filter with username: ${testUsername}`);
                
                const filteredByUsername = projects.filter(project => {
                    const projectUsername = project.username || project.createdBy || project.owner || project.userName || project.user;
                    return projectUsername && projectUsername.toLowerCase() === testUsername.toLowerCase();
                });
                
                console.log(`Filtered projects for username "${testUsername}":`, filteredByUsername);
            }
        }
    };

    // Call the test function when component mounts
    useEffect(() => {
        // Wait a bit for projects to load
        const timer = setTimeout(() => {
            testUsernameSearch();
        }, 2000);
        
        return () => clearTimeout(timer);
    }, [projects]);

    return (
        <div className="main-container">
            <Header />
            <nav className="main_elements">
                <ul>
                    <li>
                        <Link to="/main/browseprojects" className="active">
                            <FontAwesomeIcon icon={faProjectDiagram} className="nav-icon" />
                            <span>Browse Projects</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/main/myprojects">
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
                    <h1>{pageTitle}</h1>
                    <div className="header-actions">
                        <div className="search-container" ref={searchRef}>
                            <div className="search-input-container">
                                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search projects or users..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="search-input"
                                />
                                {searchTerm && (
                                    <button 
                                        className="clear-search" 
                                        onClick={() => {
                                            setSearchTerm('');
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                )}
                            </div>
                            {showDropdown && (
                                <div className="search-dropdown">
                                    {searchResults.map((result, index) => (
                                        <div 
                                            key={index} 
                                            className="search-result-item"
                                            onClick={() => handleSelectResult(result)}
                                        >
                                            {result.type === 'project' ? (
                                                <>
                                                    <FontAwesomeIcon icon={faProjectDiagram} className="result-icon" />
                                                    <span>{result.data.title}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FontAwesomeIcon icon={faFolderOpen} className="result-icon" />
                                                    <span>User: {result.data}</span>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedUser && (
                            <button className="clear-filter-button" onClick={clearFilters}>
                                Clear Filter
                            </button>
                        )}
                        <button onClick={openModal} id="create-project-button">Create a Project</button>
                    </div>
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
                    {filteredProjects.length === 0 ? (
                        <div className="noprojmsg">No projects found. Try adjusting your search or filters.</div>
                    ) : (
                        filteredProjects.map((project, index) => (
                            <div key={index} className="project-card">
                                <p id="browseprojectcardtitle">{project.title}</p>
                                <div className={`status-box ${project.status === 'Open' ? 'status-open' : project.status === 'Closed' ? 'status-closed' : 'status-inprogress'}`}>
                                    {project.status}
                                </div>
                                
                                <p><strong>Deadline:</strong> {project.deadline}</p>
                                <p><strong>Domain:</strong> {project.domain}</p>
                                {(project.username || project.createdBy || project.owner || project.userName || project.user) && 
                                    <p><strong>Created by:</strong> {project.username || project.createdBy || project.owner || project.userName || project.user}</p>
                                }
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