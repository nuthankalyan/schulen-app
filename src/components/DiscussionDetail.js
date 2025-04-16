import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Header } from './Header';
import { FontAwesomeIcon } from '../fontawesome';
import { 
  faProjectDiagram, 
  faFolderOpen, 
  faUsers, 
  faNewspaper,
  faSignOutAlt,
  faArrowLeft,
  faImage,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import './DiscussionDetail.css';

// A component for displaying images with base64 conversion
const ImageWithBase64 = memo(({ src, alt, className, apiUrl }) => {
    const [base64Image, setBase64Image] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 1;
    
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setLoadError(false);
        
        const fetchImage = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Authentication token not found');
                
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
                    if (isMounted) {
                        setBase64Image(reader.result);
                        setIsLoading(false);
                    }
                };
                
                reader.onerror = () => {
                    if (isMounted) {
                        console.error('Error converting image to base64');
                        setLoadError(true);
                        setIsLoading(false);
                    }
                };
                
                reader.readAsDataURL(blob);
            } catch (error) {
                console.error('Error fetching image:', error);
                if (isMounted) {
                    if (retryCount < maxRetries) {
                        setRetryCount(prev => prev + 1);
                    } else {
                        setLoadError(true);
                        setIsLoading(false);
                    }
                }
            }
        };
        
        fetchImage();
        
        return () => {
            isMounted = false;
        };
    }, [src, retryCount]);
    
    if (isLoading) {
        return <div className="image-loading">Loading image...</div>;
    }
    
    if (loadError) {
        return (
            <div className="image-error">
                <div>Failed to load image</div>
                <button 
                    className="retry-button"
                    onClick={() => {
                        setRetryCount(0);
                        setIsLoading(true);
                        setLoadError(false);
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }
    
    return (
        <img 
            src={base64Image} 
            alt={alt} 
            className={className}
            loading="lazy"
        />
    );
});

const DiscussionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [discussion, setDiscussion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const replyTextareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const cursorPositionRef = useRef(0);
    const [selectedImages, setSelectedImages] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);
    
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    useEffect(() => {
        fetchDiscussion();
    }, [id]);
    
    const fetchDiscussion = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            
            const response = await axios.get(`${API_URL}/community/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            setDiscussion(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching discussion:', err);
            setError('Failed to load discussion. Please try again later.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
    };
    
    const handleReplySubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            
            // Create FormData to send text and images
            const formData = new FormData();
            formData.append('content', replyContent);
            
            // Append each selected image to the form data
            selectedImages.forEach(image => {
                formData.append('images', image);
            });
            
            await axios.post(`${API_URL}/community/${id}/reply`, 
                formData, 
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            // Reset form state
            setReplyContent('');
            setSelectedImages([]);
            
            // No need to revoke object URLs since we're using data URLs
            setPreviewImages([]);
            
            fetchDiscussion();
        } catch (err) {
            console.error('Error adding reply:', err);
            setError('Failed to add reply. Please try again later.');
        }
    };
    
    const handleReplyChange = (e) => {
        setReplyContent(e.target.value);
        cursorPositionRef.current = e.target.selectionStart;
        adjustTextareaHeight();
    };
    
    const adjustTextareaHeight = () => {
        if (replyTextareaRef.current) {
            replyTextareaRef.current.style.height = 'auto';
            replyTextareaRef.current.style.height = `${replyTextareaRef.current.scrollHeight}px`;
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
                if (replyTextareaRef.current) {
                    const content = replyContent;
                    const cursorPos = cursorPositionRef.current;
                    const imgPlaceholder = `[Image: ${filesArray[0].name}]\n`;
                    
                    const newContent = content.substring(0, cursorPos) + imgPlaceholder + content.substring(cursorPos);
                    
                    setReplyContent(newContent);
                    
                    // Reset file input
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    
                    // Focus back on textarea and adjust cursor position
                    setTimeout(() => {
                        replyTextareaRef.current.focus();
                        replyTextareaRef.current.setSelectionRange(cursorPos + imgPlaceholder.length, cursorPos + imgPlaceholder.length);
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
        if (replyTextareaRef.current) {
            const content = replyContent;
            const imgPlaceholder = `[Image: ${imageName}]\n`;
            const updatedContent = content.replace(imgPlaceholder, '');
            
            if (content !== updatedContent) {
                setReplyContent(updatedContent);
                setTimeout(() => adjustTextareaHeight(), 0);
            }
        }
    };
    
    // Use React.useMemo to memoize content rendering and prevent unnecessary re-renders
    const renderContentWithImages = React.useMemo(() => {
        return (content, images, itemId, replyIndex = null) => {
            if (!content || !images || images.length === 0) {
                return <div className="content-text">{content || ""}</div>;
            }
            
            // Parse the content to find image placeholders
            const parts = [];
            let lastIndex = 0;
            const regex = /\[Image: (.*?)\]/g;
            let match;
            let imageIndex = 0;
            
            // Create a copy of the content to work with
            let workingContent = content;
            
            // Process all text and image placeholders
            while ((match = regex.exec(workingContent)) !== null && imageIndex < images.length) {
                // Add text before the image placeholder
                if (match.index > lastIndex) {
                    parts.push(
                        <span key={`text-${lastIndex}`}>
                            {workingContent.substring(lastIndex, match.index)}
                        </span>
                    );
                }
                
                // Add the image
                const imageUrl = replyIndex !== null
                    ? `${API_URL}/community/${itemId}/replies/${replyIndex}/images/${imageIndex}`
                    : `${API_URL}/community/${itemId}/images/${imageIndex}`;
                
                parts.push(
                    <ImageWithBase64
                        key={`img-${itemId}-${replyIndex !== null ? `reply-${replyIndex}` : 'main'}-${imageIndex}`}
                        src={imageUrl}
                        alt={`Content image ${imageIndex + 1}`}
                        className="embedded-image"
                        apiUrl={API_URL}
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
            
            // If there are more images than placeholders, append them at the end
            while (imageIndex < images.length) {
                const imageUrl = replyIndex !== null
                    ? `${API_URL}/community/${itemId}/replies/${replyIndex}/images/${imageIndex}`
                    : `${API_URL}/community/${itemId}/images/${imageIndex}`;
                
                parts.push(
                    <ImageWithBase64
                        key={`img-${itemId}-${replyIndex !== null ? `reply-${replyIndex}` : 'main'}-${imageIndex}`}
                        src={imageUrl}
                        alt={`Content image ${imageIndex + 1}`}
                        className="embedded-image"
                        apiUrl={API_URL}
                    />
                );
                imageIndex++;
            }
            
            // If no parts were created (no regex matches and no remaining text), just return the content
            if (parts.length === 0) {
                parts.push(<span key="text-full">{content}</span>);
                
                // Append all images at the end
                for (let i = 0; i < images.length; i++) {
                    const imageUrl = replyIndex !== null
                        ? `${API_URL}/community/${itemId}/replies/${replyIndex}/images/${i}`
                        : `${API_URL}/community/${itemId}/images/${i}`;
                    
                    parts.push(
                        <ImageWithBase64
                            key={`img-${itemId}-${replyIndex !== null ? `reply-${replyIndex}` : 'main'}-${i}`}
                            src={imageUrl}
                            alt={`Content image ${i + 1}`}
                            className="embedded-image"
                            apiUrl={API_URL}
                        />
                    );
                }
            }
            
            return <div className="content-with-images">{parts}</div>;
        };
    }, [API_URL]);
    
    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!discussion) return <div className="not-found">Discussion not found</div>;
    
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
                <div className="discussion-detail-header">
                    <Link to="/main/community" className="back-link">
                        <FontAwesomeIcon icon={faArrowLeft} /> Back to Discussions
                    </Link>
                </div>
                
                <div className="discussion-detail-container">
                    <div className="discussion-main">
                        <h1>{discussion.title}</h1>
                        <div className="discussion-meta">
                            <span>Posted by: {discussion.author.username}</span>
                            <span>{new Date(discussion.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="discussion-content">
                            {discussion && discussion.content && renderContentWithImages(discussion.content, discussion.images, discussion._id)}
                        </div>
                        {discussion.tags && discussion.tags.length > 0 && (
                            <div className="discussion-tags">
                                {discussion.tags.map((tag, index) => (
                                    <span key={index} className="tag">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="replies-section">
                        <h2>Replies ({discussion.replies.length})</h2>
                        
                        {discussion.replies.length === 0 ? (
                            <div className="no-replies">
                                No replies yet. Be the first to respond!
                            </div>
                        ) : (
                            <div className="replies-list">
                                {discussion.replies.map((reply, index) => (
                                    <div key={index} className="reply-card">
                                        <div className="reply-content">
                                            {reply && reply.content && renderContentWithImages(reply.content, reply.images, discussion._id, index)}
                                        </div>
                                        <div className="reply-meta">
                                            <span>
                                                {reply.author.username} - {new Date(reply.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className="reply-form">
                            <h3>Add a Reply</h3>
                            <form onSubmit={handleReplySubmit}>
                                <div className="form-group">
                                    <textarea
                                        ref={replyTextareaRef}
                                        value={replyContent}
                                        onChange={handleReplyChange}
                                        onInput={adjustTextareaHeight}
                                        placeholder="Write your reply here..."
                                        required
                                        className="auto-resize-textarea"
                                    />
                                    <div className="image-upload-button">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            id="reply-image-upload"
                                        />
                                        <label htmlFor="reply-image-upload">
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
                                
                                <button type="submit" className="reply-btn">
                                    Submit Reply
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscussionDetail; 