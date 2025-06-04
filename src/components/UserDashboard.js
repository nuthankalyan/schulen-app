import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import './UserDashboard.css';
import { FontAwesomeIcon } from '../fontawesome';
import { faEdit, faExclamationTriangle, faSignOutAlt, faTrashAlt, faProjectDiagram, faFolderOpen, faUsers, faNewspaper } from '@fortawesome/free-solid-svg-icons';
import config from '../config';

export const UserDashboard = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState(localStorage.getItem('username') || '');
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        age: '',
        photo: null,
        rating: 0,
        techStack: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [profileComplete, setProfileComplete] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('token');
                const userId = localStorage.getItem('userId');
                
                if (!token || !userId) {
                    navigate('/login');
                    return;
                }
                
                const response = await fetch(`${config.API_BASE_URL}/users/profile`, {
                    headers: {
                        'Authorization': token
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }
                
                const userData = await response.json();
                setUserData({
                    name: userData.name || '',
                    email: userData.email || '',
                    age: userData.age || '',
                    photo: userData.photo || null,
                    rating: userData.rating || 0,
                    techStack: userData.techStack || ''
                });
                
                // Check if profile is complete
                const isComplete = userData.name && userData.email && userData.age;
                setProfileComplete(isComplete);
                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setError('Failed to load user data. Please try again later.');
                setIsLoading(false);
            }
        };
        
        fetchUserData();
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePhotoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const maxSizeMB = 1; // Maximum size in MB
            
            // Create an image element to resize the photo
            const img = new Image();
            const reader = new FileReader();
            
            reader.onload = (event) => {
                img.onload = () => {
                    // Calculate new dimensions while maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 800; // Maximum width or height in pixels
                    
                    if (width > height && width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                    
                    // Create canvas for resizing
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw resized image on canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to compressed data URL
                    const quality = 0.7; // Adjust quality (0.1 to 1.0)
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    // Update state with compressed image
                    setUserData(prev => ({
                        ...prev,
                        photo: compressedDataUrl
                    }));
                };
                
                img.src = event.target.result;
            };
            
            reader.readAsDataURL(file);
        }
    };

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');
            
            if (!token || !userId) {
                navigate('/login');
                return;
            }
            
            const response = await fetch(`${config.API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    name: userData.name,
                    email: userData.email,
                    age: userData.age,
                    photo: userData.photo,
                    techStack: userData.techStack
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update user data');
            }
            
            const result = await response.json();
            
            // Check if profile is complete
            const isComplete = userData.name && userData.email && userData.age;
            setProfileComplete(isComplete);
            setIsEditing(false);
            setIsLoading(false);
        } catch (error) {
            console.error('Error updating user data:', error);
            setError('Failed to update user data. Please try again later.');
            setIsLoading(false);
        }
    };

    const handleCompleteProfile = () => {
        setIsEditing(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        navigate('/login');
    };
    
    const handleDeleteUser = async () => {
        if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
            try {
                setIsLoading(true);
                const token = localStorage.getItem('token');
                const userId = localStorage.getItem('userId');
                
                if (!token || !userId) {
                    navigate('/login');
                    return;
                }
                
                const response = await fetch(`${config.API_BASE_URL}/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': token
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to delete user account');
                }
                
                // Clear local storage and redirect to signup
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                localStorage.removeItem('username');
                navigate('/signup');
            } catch (error) {
                console.error('Error deleting user account:', error);
                setError('Failed to delete user account. Please try again later.');
                setIsLoading(false);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="user-dashboard loading">
                <Header />
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <div className="user-dashboard">
            <Header />
            <div className="dashboard-container">
                <div className="sidebar">
                    <ul>
                        <li>
                            <a href="/main/browseprojects">
                                <FontAwesomeIcon icon={faProjectDiagram} className="nav-icon" />
                                <span>Browse Projects</span>
                            </a>
                        </li>
                        <li>
                            <a href="/main/myprojects">
                                <FontAwesomeIcon icon={faFolderOpen} className="nav-icon" />
                                <span>My Projects</span>
                            </a>
                        </li>
                        <li>
                            <a href="/main/community">
                                <FontAwesomeIcon icon={faUsers} className="nav-icon" />
                                <span>Community</span>
                            </a>
                        </li>
                        <li>
                            <a href="/main/blogs">
                                <FontAwesomeIcon icon={faNewspaper} className="nav-icon" />
                                <span>Blogs</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" onClick={handleLogout}>
                                <FontAwesomeIcon icon={faSignOutAlt} className="nav-icon" />
                                <span>Logout</span>
                            </a>
                        </li>
                    </ul>
                </div>
                
                <div className="main-content">
                    {!profileComplete && (
                        <div className="profile-incomplete-warning">
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                            <span>Your profile is incomplete!!</span>
                            <button onClick={handleCompleteProfile}>Complete Profile</button>
                        </div>
                    )}
                    
                    <div className="profile-actions">
                        <button className="edit-button" onClick={handleEditToggle}>
                            {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                        <button className="logout-button" onClick={handleLogout}>
                            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                        </button>
                    </div>
                    
                    <div className="profile-section">
                        <div className="profile-photo-container">
                            <div className="profile-photo">
                                {userData.photo ? (
                                    <img src={userData.photo} alt="Profile" />
                                ) : (
                                    <div className="photo-placeholder">Photo</div>
                                )}
                            </div>
                            {isEditing && (
                                <div className="photo-upload">
                                    <input 
                                        type="file" 
                                        id="photo-upload" 
                                        accept="image/*" 
                                        onChange={handlePhotoChange} 
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="photo-upload" className="upload-button">
                                        Change Photo
                                    </label>
                                </div>
                            )}
                            <div className="username-display">{username}</div>
                        </div>
                        
                        <div className="profile-details">
                            <div className="form-group">
                                <label>Name</label>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        name="name" 
                                        value={userData.name} 
                                        onChange={handleInputChange} 
                                    />
                                ) : (
                                    <div className="field-value">{userData.name || 'Not set'}</div>
                                )}
                            </div>
                            
                            <div className="form-group">
                                <label>Email</label>
                                {isEditing ? (
                                    <input 
                                        type="email" 
                                        name="email" 
                                        value={userData.email} 
                                        onChange={handleInputChange} 
                                    />
                                ) : (
                                    <div className="field-value">{userData.email || 'Not set'}</div>
                                )}
                            </div>
                            
                            <div className="form-group">
                                <label>Age</label>
                                {isEditing ? (
                                    <input 
                                        type="number" 
                                        name="age" 
                                        value={userData.age} 
                                        onChange={handleInputChange} 
                                    />
                                ) : (
                                    <div className="field-value">{userData.age || 'Not set'}</div>
                                )}
                            </div>
                            
                            {isEditing && (
                                <button className="save-button" onClick={handleSave}>Save</button>
                            )}
                        </div>
                    </div>
                    
                    <div className="rating-section">
                        <div className="rating-circle-container">
                            <div className="rating-circle-outer">
                                <div className="rating-circle-inner">
                                    <div className="rating-value">Rating</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="contribution-section">
                        <h3>Contribution Heat map</h3>
                        <div className="heatmap-container">
                            {/* This would be replaced with an actual heatmap component in a real implementation */}
                            <div className="heatmap-placeholder"></div>
                        </div>
                    </div>
                    
                    <div className="tech-stack-section">
                        <h3>Tech Stack</h3>
                        {isEditing ? (
                            <textarea 
                                name="techStack" 
                                value={userData.techStack} 
                                onChange={handleInputChange}
                                placeholder="Enter your tech stack (e.g., React, JavaScript, Node.js)"
                            ></textarea>
                        ) : (
                            <div className="tech-stack-display">
                                {userData.techStack || 'No tech stack specified'}
                            </div>
                        )}
                    </div>
                    
                    <div className="danger-zone">
                        <h3>Danger Zone</h3>
                        <button className="delete-button" onClick={handleDeleteUser}>
                            <FontAwesomeIcon icon={faTrashAlt} /> Delete User
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;