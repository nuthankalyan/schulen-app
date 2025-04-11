import React from 'react';
import './Community.css';
import { Header } from './Header';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '../fontawesome';
import { 
  faProjectDiagram, 
  faFolderOpen, 
  faUsers, 
  faNewspaper,
  faSignOutAlt 
} from '@fortawesome/free-solid-svg-icons';

export const Community = () => {
    const navigate = useNavigate();
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
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
                        <Link to="/main/community" className="active">
                            <FontAwesomeIcon icon={faUsers} className="nav-icon" />
                            <span>Community</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/main/blogs">
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
                    <h1>Community</h1>
                </div>
                <div className="community-content">
                    <div className="empty-state">
                        <h2>Community Feature Coming Soon!</h2>
                        <p>We're working on building a vibrant community platform where you can connect with other students, share ideas, and collaborate on projects.</p>
                        <p>Check back soon for updates!</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Community; 