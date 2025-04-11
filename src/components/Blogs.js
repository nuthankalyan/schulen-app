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
    faTimes as faTimesCircle
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
    };

    const handleOpenModal = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        if (formData.title || formData.caption || formData.content) {
            setShowConfirmation(true);
        } else {
            setShowModal(false);
        }
    };

    const handleCloseConfirmation = () => {
        setShowConfirmation(false);
    };

    const handleConfirmCancel = () => {
        setShowConfirmation(false);
        setShowModal(false);
        setFormData({
            title: '',
            caption: '',
            content: ''
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
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
            
            console.log('Creating blog directly at:', BLOGS_ENDPOINT);
            console.log('Form data:', formData);
            
            // First attempt - try with fetch's json() method
            try {
                const response = await fetch(BLOGS_ENDPOINT, {
                    method: 'POST',
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
                
                const newBlog = await response.json();
                console.log('New blog created:', newBlog);
                
                // Add the new blog to the blogs state
                setBlogs([newBlog, ...blogs]);
                
                // Reset form and close modal
                setFormData({
                    title: '',
                    caption: '',
                    content: ''
                });
                setShowModal(false);
            } catch (jsonError) {
                // If json() method fails, try the manual approach as fallback
                console.error('Error with json() method, trying manual parsing:', jsonError);
                
                const manualResponse = await fetch(BLOGS_ENDPOINT, {
                    method: 'POST',
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
                    const newBlog = JSON.parse(text);
                    console.log('New blog created (manual parsing):', newBlog);
                    
                    // Add the new blog to the blogs state
                    setBlogs([newBlog, ...blogs]);
                    
                    // Reset form and close modal
                    setFormData({
                        title: '',
                        caption: '',
                        content: ''
                    });
                    setShowModal(false);
                } catch (parseError) {
                    console.error('Manual JSON parsing failed:', parseError);
                    throw new Error('Failed to parse server response as JSON');
                }
            }
        } catch (err) {
            console.error('Error creating blog:', err);
            setError(`Failed to create blog: ${err.message}`);
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
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
                        <h1>Blogs</h1>
                        <button className="write-blog-btn" onClick={handleOpenModal}>
                            <FontAwesomeIcon icon={faPen} />
                            <span>Write New Blog</span>
                        </button>
                    </div>
                </div>
                <div className="blogs-content">
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : error ? (
                        <div className="error">{error}</div>
                    ) : blogs.length === 0 ? (
                        <div className="empty-state">
                            <h2>No Blogs Yet</h2>
                            <p>Be the first to share your knowledge! Click on "Write New Blog" to create a blog post.</p>
                        </div>
                    ) : (
                        <div className="blogs-grid">
                            {blogs.map((blog) => (
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
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Write Blog Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="blog-editor-modal">
                        <div className="modal-header">
                            <h2>Create a New Story</h2>
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
                                    <span>Write something inspiring or informative</span>
                                </div>
                                <div className="publish-actions">
                                    <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="publish-btn">
                                        Publish
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
        </div>
    );
}; 