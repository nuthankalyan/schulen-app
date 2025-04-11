import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from './Header';
import config from '../config';
import './BlogPost.css';

const API_URL = config.API_BASE_URL;
const BLOGS_ENDPOINT = `${API_URL}/blogs`;

export const BlogPost = () => {
    const { blogId } = useParams();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recommendedBlogs, setRecommendedBlogs] = useState([]);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('You need to be logged in to view this blog');
                    setLoading(false);
                    return;
                }

                // Fetch specific blog
                console.log(`Fetching blog with ID: ${blogId}`);
                const response = await fetch(`${BLOGS_ENDPOINT}/${blogId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch blog: ${response.status}`);
                }

                const blogData = await response.json();
                console.log('Blog fetched:', blogData);
                setBlog(blogData);

                // Fetch recommended blogs (all other blogs)
                const recommendedResponse = await fetch(BLOGS_ENDPOINT, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (!recommendedResponse.ok) {
                    throw new Error(`Failed to fetch recommended blogs: ${recommendedResponse.status}`);
                }

                const allBlogs = await recommendedResponse.json();
                
                // Filter out the current blog and limit to 3 recommendations
                const filteredRecommendations = allBlogs
                    .filter(item => item._id !== blogId)
                    .slice(0, 3);
                
                setRecommendedBlogs(filteredRecommendations);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching blog:', err);
                setError(`Failed to load blog: ${err.message}`);
                setLoading(false);
            }
        };

        fetchBlog();
    }, [blogId]);

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading) {
        return (
            <div className="main-container">
                <Header />
                <div className="blog-post-container">
                    <div className="loading">Loading...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="main-container">
                <Header />
                <div className="blog-post-container">
                    <div className="error">{error}</div>
                </div>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="main-container">
                <Header />
                <div className="blog-post-container">
                    <div className="error">Blog not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="main-container">
            <Header />
            <div className="blog-post-container">
                <Link to="/main/blogs" className="back-to-blogs">
                    ← Back to Blogs
                </Link>
                
                <article className="blog-post">
                    <header className="blog-header">
                        <h1 className="blog-title">{blog.title}</h1>
                        <div className="blog-author">
                            Written by <span className="author-name">{blog.author.username}</span>
                            <span className="publication-date">{formatDate(blog.createdAt)}</span>
                        </div>
                        <h2 className="blog-subtitle">{blog.caption}</h2>
                    </header>
                    
                    <div className="blog-content">
                        {blog.content.split('\n').map((paragraph, index) => (
                            paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />
                        ))}
                    </div>
                </article>
                
                <section className="recommended-section">
                    <h3 className="recommended-heading">Recommended Blogs</h3>
                    {recommendedBlogs.length === 0 ? (
                        <p className="no-recommendations">No other blogs available at the moment.</p>
                    ) : (
                        <div className="recommended-blogs">
                            {recommendedBlogs.map(recommendedBlog => (
                                <Link 
                                    to={`/main/blogs/${recommendedBlog._id}`} 
                                    key={recommendedBlog._id}
                                    className="recommended-blog-card"
                                >
                                    <h4>{recommendedBlog.title}</h4>
                                    <p>{recommendedBlog.caption}</p>
                                    <div className="recommendation-meta">
                                        <span>{recommendedBlog.author.username}</span>
                                        <span>{formatDate(recommendedBlog.createdAt)}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}; 