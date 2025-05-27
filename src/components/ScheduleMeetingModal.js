import React, { useState } from 'react';
import { FontAwesomeIcon } from '../fontawesome';
import { faTimes, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

const ScheduleMeetingModal = ({ isOpen, onClose, onSchedule, projectId }) => {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(60); // Default 60 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Get tomorrow's date in YYYY-MM-DD format as default
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Reset form state when modal is opened
  React.useEffect(() => {
    if (isOpen) {
      setMeetingTitle('');
      setMeetingDescription('');
      setMeetingDate(getTomorrow());
      setMeetingTime('10:00');
      setMeetingDuration(60);
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!meetingTitle.trim()) {
      setErrorMessage('Please enter a meeting title');
      return;
    }
    
    if (!meetingDate) {
      setErrorMessage('Please select a date');
      return;
    }
    
    if (!meetingTime) {
      setErrorMessage('Please select a time');
      return;
    }
    
    // Combine date and time into a Date object
    const scheduledFor = new Date(`${meetingDate}T${meetingTime}`);
    const now = new Date();
    
    // Ensure meeting is scheduled in the future
    if (scheduledFor <= now) {
      setErrorMessage('Meeting must be scheduled in the future');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const meetingData = {
        title: meetingTitle,
        description: meetingDescription,
        scheduledFor: scheduledFor.toISOString(),
        duration: parseInt(meetingDuration)
      };
      
      onSchedule(meetingData);
    } catch (error) {
      setErrorMessage('Failed to schedule meeting. Please try again.');
      console.error('Error scheduling meeting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="schedule-modal">
        <div className="modal-header">
          <h3><FontAwesomeIcon icon={faCalendarAlt} /> Schedule Meeting</h3>
          <button className="close-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <form onSubmit={handleSchedule}>
          {errorMessage && <div className="error-message">{errorMessage}</div>}
          
          <div className="form-group">
            <label htmlFor="meeting-title">Title*</label>
            <input
              id="meeting-title"
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="Meeting title"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="meeting-description">Description</label>
            <textarea
              id="meeting-description"
              value={meetingDescription}
              onChange={(e) => setMeetingDescription(e.target.value)}
              placeholder="Meeting description (optional)"
              rows={3}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="meeting-date">Date*</label>
              <input
                id="meeting-date"
                type="date"
                value={meetingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setMeetingDate(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="meeting-time">Time*</label>
              <input
                id="meeting-time"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="meeting-duration">Duration (minutes)</label>
            <select
              id="meeting-duration"
              value={meetingDuration}
              onChange={(e) => setMeetingDuration(e.target.value)}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
            </select>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              className="schedule-button" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleMeetingModal;
