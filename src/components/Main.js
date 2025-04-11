import React from 'react';
import './Main.css';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '../fontawesome';
import { 
  faProjectDiagram, 
  faFolderOpen, 
  faUsers, 
  faNewspaper,
  faSignOutAlt 
} from '@fortawesome/free-solid-svg-icons';

export const Main = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
    };

    return (
        <div className="main-container">
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
                {/* Content for the main application page */}
                <h1>Welcome to the Main Application Page</h1>
                <p>Use the navigation menu to explore projects, connect with the community, and read blogs.</p>
            </div>
        </div>
    );
};