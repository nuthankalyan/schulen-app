import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import './Community.css';
import { Header } from './Header';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '../fontawesome';
import config from '../config';
import { 
  faProjectDiagram, 
  faFolderOpen, 
  faUsers, 
  faNewspaper,
  faSignOutAlt,
  faSearch,
  faImage,
  faTimesCircle,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

// Custom image component with retry and fallbacks for CSP issues
const MemoizedImageWithFallback = memo(({ src, discussionId, imageIndex, isReply, replyIndex, onError, apiUrl }) => {
    const [loadFailed, setLoadFailed] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [checkingDiagnostics, setCheckingDiagnostics] = useState(false);
    const [diagnosticInfo, setDiagnosticInfo] = useState(null);
    const [imageSrc, setImageSrc] = useState(src);
    const maxRetries = 1; // Reduced retry count
    
    // Use useRef to keep track of diagnostics call to prevent infinite loops
    const diagnosticsRequested = useRef(false);
    const imageLoaded = useRef(false); // Track if image has been loaded successfully

    // Try to fetch image as base64 to avoid CSP issues
    useEffect(() => {
        if (imageLoaded.current) return; // Don't refetch if already loaded
        
        const fetchImageAsBase64 = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                const response = await fetch(src, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to load image: ${response.status}`);
                }
                
                const blob = await response.blob();
                const reader = new FileReader();
                
                reader.onloadend = () => {
                    imageLoaded.current = true;
                    setImageSrc(reader.result);
                };
                
                reader.readAsDataURL(blob);
            } catch (error) {
                console.error('Error fetching image as base64:', error);
                if (retryCount < maxRetries && !diagnosticsRequested.current) {
                    // Try one more time with a cache-busting parameter
                    setRetryCount(prev => prev + 1);
                } else if (!diagnosticsRequested.current) {
                    handleDiagnostics();
                }
            }
        };
        
        fetchImageAsBase64();
    }, [src, retryCount]);
    
    // Handle diagnostics separately to prevent continuous calls
    const handleDiagnostics = useCallback(() => {
        if (diagnosticsRequested.current) return;
        
        diagnosticsRequested.current = true;
        setCheckingDiagnostics(true);
        
        const token = localStorage.getItem('token');
        if (!token) {
            setLoadFailed(true);
            if (onError) onError();
            return;
        }
        
        const diagnosticUrl = isReply 
            ? `${apiUrl}/community/${discussionId}/diagnose-image/${imageIndex}?replyIndex=${replyIndex}`
            : `${apiUrl}/community/${discussionId}/diagnose-image/${imageIndex}`;
        
        fetch(diagnosticUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.json())
        .then(data => {
            setDiagnosticInfo(data);
            console.log('Image diagnostic info:', data);
        })
        .catch(err => {
            console.error('Failed to get image diagnostics:', err);
        })
        .finally(() => {
            setLoadFailed(true);
            if (onError) onError();
        });
    }, [apiUrl, discussionId, imageIndex, isReply, replyIndex, onError]);
    
    const handleImageError = useCallback((e) => {
        if (!diagnosticsRequested.current) {
            handleDiagnostics();
        }
    }, [handleDiagnostics]);
    
    if (loadFailed) {
        return (
            <div className="image-placeholder">
                <div className="image-error-message">
                    Image failed to load
                    <button 
                        className="retry-button"
                        onClick={() => {
                            setLoadFailed(false);
                            setRetryCount(0);
                            diagnosticsRequested.current = false;
                            imageLoaded.current = false;
                            setCheckingDiagnostics(false);
                            setImageSrc(src);
                        }}
                    >
                        Retry
                    </button>
                </div>
                {diagnosticInfo && (
                    <div className="diagnostic-info">
                        <small>Status: {diagnosticInfo.status}</small>
                        {diagnosticInfo.hasData && (
                            <small>, Size: {diagnosticInfo.dataLength} bytes</small>
                        )}
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <img 
            src={imageSrc}
            alt={`Content ${imageIndex + 1}`}
            className="embedded-image"
            loading="lazy"
            onError={handleImageError}
        />
    );
});

const Discussion = ({ discussion, handleDiscussionClick, currentUserId, onDeletePost }) => {
    const API_URL = config.API_BASE_URL || 'http://localhost:5000';
    const [showImageLoadError, setShowImageLoadError] = useState(false);
    
    // Check if the current user is the author of the post
    const isOwnPost = discussion.author && 
        (discussion.author.userId === currentUserId || 
         discussion.author._id === currentUserId || 
         discussion.author === currentUserId);
    
    // Stop propagation to prevent navigation when clicking delete button
    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDeletePost(discussion._id);
    };
    
    // Use useMemo to prevent re-renders causing continuous image loading
    const renderedContent = React.useMemo(() => {
        if (!discussion || !discussion.images || discussion.images.length === 0) {
            return <p className="discussion-content">{discussion.content}</p>;
        }
        
        // Search for image placeholders in the content
        const parts = [];
        let lastIndex = 0;
        const regex = /\[Image: (.*?)\]/g;
        let match;
        let imageIndex = 0;
        
        // Create a copy of the content to work with
        let workingContent = discussion.content;
        
        while ((match = regex.exec(workingContent)) !== null && imageIndex < discussion.images.length) {
            // Add text before the image placeholder
            if (match.index > lastIndex) {
                parts.push(
                    <span key={`text-${lastIndex}`}>
                        {workingContent.substring(lastIndex, match.index)}
                    </span>
                );
            }
            
            // Add the image with a component that will load the image as base64
            parts.push(
                <ImageWithBase64
                    key={`img-${discussion._id}-${imageIndex}`}
                    discussionId={discussion._id}
                    imageIndex={imageIndex}
                    apiUrl={API_URL}
                    onError={() => setShowImageLoadError(true)}
                />
            );
            imageIndex++;
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text after the last image
        if (lastIndex < workingContent.length) {
            parts.push(
                <span key={`text-last`}>
                    {workingContent.substring(lastIndex)}
                </span>
            );
        }
        
        // If no parts were created (no regex matches and no remaining text), just return the content
        if (parts.length === 0) {
            parts.push(<span key="text-full">{discussion.content}</span>);
            
            // Append all images at the end
            for (let i = 0; i < discussion.images.length; i++) {
                parts.push(
                    <ImageWithBase64
                        key={`img-${discussion._id}-${i}`}
                        discussionId={discussion._id}
                        imageIndex={i}
                        apiUrl={API_URL}
                        onError={() => setShowImageLoadError(true)}
                    />
                );
            }
        }
        
        return (
            <div className="discussion-content content-with-images">
                {parts}
                {showImageLoadError && (
                    <div className="image-load-error">
                        Some images failed to load. Please try refreshing the page.
                    </div>
                )}
            </div>
        );
    }, [discussion, API_URL, showImageLoadError]);
    
    return (
        <div className="discussion-card" onClick={() => handleDiscussionClick(discussion._id)}>
            <h3>{discussion.title}</h3>
            
            {isOwnPost && (
                <button 
                    className="delete-post-button" 
                    onClick={handleDeleteClick}
                    aria-label="Delete post"
                >
                    <FontAwesomeIcon icon={faTrash} className="delete-post-icon" />
                </button>
            )}
            
            <div className="discussion-meta">
                <span className="discussion-author">
                    Posted by: {discussion.author.username}
                </span>
                <span className="discussion-date">
                    {new Date(discussion.createdAt).toLocaleDateString()}
                </span>
            </div>
            {discussion.tags && discussion.tags.length > 0 && (
                <div className="discussion-tags">
                    {Array.isArray(discussion.tags) 
                        ? discussion.tags.map((tag, index) => (
                            <span key={index} className="tag">{tag}</span>
                        ))
                        : typeof discussion.tags === 'string' 
                            ? discussion.tags.split(',').map((tag, index) => (
                                <span key={index} className="tag">{tag.trim()}</span>
                            ))
                            : null
                    }
                </div>
            )}
            <div className="discussion-footer">
                <span className="replies-count">
                    {discussion.replies.length} {discussion.replies.length === 1 ? 'reply' : 'replies'}
                </span>
                
            </div>
        </div>
    );
};

// Component to handle base64 image loading
const ImageWithBase64 = React.memo(({ discussionId, imageIndex, apiUrl, onError, replyIndex }) => {
    const [imageData, setImageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const fetchAttempted = useRef(false);
    
    useEffect(() => {
        // Prevent multiple fetch attempts
        if (fetchAttempted.current) return;
        fetchAttempted.current = true;
        
        const fetchImage = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError(true);
                    setLoading(false);
                    if (onError) onError();
                    return;
                }
                
                // Build the correct URL based on whether this is a reply image or main discussion image
                let imageUrl;
                if (replyIndex !== undefined) {
                    imageUrl = `${apiUrl}/community/${discussionId}/replies/${replyIndex}/images/${imageIndex}`;
                } else {
                    imageUrl = `${apiUrl}/community/${discussionId}/images/${imageIndex}`;
                }
                
                const response = await fetch(imageUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to load image: ${response.status}`);
                }
                
                const blob = await response.blob();
                const reader = new FileReader();
                
                reader.onloadend = () => {
                    setImageData(reader.result);
                    setLoading(false);
                };
                
                reader.onerror = () => {
                    setError(true);
                    setLoading(false);
                    if (onError) onError();
                };
                
                reader.readAsDataURL(blob);
            } catch (err) {
                console.error("Error fetching image:", err);
                setError(true);
                setLoading(false);
                if (onError) onError();
            }
        };
        
        fetchImage();
    }, [discussionId, imageIndex, apiUrl, replyIndex, onError]);
    
    if (loading) {
        return <div className="image-loading">Loading image...</div>;
    }
    
    if (error) {
        return (
            <div className="image-placeholder">
                <div className="image-error-message">
                    Image failed to load
                </div>
            </div>
        );
    }
    
    return (
        <img 
            src={imageData}
            alt={`Uploaded content ${imageIndex + 1}`}
            className="embedded-image"
            loading="lazy"
        />
    );
});

