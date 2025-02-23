import React from 'react';
import './Main.css';
import { useNavigate } from 'react-router-dom';

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
                    <li><a href="/main/browseprojects">Browse Projects</a></li>
                    <li><a href="/my-projects">My Projects</a></li>
                    <li><a href="/messages">Messages</a></li>
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