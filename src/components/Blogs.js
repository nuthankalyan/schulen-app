import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FontAwesomeIcon,
    faProjectDiagram,
    faFolderOpen,
    faUsers,
    faNewspaper,
    faSignOutAlt,
    faPen,
    faTimes,
    faArrowLeft,
    faTimes as faTimesCircle,
    faTrash
} from '../fontawesome';
import { Header } from './Header';
import config from '../config';
import './Blogs.css';

// API URL configuration from config
const API_URL = config.API_BASE_URL;
const BLOGS_ENDPOINT = `${API_URL}/blogs`;

export const Blogs = () => {
    const navigate = useNavigate();
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [serverStatus, setServerStatus] = useState('Checking...');
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
    const [filteredBlogs, setFilteredBlogs] = useState([]);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [blogToDelete, setBlogToDelete] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [blogToEdit, setBlogToEdit] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        caption: '',
        content: ''
    });

    // Check server connectivity
    useEffect(() => {
        const checkServerConnectivity = async () => {
            try {
                setServerStatus('Checking connection...');
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(API_URL, {
                    signal: controller.signal,
                    method: 'HEAD'
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    console.log('Successfully connected to the server');
                    setServerStatus('Connected');
                } else {
                    console.error('Server responded with status:', response.status);
                    setServerStatus(`Error: Server responded with status ${response.status}`);
                }
            } catch (err) {
                console.error('Server connectivity check failed:', err);
                if (err.name === 'AbortError') {
                    setServerStatus('Error: Server connection timed out');
                } else {
                    setServerStatus(`Error: ${err.message}`);
                }
            }
        };
        
        checkServerConnectivity();
    }, []);

    // Fetch blogs from API
    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    console.error('No authentication token found');
                    setError('You need to be logged in to view blogs');
                    setLoading(false);
                    return;
                }
                
                console.log('Fetching blogs directly from:', BLOGS_ENDPOINT);
                
                // First attempt - try with fetch's json() method
                try {
                    const response = await fetch(BLOGS_ENDPOINT, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        mode: 'cors' // Explicitly set CORS mode
                    });
                    
                    console.log('Response status:', response.status);
                    
                    if (!response.ok) {
                        throw new Error(`API request failed with status ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log('Blogs fetched:', data);
                    setBlogs(data);
                    setLoading(false);
                } catch (jsonError) {
                    // If json() method fails, try the manual approach as fallback
                    console.error('Error with json() method, trying manual parsing:', jsonError);
                    
                    const manualResponse = await fetch(BLOGS_ENDPOINT, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    // Get text and try to parse it manually
                    const text = await manualResponse.text();
                    
                    // Log the first part of the response to see what we're getting
                    console.log('Raw response text:', text.substring(0, 200));
                    
                    // Check if it looks like HTML
                    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                        console.error('Received HTML instead of JSON');
                        throw new Error('The server returned an HTML page instead of JSON data. Please check your backend API.');
                    }
                    
                    try {
                        const manualData = JSON.parse(text);
                        console.log('Blogs fetched (manual parsing):', manualData);
                        setBlogs(manualData);
                        setLoading(false);
                    } catch (parseError) {
                        console.error('Manual JSON parsing failed:', parseError);
                        throw new Error('Failed to parse server response as JSON');
                    }
                }
            } catch (err) {
                console.error('Error fetching blogs:', err);
                setError(`Failed to load blogs: ${err.message}`);
                setLoading(false);
            }
        };

        fetchBlogs();
    }, []);

    // Filter blogs based on active tab
    useEffect(() => {
        if (blogs.length > 0) {
            if (activeTab === 'all') {
                setFilteredBlogs(blogs);
            } else {
                const userId = localStorage.getItem('userId');
                const userBlogs = blogs.filter(blog => blog.author._id === userId || blog.author.id === userId);
                setFilteredBlogs(userBlogs);
            }
        }
    }, [blogs, activeTab]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
    };

    const handleOpenModal = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        if (formData.title !== (blogToEdit?.title || '') || 
            formData.caption !== (blogToEdit?.caption || '') || 
            formData.content !== (blogToEdit?.content || '')) {
            setShowConfirmation(true);
        } else {
            resetFormAndCloseModal();
        }
    };

    const handleCloseConfirmation = () => {
        setShowConfirmation(false);
    };

    const handleConfirmCancel = () => {
        setShowConfirmation(false);
        resetFormAndCloseModal();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleEditClick = (e, blog) => {
        e.preventDefault();
        e.stopPropagation();
        setBlogToEdit(blog);
        setFormData({
            title: blog.title,
            caption: blog.caption,
            content: blog.content
        });
        setEditMode(true);
        setShowModal(true);
    };

    const resetFormAndCloseModal = () => {
        setShowModal(false);
        setEditMode(false);
        setBlogToEdit(null);
        setFormData({
            title: '',
            caption: '',
            content: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You need to be logged in to create a blog');
                return;
            }
            
            const url = editMode 
                ? `${BLOGS_ENDPOINT}/${blogToEdit._id}` 
                : BLOGS_ENDPOINT;
            
            const method = editMode ? 'PUT' : 'POST';
            
            console.log(`${editMode ? 'Updating' : 'Creating'} blog at: ${url}`);
            console.log('Form data:', formData);
            
            // First attempt - try with fetch's json() method
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(formData),
                    credentials: 'include',
                    mode: 'cors'
                });
                
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }
                
                const responseData = await response.json();
                console.log(`Blog ${editMode ? 'updated' : 'created'}:`, responseData);
                
                if (editMode) {
                    // Update the blogs state with the edited blog
                    setBlogs(blogs.map(blog => 
                        blog._id === blogToEdit._id ? responseData : blog
                    ));
                } else {
                    // Add the new blog to the blogs state
                    setBlogs([responseData, ...blogs]);
                }
                
                // Reset form and close modal
                resetFormAndCloseModal();
            } catch (jsonError) {
                // If json() method fails, try the manual approach as fallback
                console.error('Error with json() method, trying manual parsing:', jsonError);
                
                const manualResponse = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                // Get text and try to parse it manually
                const text = await manualResponse.text();
                
                // Log the first part of the response to see what we're getting
                console.log('Raw response text:', text.substring(0, 200));
                
                // Check if it looks like HTML
                if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                    console.error('Received HTML instead of JSON');
                    throw new Error('The server returned an HTML page instead of JSON data. Please check your backend API.');
                }
                
                try {
                    const parsedData = JSON.parse(text);
                    console.log(`Blog ${editMode ? 'updated' : 'created'} (manual parsing):`, parsedData);
                    
                    if (editMode) {
                        // Update the blogs state with the edited blog
                        setBlogs(blogs.map(blog => 
                            blog._id === blogToEdit._id ? parsedData : blog
                        ));
                    } else {
                        // Add the new blog to the blogs state
                        setBlogs([parsedData, ...blogs]);
                    }
                    
                    // Reset form and close modal
                    resetFormAndCloseModal();
                } catch (parseError) {
                    console.error('Manual JSON parsing failed:', parseError);
                    throw new Error('Failed to parse server response as JSON');
                }
            }
        } catch (err) {
            console.error(`Error ${editMode ? 'updating' : 'creating'} blog:`, err);
            setError(`Failed to ${editMode ? 'update' : 'create'} blog: ${err.message}`);
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleDeleteClick = (e, blog) => {
        e.preventDefault();
        e.stopPropagation();
        setBlogToDelete(blog);
        setShowDeleteConfirmation(true);
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirmation(false);
        setBlogToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!blogToDelete) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You need to be logged in to delete a blog');
                return;
            }

            console.log(`Deleting blog with ID: ${blogToDelete._id}`);
            
            const response = await fetch(`${BLOGS_ENDPOINT}/${blogToDelete._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete blog: ${response.status}`);
            }

            // Remove the deleted blog from the blogs state
            const updatedBlogs = blogs.filter(blog => blog._id !== blogToDelete._id);
            setBlogs(updatedBlogs);
            
            // Close the confirmation modal
            setShowDeleteConfirmation(false);
            setBlogToDelete(null);
        } catch (err) {
            console.error('Error deleting blog:', err);
            setError(`Failed to delete blog: ${err.message}`);
        }
    };

    const isCurrentUserBlog = (blog) => {
        const userId = localStorage.getItem('userId');
        return blog.author._id === userId || blog.author.id === userId;
    };

    return (
        <div className="main-container">
            <Header />
            <nav className="main_elements">
                <ul>
                    <li>
                        <Link to="/main/browseprojects">
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
                        <Link to="/main/community">
                            <FontAwesomeIcon icon={faUsers} className="nav-icon" />
                            <span>Community</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/main/blogs" className="active">
                            <FontAwesomeIcon icon={faNewspaper} className="nav-icon" />
                            <span>Blogs</span>
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
                    <div className="blogs-header">
                        <div className="blogs-header-top">
                            <h1>Blogs</h1>
                            <button className="write-blog-btn" onClick={handleOpenModal}>
                                <FontAwesomeIcon icon={faPen} />
                                <span>Write New Blog</span>
                            </button>
                        </div>
                        <div className="blogs-tabs">
                            <button 
                                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => handleTabChange('all')}
                            >
                                All Blogs
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
                                onClick={() => handleTabChange('my')}
                            >
                                My Blogs
                            </button>
                        </div>
                    </div>
                </div>
                <div className="blogs-content">
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : error ? (
                        <div className="error">{error}</div>
                    ) : filteredBlogs.length === 0 ? (
                        <div className="empty-state">
                            <h2>{activeTab === 'all' ? 'No Blogs Yet' : 'You Haven\'t Written Any Blogs Yet'}</h2>
                            <p>
                                {activeTab === 'all' 
                                    ? 'Be the first to share your knowledge! Click on "Write New Blog" to create a blog post.' 
                                    : 'Share your knowledge with the community. Click on "Write New Blog" to create your first blog post.'}
                            </p>
                        </div>
                    ) : (
                        <div className="blogs-grid">
                            {filteredBlogs.map((blog) => (
                                <Link 
                                    to={`/main/blogs/${blog._id}`} 
                                    key={blog._id}
                                    className="blog-card"
                                >
                                    <h3>{blog.title}</h3>
                                    <p className="caption">{blog.caption}</p>
                                    <div className="meta">
                                        <span>{blog.author.username}</span>
                                        <span>{formatDate(blog.createdAt)}</span>
                                    </div>
                                    {isCurrentUserBlog(blog) && (
                                        <div className="blog-card-actions">
                                            <div className="edit-blog-btn"
                                                onClick={(e) => handleEditClick(e, blog)}
                                            >
                                                <FontAwesomeIcon icon={faPen} />
                                            </div>
                                            <div className="delete-blog-btn"
                                                onClick={(e) => handleDeleteClick(e, blog)}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </div>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Write/Edit Blog Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="blog-editor-modal">
                        <div className="modal-header">
                            <h2>{editMode ? 'Edit Blog' : 'Create a New Story'}</h2>
                            <button className="close-button" onClick={handleCloseModal}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <form className="blog-form" onSubmit={handleSubmit}>
                            <div className="blog-title-input">
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Title"
                                    className="title-input"
                                />
                            </div>
                            <div className="blog-caption-input">
                                <input
                                    type="text"
                                    id="caption"
                                    name="caption"
                                    value={formData.caption}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Add a subtitle that describes your story..."
                                    className="caption-input"
                                />
                            </div>
                            <div className="content-editor">
                                <textarea
                                    id="content"
                                    name="content"
                                    value={formData.content}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Tell your story..."
                                    className="content-textarea"
                                />
                            </div>
                            <div className="editor-toolbar">
                                <div className="editor-info">
                                    <span>{editMode ? 'Edit your blog post' : 'Write something inspiring or informative'}</span>
                                </div>
                                <div className="publish-actions">
                                    <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="publish-btn">
                                        {editMode ? 'Update' : 'Publish'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="modal-overlay">
                    <div className="modal-content confirmation-content">
                        <div className="confirmation-modal">
                            <h2>Discard Changes?</h2>
                            <p>You have unsaved changes. Are you sure you want to discard them?</p>
                            <div className="confirmation-buttons">
                                <button 
                                    className="no-btn" 
                                    onClick={handleCloseConfirmation}
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} /> Keep Editing
                                </button>
                                <button 
                                    className="yes-btn" 
                                    onClick={handleConfirmCancel}
                                >
                                    Discard <FontAwesomeIcon icon={faTimesCircle} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && (
                <div className="modal-overlay">
                    <div className="modal-content confirmation-content">
                        <div className="confirmation-modal">
                            <h2>Delete Blog</h2>
                            <p>Are you sure you want to delete "{blogToDelete?.title}"? This action cannot be undone.</p>
                            <div className="confirmation-buttons">
                                <button 
                                    className="no-btn" 
                                    onClick={handleCancelDelete}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="yes-btn" 
                                    onClick={handleConfirmDelete}
                                >
                                    Delete <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 