const Community = () => {
    const navigate = useNavigate();
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Form state
    const [newDiscussion, setNewDiscussion] = useState({
        title: '',
        content: '',
        tags: []
    });
    const [tagInput, setTagInput] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);
    const fileInputRef = useRef(null);
    const cursorPositionRef = useRef(0);
    const tagInputRef = useRef(null);
    
    const API_URL = config.API_BASE_URL || 'http://localhost:5000';
    
    const textareaRef = useRef(null);
    
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const currentUserId = localStorage.getItem('userId');
    
    useEffect(() => {
        fetchDiscussions();
    }, [activeTab]);
    
    const fetchDiscussions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            
            const endpoint = activeTab === 'all' ? '/community' : '/community/myposts';
            const response = await axios.get(`${API_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Normalize the discussions data to ensure tags are in the correct format
            const normalizedDiscussions = response.data.map(discussion => {
                // Handle different tag formats
                let normalizedTags = [];
                
                if (discussion.tags) {
                    if (Array.isArray(discussion.tags)) {
                        // If tags is already an array, use it directly
                        normalizedTags = discussion.tags;
                    } else if (typeof discussion.tags === 'string') {
                        try {
                            // Try to parse as JSON string
                            const parsedTags = JSON.parse(discussion.tags);
                            normalizedTags = Array.isArray(parsedTags) ? parsedTags : [discussion.tags];
                        } catch (e) {
                            // If parsing fails, split by comma
                            normalizedTags = discussion.tags.split(',').map(tag => tag.trim());
                        }
                    }
                }
                
                return {
                    ...discussion,
                    tags: normalizedTags
                };
            });
            
            setDiscussions(normalizedDiscussions);
            setError(null);
        } catch (err) {
            console.error('Error fetching discussions:', err);
            setError('Failed to load discussions. Please try again later.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
    };
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'content') {
            // Store cursor position for image insertion
            cursorPositionRef.current = e.target.selectionStart;
        }
        
        setNewDiscussion(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Auto-resize textarea
        if (name === 'content' && textareaRef.current) {
            adjustTextareaHeight();
        }
    };

    const handleTagInputChange = (e) => {
        setTagInput(e.target.value);
    };
    
    const handleTagInputKeyDown = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault(); // Prevent form submission
            
            // Add tag if it's not already in the list
            if (!newDiscussion.tags.includes(tagInput.trim())) {
                setNewDiscussion(prev => ({
                    ...prev,
                    tags: [...prev.tags, tagInput.trim()]
                }));
            }
            
            // Clear input
            setTagInput('');
        }
    };
    
    const removeTag = (tagToRemove) => {
        setNewDiscussion(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };
    
    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            // Reset height to auto to get the correct scrollHeight
            textareaRef.current.style.height = 'auto';
            // Set the height to the scrollHeight to expand the textarea
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };
    
    const handleImageSelect = (e) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            
            // Process files to create data URLs instead of blob URLs
            const processFiles = async () => {
                const newPreviewImages = await Promise.all(filesArray.map(async (file) => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            resolve({
                                file,
                                preview: reader.result, // This is a data URL now
                                name: file.name
                            });
                        };
                        reader.readAsDataURL(file);
                    });
                }));
                
                setPreviewImages([...previewImages, ...newPreviewImages]);
                setSelectedImages([...selectedImages, ...filesArray]);
                
                // Insert placeholder text at cursor position
                if (textareaRef.current) {
                    const content = newDiscussion.content;
                    const cursorPos = cursorPositionRef.current;
                    const imgPlaceholder = `[Image: ${filesArray[0].name}]\n`;
                    
                    const newContent = content.substring(0, cursorPos) + imgPlaceholder + content.substring(cursorPos);
                    
                    setNewDiscussion(prev => ({
                        ...prev,
                        content: newContent
                    }));
                    
                    // Reset file input
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    
                    // Focus back on textarea and adjust cursor position
                    setTimeout(() => {
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(cursorPos + imgPlaceholder.length, cursorPos + imgPlaceholder.length);
                        adjustTextareaHeight();
                    }, 0);
                }
            };
            
            processFiles();
        }
    };
    
    const removeImage = (index) => {
        // Create a new array without the removed image
        const newPreviewImages = [...previewImages];
        const newSelectedImages = [...selectedImages];
        
        // Get image name to potentially remove from content
        const imageName = previewImages[index].name;
        
        // No need to revoke data URLs
        
        newPreviewImages.splice(index, 1);
        newSelectedImages.splice(index, 1);
        
        setPreviewImages(newPreviewImages);
        setSelectedImages(newSelectedImages);
        
        // Remove image placeholder from content if present
        if (textareaRef.current) {
            const content = newDiscussion.content;
            const imgPlaceholder = `[Image: ${imageName}]\n`;
            const updatedContent = content.replace(imgPlaceholder, '');
            
            if (content !== updatedContent) {
                setNewDiscussion(prev => ({
                    ...prev,
                    content: updatedContent
                }));
                setTimeout(() => adjustTextareaHeight(), 0);
            }
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            
            console.log('Tags before submission:', newDiscussion.tags);
            
            // Create FormData to send text fields and files
            const formData = new FormData();
            formData.append('title', newDiscussion.title);
            formData.append('content', newDiscussion.content);
            
            // Add tags as a JSON string
            const tagsString = JSON.stringify(newDiscussion.tags);
            console.log('Tags JSON string:', tagsString);
            formData.append('tags', tagsString);
            
            // Append each selected image to the form data
            selectedImages.forEach(image => {
                formData.append('images', image);
            });
            
            const response = await axios.post(`${API_URL}/community`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            console.log('Response from server:', response.data);
            
            // Reset form state
            setNewDiscussion({
                title: '',
                content: '',
                tags: []
            });
            setTagInput('');
            setSelectedImages([]);
            setPreviewImages([]);
            setShowModal(false);
            
            // No need to revoke object URLs since we're using data URLs
            
            fetchDiscussions();
        } catch (err) {
            console.error('Error creating discussion:', err);
            setError('Failed to create discussion. Please try again later.');
        }
    };
    
    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };
    
    const filteredDiscussions = discussions.filter(discussion => 
        discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        discussion.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        discussion.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleDiscussionClick = (id) => {
        navigate(`/main/community/${id}`);
    };

    const handleDeleteConfirmation = (postId) => {
        setPostToDelete(postId);
        setShowDeleteConfirmation(true);
    };
    
    const cancelDelete = () => {
        setShowDeleteConfirmation(false);
        setPostToDelete(null);
    };
    
    const confirmDelete = async () => {
        if (!postToDelete) return;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            
            await axios.delete(`${API_URL}/community/${postToDelete}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Remove the deleted post from the state
            setDiscussions(prevDiscussions => 
                prevDiscussions.filter(discussion => discussion._id !== postToDelete)
            );
            
            // Hide confirmation modal
            setShowDeleteConfirmation(false);
            setPostToDelete(null);
            
        } catch (err) {
            console.error('Error deleting post:', err);
            setError('Failed to delete post. Please try again later.');
        }
    };

    return (
        <div className="main-container">
            <Header />
            <nav className="main_elements">
                <ul>
                    <li>
                        <Link to="/main/browseprojects">
                            <FontAwesomeIcon icon={faProjectDiagram} className="nav-icon" />
                            <span>browse projects</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/main/myprojects">
                            <FontAwesomeIcon icon={faFolderOpen} className="nav-icon" />
                            <span>my projects</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/main/community" className="active">
                            <FontAwesomeIcon icon={faUsers} className="nav-icon" />
                            <span>community</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/main/blogs">
                            <FontAwesomeIcon icon={faNewspaper} className="nav-icon" />
                            <span>blogs</span>
                        </Link>
                    </li>
                    <li>
                        <button onClick={handleLogout}>
                            <FontAwesomeIcon icon={faSignOutAlt} className="nav-icon" />
                            <span>logout</span>
                        </button>
                    </li>
                </ul>
            </nav>
            <div className="content">
                <div className="community-header">
                    <h1>Community</h1>
                    <button 
                        className="raise-doubt-btn" 
                        onClick={() => setShowModal(true)}
                    >
                        Raise a Doubt
                    </button>
                </div>
                
                <div className="community-search">
                    <div className="search-container">
                        <FontAwesomeIcon icon={faSearch} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search for tags" 
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
                
                <div className="community-tabs">
                    <button 
                        className={activeTab === 'all' ? 'active' : ''} 
                        onClick={() => setActiveTab('all')}
                    >
                        All
                    </button>
                    <span className="tab-divider">|</span>
                    <button 
                        className={activeTab === 'myposts' ? 'active' : ''} 
                        onClick={() => setActiveTab('myposts')}
                    >
                        My Posts
                    </button>
                </div>
                
                <div className="discussions-container">
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : error ? (
                        <div className="error">{error}</div>
                    ) : filteredDiscussions.length === 0 ? (
                        <div className="empty-state">
                            <h2>No discussions found</h2>
                            <p>Be the first to start a discussion by clicking "Raise a Doubt"!</p>
                        </div>
                    ) : (
                        filteredDiscussions.map(discussion => (
                            <Discussion 
                                key={discussion._id} 
                                discussion={discussion} 
                                handleDiscussionClick={handleDiscussionClick}
                                currentUserId={currentUserId}
                                onDeletePost={handleDeleteConfirmation}
                            />
                        ))
                    )}
                </div>
            </div>
            
            {/* Modal for raising a doubt */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <input
                                    type="text"
                                    name="title"
                                    placeholder="Title"
                                    value={newDiscussion.title}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <textarea
                                    ref={textareaRef}
                                    className="modal-content-area"
                                    name="content"
                                    placeholder="Content"
                                    value={newDiscussion.content}
                                    onChange={handleInputChange}
                                    onInput={adjustTextareaHeight}
                                    required
                                />
                                <div className="image-upload-button">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        id="image-upload"
                                    />
                                    <label htmlFor="image-upload">
                                        <FontAwesomeIcon icon={faImage} /> Add Image
                                    </label>
                                </div>
                            </div>
                            
                            {previewImages.length > 0 && (
                                <div className="image-previews">
                                    {previewImages.map((img, index) => (
                                        <div key={index} className="image-preview-container">
                                            <img 
                                                src={img.preview} 
                                                alt={`Preview ${index}`} 
                                                className="image-preview" 
                                                onError={(e) => console.error(`Failed to load preview for ${img.name}`)}
                                            />
                                            <button
                                                type="button"
                                                className="remove-image"
                                                onClick={() => removeImage(index)}
                                            >
                                                <FontAwesomeIcon icon={faTimesCircle} />
                                            </button>
                                            <div className="preview-filename">{img.name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="form-group">
                                <input
                                    type="text"
                                    name="tags"
                                    placeholder="Type a tag and press Enter"
                                    value={tagInput}
                                    onChange={handleTagInputChange}
                                    onKeyDown={handleTagInputKeyDown}
                                    ref={tagInputRef}
                                />
                                {newDiscussion.tags.length > 0 && (
                                    <div className="tags-container">
                                        {newDiscussion.tags.map((tag, index) => (
                                            <div key={index} className="tag-box">
                                                <span>{tag}</span>
                                                <button 
                                                    type="button" 
                                                    className="remove-tag"
                                                    onClick={() => removeTag(tag)}
                                                >
                                                    <FontAwesomeIcon icon={faTimesCircle} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="form-actions">
                                <button type="button" className="discard-btn" onClick={() => setShowModal(false)}>
                                    Discard
                                </button>
                                <button type="submit" className="submit-btn">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Delete confirmation modal */}
            {showDeleteConfirmation && (
                <div className="delete-confirmation-modal">
                    <div className="delete-confirmation-content">
                        <h3>Delete Post</h3>
                        <p>Are you sure you want to delete this post? This action cannot be undone.</p>
                        <div className="delete-confirmation-actions">
                            <button className="cancel-button" onClick={cancelDelete}>
                                Cancel
                            </button>
                            <button className="confirm-delete-button" onClick={confirmDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export { Community };
export default Community; 