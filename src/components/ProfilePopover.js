import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '../fontawesome';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import config from '../config';

const ProfilePopover = ({ isOpen, anchorRef, onClose, username, setUsername }) => {
  const popoverRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  // Positioning
  const [style, setStyle] = useState({ opacity: 0, pointerEvents: 'none' });

  useEffect(() => {
    if (isOpen && anchorRef.current && popoverRef.current) {
      const btnRect = anchorRef.current.getBoundingClientRect();
      const popRect = popoverRef.current.getBoundingClientRect();
      let top = btnRect.bottom + 10 + window.scrollY;
      let left = btnRect.right - popRect.width + window.scrollX - 48; // shift left by 48px
      // Prevent overflow right, always keep at least 24px gap
      if (left + popRect.width > window.innerWidth - 24) {
        left = window.innerWidth - popRect.width - 24;
      }
      // Prevent overflow left
      if (left < 10) left = 10;
      // Prevent overflow bottom
      if (top + popRect.height > window.innerHeight - 10) {
        top = window.innerHeight - popRect.height - 10;
      }
      // Prevent overflow top
      if (top < 10) top = 10;
      setStyle({
        top,
        left,
        minWidth: '340px',
        opacity: 1,
        pointerEvents: 'auto',
        maxWidth: '98vw',
        maxHeight: '98vh',
        overflowY: 'auto',
      });
    } else {
      setStyle({ opacity: 0, pointerEvents: 'none' });
    }
  }, [isOpen, anchorRef]);

  // Outside click handler
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        (!anchorRef.current || !anchorRef.current.contains(e.target))
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose, anchorRef]);

  useEffect(() => {
    setNewUsername(username);
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setEditMode(false);
  }, [isOpen, username]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    onClose();
    navigate('/login');
  };

  const handleEdit = () => {
    setEditMode(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!newUsername) {
        setError('Username cannot be empty');
        setIsSaving(false);
        return;
      }
      if (password && password !== confirmPassword) {
        setError('Passwords do not match');
        setIsSaving(false);
        return;
      }
      const body = {};
      if (newUsername !== username) body.username = newUsername;
      if (password) body.password = password;
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const res = await fetch(`${config.API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(body)
      });
      if (res.status === 409) {
        setError('Username already exists');
        setIsSaving(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to update profile');
        setIsSaving(false);
        return;
      }
      setSuccess('Profile updated!');
      if (body.username) {
        setUsername(body.username);
        localStorage.setItem('username', body.username);
      }
      setEditMode(false);
    } catch (e) {
      setError('Error updating profile');
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    setIsDeleting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const res = await fetch(`${config.API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to delete account');
        setIsDeleting(false);
        return;
      }
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      onClose();
      navigate('/signup');
    } catch (e) {
      setError('Error deleting account');
    }
    setIsDeleting(false);
  };

  if (!isOpen) return null;
  return (
    <div
      ref={popoverRef}
      className={`profile-popover${isOpen ? ' open' : ''}`}
      style={style}
    >
      <div className="popover-caret" />
      <div className="profile-popover-content">
        <div className="profile-popover-header">
          <h3>Profile</h3>
        </div>
        <div className="profile-details">
          <div className="profile-row">
            <span className="profile-label">Username:</span>
            {editMode ? (
              <input value={newUsername} onChange={e => setNewUsername(e.target.value)} />
            ) : (
              <span className="profile-value">{username}</span>
            )}
            {!editMode && (
              <button className="edit-btn" onClick={handleEdit} title="Edit profile">
                <FontAwesomeIcon icon={faEdit} />
              </button>
            )}
          </div>
          {editMode && (
            <>
              <div className="profile-row">
                <span className="profile-label">New Password:</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="profile-row">
                <span className="profile-label">Confirm Password:</span>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            </>
          )}
        </div>
        {error && <div className="profile-error">{error}</div>}
        {success && <div className="profile-success">{success}</div>}
        <div className="profile-popover-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0 }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {editMode ? (
              <>
                <button className="save-button" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                <button className="cancel-button" onClick={() => setEditMode(false)}>Cancel</button>
              </>
            ) : null}
          </div>
          {!editMode && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="logout-button" style={{padding: '8px 18px'}} onClick={handleLogout}>Logout</button>
              <button className="delete-button" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete Account'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePopover; 