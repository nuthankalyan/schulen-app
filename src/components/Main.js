import React from 'react';
import './Main.css';
import { useNavigate, Link } from 'react-router-dom';

export const Main = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="main-container">
            <nav className="main_elements">
                <ul>
                    <li><Link to="/main/browseprojects">Browse Projects</Link></li>
                    <li><Link to="/my-projects">My Projects</Link></li>
                    <li><Link to="/messages">Messages</Link></li>
                    <li><button onClick={handleLogout}>Logout</button></li>
                </ul>
            </nav>
            <div className="content">
                {/* Content for the main application page */}
                <h1>Welcome to the Main Application Page</h1>
            </div>
        </div>
    );
};