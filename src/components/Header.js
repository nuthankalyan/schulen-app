import React from 'react';
import './Header.css';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
    const username = localStorage.getItem('username'); // Get username from localStorage
    const navigate = useNavigate();

    const handleTitleClick = () => {
        navigate('/main');
    };

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-title" onClick={handleTitleClick}>Schulen</div>
                <div className="header-username">{username}</div>
            </div>
        </header>
    );
};