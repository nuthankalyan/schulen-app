import React, { useRef, useState } from 'react';
import './Header.css';
import { useNavigate } from 'react-router-dom';
import ProfilePopover from './ProfilePopover';

export const Header = () => {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [currentUsername, setCurrentUsername] = useState(localStorage.getItem('username') || '');
    const usernameRef = useRef(null);
    const navigate = useNavigate();

    const handleTitleClick = () => {
        navigate('/main');
    };

    const handleUsernameClick = () => {
        setIsProfileModalOpen(true);
    };

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-title" onClick={handleTitleClick}>Schulen</div>
                <div className="header-username" ref={usernameRef} onClick={handleUsernameClick} style={{ cursor: 'pointer' }}>{currentUsername}</div>
            </div>
            <ProfilePopover
                isOpen={isProfileModalOpen}
                anchorRef={usernameRef}
                onClose={() => setIsProfileModalOpen(false)}
                username={currentUsername}
                setUsername={setCurrentUsername}
            />
        </header>
    );
};