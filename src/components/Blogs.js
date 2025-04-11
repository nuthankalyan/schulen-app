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
    faTimes
} from '../fontawesome';
import { Header } from './Header';
import './Blogs.css';

export const Blogs = () => {
    const navigate = useNavigate();
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        caption: '',
        content: ''
    });

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
                
                console.log('Fetching blogs with token:', token);
                const response = await fetch('/blogs', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(e => ({ message: 'Unknown error' }));
                    console.error('Error response:', errorData);
                    throw new Error(errorData.message || `Server responded with status ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Blogs fetched:', data);
                setBlogs(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching blogs:', err);
                setError(`Failed to load blogs: ${err.message}. Please check your connection.`);
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
        setError(null); // Reset any previous errors
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                setError('You need to be logged in to create a blog');
                return;
            }
            
            console.log('Submitting blog with token:', token);
            console.log('Form data:', formData);
            
            const response = await fetch('/blogs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(e => ({ message: 'Unknown error' }));
                console.error('Error response:', errorData);
                throw new Error(errorData.message || `Server responded with status ${response.status}`);
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
        } catch (err) {
            console.error('Error creating blog:', err);
            setError(`Failed to create blog: ${err.message}. Please try again.`);
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
                                <div key={blog._id} className="blog-card">
                                    <h3>{blog.title}</h3>
                                    <p className="caption">{blog.caption}</p>
                                    <div className="meta">
                                        <span>{blog.author.username}</span>
                                        <span>{formatDate(blog.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Write Blog Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Write New Blog</h2>
                            <button className="close-button" onClick={handleCloseModal}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <form className="blog-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="title">Title</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter a compelling title"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="caption">Caption</label>
                                <input
                                    type="text"
                                    id="caption"
                                    name="caption"
                                    value={formData.caption}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Write a brief description"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="content">Content</label>
                                <textarea
                                    id="content"
                                    name="content"
                                    value={formData.content}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Write your blog content here..."
                                />
                            </div>
                            <div className="form-buttons">
                                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="publish-btn">
                                    Publish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="confirmation-modal">
                            <h2>Discard Changes?</h2>
                            <p>You have unsaved changes. Are you sure you want to discard them?</p>
                            <div className="confirmation-buttons">
                                <button className="no-btn" onClick={handleCloseConfirmation}>
                                    No, Keep Editing
                                </button>
                                <button className="yes-btn" onClick={handleConfirmCancel}>
                                    Yes, Discard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 