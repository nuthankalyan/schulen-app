import React, { useState, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import io from 'socket.io-client';
import config from '../config';
import './WhiteboardComponent.css';

const WhiteboardComponent = ({ projectId, username }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const socketRef = useRef(null);
  const savedDataRef = useRef(null);

  // Connect to socket server for real-time collaboration
  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(config.API_BASE_URL, {
      transports: ['polling'],
      secure: true,
      withCredentials: true
    });
    
    // Join the whiteboard room for this project
    socketRef.current.emit('joinWhiteboard', {
      projectId,
      username
    });

    // Listen for scene updates from other collaborators
    socketRef.current.on('whiteboardUpdate', (data) => {
      if (!excalidrawAPI || data.sender === username) return;
        
      console.log('Received whiteboard update from:', data.sender);
      
      try {
        // Check for elements in the received data
        if (data.elements && Array.isArray(data.elements) && data.elements.length > 0) {
          console.log(`Applying ${data.elements.length} elements from remote update`);
          excalidrawAPI.updateScene({ elements: data.elements });
        } else if (data.scene && Array.isArray(data.scene) && data.scene.length > 0) {
          // Backward compatibility with old format
          console.log(`Applying ${data.scene.length} elements from remote update (legacy format)`);
          excalidrawAPI.updateScene({ elements: data.scene });
        } else {
          console.log('Received update with no valid elements');
        }
      } catch (error) {
        console.error('Error applying remote update:', error);
      }
    });

    // Listen for collaborator updates
    socketRef.current.on('whiteboardCollaborators', (data) => {
      setCollaborators(data.collaborators);
    });

    // Get saved whiteboard data if available
    fetchWhiteboardData();
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveWhiteboard', { projectId, username });
        socketRef.current.disconnect();
      }
    };
  }, [projectId, username]);

  // Set up the Excalidraw API callback
  const onExcalidrawAPIRef = (api) => {
    try {
      console.log('Excalidraw API initialized');
      
      // Just store the API reference, don't try to update scene here
      // This avoids the replaceAllElements error
      setExcalidrawAPI(api);
      setIsLoading(false);
      
      // Signal that the API is ready, but don't try to load data yet
      console.log('Excalidraw API ready, setting up component');
    } catch (error) {
      console.error('Error initializing Excalidraw API:', error);
      setSaveStatus('Error initializing');
    }
  };

  // Fetch saved whiteboard data from server
  const fetchWhiteboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching whiteboard data for project:', projectId);
      
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${projectId}/whiteboard`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Server response for whiteboard data:', data);
        
        // Check if we have a valid response
        if (!data) {
          console.log('Empty response from server');
          setIsLoading(false);
          return;
        }
        
        // Check if there's valid whiteboard data
        if (data.whiteboardData) {
          // Try to process the data
          try {
            let validData = null;
            
            // Case 1: Object with elements array
            if (data.whiteboardData.elements && Array.isArray(data.whiteboardData.elements)) {
              console.log(`Found elements array with ${data.whiteboardData.elements.length} elements`);
              validData = { 
                elements: data.whiteboardData.elements 
              };
            }
            // Case 2: Just an array of elements
            else if (Array.isArray(data.whiteboardData)) {
              console.log(`Found direct array with ${data.whiteboardData.length} elements`);
              validData = data.whiteboardData;
            }
            
            // Just store the data in the ref for later use
            // The scene will be updated by the useEffect when API is available
            if (validData) {
              console.log('Storing valid whiteboard data for later use');
              savedDataRef.current = validData;
            } else {
              console.log('No valid whiteboard data found to store');
            }
          } catch (error) {
            console.error('Error processing whiteboard data:', error);
          }
        } else {
          console.log('No whiteboard data in response');
        }
      } else {
        console.error('Failed to fetch whiteboard data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching whiteboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save current whiteboard data
  const saveCurrentScene = async () => {
    if (!excalidrawAPI) {
      console.warn('Cannot save: Excalidraw API not initialized');
      return;
    }
    
    try {
      // Get just the elements 
      const elements = excalidrawAPI.getSceneElements();
      
      // Validate elements
      if (!elements || !Array.isArray(elements)) {
        console.warn('Invalid elements received from Excalidraw');
        setSaveStatus('Error: Invalid data');
        return;
      }
      
      // Don't save if there are no elements (empty whiteboard)
      if (elements.length === 0) {
        console.log('No elements to save, nothing has been drawn');
        setSaveStatus('Nothing to save');
        setTimeout(() => setSaveStatus(''), 2000);
        return;
      }
      
      console.log(`Saving ${elements.length} elements`);
      
      // Save elements array
      await saveWhiteboardData(elements);
    } catch (error) {
      console.error('Error saving whiteboard:', error);
      setSaveStatus('Save failed');
    }
  };

  // Save whiteboard data to the server
  const saveWhiteboardData = async (elements) => {
    try {
      const token = localStorage.getItem('token');
      
      setSaveStatus('Saving...');
      
      // Ensure we have valid elements array
      if (!elements || !Array.isArray(elements)) {
        console.error('Invalid elements to save:', elements);
        setSaveStatus('Error: Invalid data');
        return;
      }
      
      // Make sure elements data is serializable
      const safeElements = JSON.parse(JSON.stringify(elements));
      console.log(`Saving ${safeElements.length} elements to server`);
      
      // Store the elements in a standard format
      const whiteboardData = { elements: safeElements };
      
      // Store in the local ref first for immediate availability
      savedDataRef.current = whiteboardData;
      
      const response = await fetch(`${config.API_BASE_URL}/browseprojects/${projectId}/whiteboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ whiteboardData })
      });
      
      if (response.ok) {
        console.log('Whiteboard data saved successfully');
        setSaveStatus('Saved');
        
        // Clear save status after 2 seconds
        setTimeout(() => {
          setSaveStatus('');
        }, 2000);
      } else {
        const errorData = await response.text();
        console.error('Server responded with error:', response.status, errorData);
        setSaveStatus('Save failed');
      }
    } catch (error) {
      console.error('Error saving whiteboard data:', error);
      setSaveStatus('Save failed');
    }
  };

  // Handle changes to the whiteboard
  const onChange = (elements, appState) => {
    if (!excalidrawAPI || !socketRef.current) return;

    // Get the current elements
    const currentElements = excalidrawAPI.getSceneElements();
    
    // Validate elements before proceeding
    if (!currentElements || !Array.isArray(currentElements)) {
      console.warn('Invalid elements received from Excalidraw');
      return;
    }

    // Broadcast to other collaborators
    socketRef.current.emit('whiteboardUpdate', {
      projectId: projectId,
      elements: currentElements,
      sender: username
    });
  };

  // Add auto-save functionality
  useEffect(() => {
    let autoSaveInterval;
    
    // Only set up auto-save if excalidrawAPI is available
    if (excalidrawAPI) {
      console.log('Setting up auto-save interval');
      
      // Auto-save every 30 seconds
      autoSaveInterval = setInterval(() => {
        try {
          // Get just the elements
          const elements = excalidrawAPI.getSceneElements();
          
          // Only save if we have valid elements to save
          if (elements && Array.isArray(elements) && elements.length > 0) {
            console.log(`Auto-saving ${elements.length} elements`);
            saveWhiteboardData(elements).catch(err => {
              console.error('Auto-save failed:', err);
            });
          } else {
            console.log('No elements to auto-save');
          }
        } catch (error) {
          console.error('Error during auto-save:', error);
        }
      }, 30000); // 30 seconds
    }
    
    // Clean up the interval on unmount
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, [excalidrawAPI, projectId]);

  // Load saved data when API becomes available
  useEffect(() => {
    // Only run this effect when the API is available and we have saved data
    if (excalidrawAPI && savedDataRef.current) {
      console.log('API now available, attempting to load saved data');
      
      try {
        // Wait a moment to ensure the component is fully initialized
        setTimeout(() => {
          try {
            let elements = [];
            
            // Extract elements based on data format
            if (savedDataRef.current.elements && Array.isArray(savedDataRef.current.elements)) {
              elements = savedDataRef.current.elements;
              console.log(`Loading ${elements.length} elements from saved data object`);
            } else if (Array.isArray(savedDataRef.current)) {
              elements = savedDataRef.current;
              console.log(`Loading ${elements.length} elements from saved data array`);
            }
            
            // Only proceed if we have elements
            if (elements && elements.length > 0) {
              // This is the safest way to update the scene - just set the elements directly
              console.log('Setting elements on canvas');
              excalidrawAPI.updateScene({ elements });
            }
          } catch (loadError) {
            console.error('Error loading saved data:', loadError);
          }
        }, 500); // Short delay to ensure component is ready
      } catch (error) {
        console.error('Error in delayed load:', error);
      }
    }
  }, [excalidrawAPI]);

  // Custom UI element to show collaborators and save button
  const renderTopRightUI = () => {
    return (
      <div className="whiteboard-collaborators">
        <div className="collaborators-list">
          {collaborators.map((collaborator, index) => (
            <div key={index} className="collaborator-badge" 
              style={{ backgroundColor: stringToColor(collaborator) }}>
              {collaborator.substring(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
        <button 
          className="save-whiteboard-button"
          onClick={saveCurrentScene}
        >
          Save
        </button>
        {saveStatus && <div className="save-status">{saveStatus}</div>}
      </div>
    );
  };

  // Generate a color from a string (username)
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  };

  if (isLoading) {
    return <div className="whiteboard-loading">Loading whiteboard...</div>;
  }

  return (
    <div className="whiteboard-container">
      <Excalidraw
        ref={onExcalidrawAPIRef}
        onChange={onChange}
        renderTopRightUI={renderTopRightUI}
        // Configure Excalidraw props as needed
        zenModeEnabled={false}
        gridModeEnabled={true}
        theme="light"
        name={`Project Whiteboard - ${projectId}`}
        UIOptions={{
          canvasActions: {
            export: false,
            saveAsImage: false,
            saveToActiveFile: false,
            loadScene: false,
            saveScene: false,
            exportWithDarkMode: false,
            exportEmbedScene: false
          }
        }}
      />
    </div>
  );
};

export default WhiteboardComponent;