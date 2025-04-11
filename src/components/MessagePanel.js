import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import config from '../config';
import './MessagePanel.css';

// Icons
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
  </svg>
);

// Socket instance
let socket;

const MessagePanel = ({ isOpen, onClose, projectId, currentUsername, projectTitle, onNewMessage, themeColors = { primary: 'rgb(41, 44, 88)', secondary: '#3498db' } }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messageListRef = useRef(null);
  const messageInputRef = useRef(null);
  
  // Connect to Socket.io when component mounts
  useEffect(() => {
    // Initialize socket connection
    socket = io(config.API_BASE_URL);
    
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to Socket.io server');
    });
    
    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from Socket.io server');
    });
    
    // Clean up on component unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);
  
  // Join/leave project room based on panel open state
  useEffect(() => {
    if (isOpen && projectId && socket && isConnected) {
      // Join the project room
      socket.emit('joinProject', projectId);
      
      // Load existing messages
      fetchMessages();
      
      // Listen for new messages
      socket.on('newMessage', (message) => {
        setMessages(prevMessages => [message, ...prevMessages]);
        
        // Notify parent component about new message
        if (typeof onNewMessage === 'function' && message.sender !== currentUsername) {
          onNewMessage(message);
        }
      });
      
      // Listen for typing indicators
      socket.on('userTyping', ({ username }) => {
        if (username !== currentUsername) {
          setTypingUsers(prev => {
            if (!prev.includes(username)) {
              return [...prev, username];
            }
            return prev;
          });
          
          // Auto-remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(user => user !== username));
          }, 3000);
        }
      });
    }
    
    // Clean up when panel closes
    return () => {
      if (socket && isConnected && projectId) {
        socket.off('newMessage');
        socket.off('userTyping');
        socket.emit('leaveProject', projectId);
      }
    };
  }, [isOpen, projectId, isConnected, currentUsername, onNewMessage]);
  
  // Smooth scroll to bottom when new messages arrive
  useEffect(() => {
    if (messageListRef.current && messages.length > 0) {
      messageListRef.current.scrollTop = 0; // Scroll to top since we're using column-reverse
    }
  }, [messages]);
  
  // Focus on input when panel opens
  useEffect(() => {
    if (isOpen && messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current.focus();
      }, 300);
    }
  }, [isOpen]);
  
  // Handle typing indicator
  const handleTyping = () => {
    if (!isTyping && socket && isConnected && projectId) {
      setIsTyping(true);
      socket.emit('userTyping', {
        projectId,
        username: currentUsername
      });
      
      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set timeout to clear typing status
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
      
      setTypingTimeout(timeout);
    }
  };
  
  // Fetch existing messages from the server
  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${projectId}/dashboard`, {
        headers: { 
          Authorization: token 
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.messages) {
        // Sort messages by timestamp (newest first)
        const sortedMessages = [...data.messages].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  
  // Send a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !projectId || !currentUsername) return;
    
    try {
      // Save message to database
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${projectId}/messages`, {
        method: 'POST',
        headers: { 
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: newMessage
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
      
      // Clear input field
      setNewMessage('');
      setIsTyping(false);
      
      // No need to emit socket event here as the server will handle that
      // after saving to database
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
           ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  return (
    <>
      <div className={`message-panel-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}></div>
      <div className={`message-panel-container ${isOpen ? 'active' : ''}`}>
        <div className="message-panel-header">
          <h3>Project Chat: {projectTitle}</h3>
          <button className="close-button" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        
        <div className="message-list" ref={messageListRef}>
          {messages.length === 0 ? (
            <div className="no-messages">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <>
              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`message-item ${message.sender === currentUsername ? 'message-sent' : 'message-received'}`}
                >
                  <div className="message-sender">{message.sender}</div>
                  <div className="message-content">{message.text}</div>
                  <div className="message-time">{formatTime(message.timestamp)}</div>
                </div>
              ))}
            </>
          )}
        </div>
        
        <form className="message-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="message-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            ref={messageInputRef}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!newMessage.trim() || !isConnected}
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </>
  );
};

export default MessagePanel; 