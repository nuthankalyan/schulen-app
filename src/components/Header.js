import React from 'react';
import './Header.css';

export const Header = () => {
    const username = localStorage.getItem('username'); // Get username from localStorage

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-title">Schulen</div>
                <div className="header-username">Welcome, {username}</div>
            </div>
        </header>
    );
};