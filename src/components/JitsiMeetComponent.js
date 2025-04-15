import React, { useState, useEffect, useRef } from 'react';
import Jutsu from 'react-jitsi';
import config from '../config';
import './JitsiMeetComponent.css';

const JitsiMeetComponent = ({ roomName, displayName, onClose, isCreator }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useIframeAPI, setUseIframeAPI] = useState(true);
  const [meetingJoined, setMeetingJoined] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const domain = config.JITSI_DOMAIN || 'meet.jit.si';
  const jitsiApiRef = useRef(null);
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  // Add debug logging that can be displayed to the user
  const addDebugInfo = (message) => {
    console.log(`[Jitsi Debug] ${message}`);
    setDebugInfo(prev => `${prev}\n${message}`);
  };

  // Try loading Jitsi's API directly if react-jitsi fails due to CSP
  useEffect(() => {
    addDebugInfo(`Starting Jitsi with domain: ${domain}`);
    
    const loadExternalAPI = () => {
      try {
        if (window.JitsiMeetExternalAPI) {
          addDebugInfo('JitsiMeetExternalAPI already loaded');
          initializeJitsiMeet();
          return;
        }

        addDebugInfo('Attempting to load Jitsi external API directly');
        const script = document.createElement('script');
        script.src = `https://${domain}/external_api.js`;
        script.async = true;
        script.onload = () => {
          addDebugInfo('Jitsi external API loaded successfully');
          initializeJitsiMeet();
        };
        script.onerror = (e) => {
          addDebugInfo('Failed to load Jitsi external API');
          console.error('Failed to load Jitsi external API:', e);
          setError('Failed to load Jitsi meeting library. This may be due to Content Security Policy restrictions.');
          setLoading(false);
        };
        document.body.appendChild(script);
      } catch (err) {
        addDebugInfo(`Error loading Jitsi API: ${err.message}`);
        console.error('Error loading Jitsi API:', err);
        setError('Failed to load Jitsi meeting library. This may be due to Content Security Policy restrictions.');
        setLoading(false);
      }
    };

    const initializeJitsiMeet = () => {
      try {
        if (!window.JitsiMeetExternalAPI) {
          addDebugInfo('JitsiMeetExternalAPI not available');
          console.error('JitsiMeetExternalAPI not available');
          setError('Failed to initialize Jitsi meeting.');
          setLoading(false);
          return;
        }

        // Clean up any previous instance
        if (iframeRef.current) {
          iframeRef.current.remove();
        }

        // Sanitize room name to avoid invalid characters
        const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '');
        addDebugInfo(`Initializing meeting with room: ${sanitizedRoomName}`);

        // Make sure container exists
        const container = document.getElementById('jitsi-container');
        if (!container) {
          addDebugInfo('Error: jitsi-container not found in DOM');
          setError('Failed to find container element for Jitsi');
          setLoading(false);
          return;
        }

        const options = {
          roomName: sanitizedRoomName,
          width: '100%',
          height: '100%',
          parentNode: container,
          userInfo: {
            displayName: displayName
          },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            disableThirdPartyRequests: true,
            disableChromeExtensionCheck: true,
            disableFocusOnJoin: true,
            analytics: {
              disabled: true
            },
            testing: {
              suppressErrors: true
            }
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
              'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
              'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
              'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
              'e2ee', 'security'
            ]
          }
        };

        addDebugInfo('Creating JitsiMeetExternalAPI instance');
        // Create the Jitsi Meet API instance
        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;
        
        // Find the iframe that was created
        setTimeout(() => {
          iframeRef.current = document.querySelector('#jitsi-container iframe');
          if (iframeRef.current) {
            addDebugInfo('Jitsi iframe found in DOM');
            iframeRef.current.style.height = '100%';
            iframeRef.current.style.width = '100%';
            iframeRef.current.style.border = 'none';
            iframeRef.current.style.display = 'block';
          } else {
            addDebugInfo('Warning: Jitsi iframe not found in DOM');
          }
        }, 1000);

        // Add event listeners
        api.addListener('videoConferenceJoined', () => {
          addDebugInfo('Video conference joined - direct API');
          setLoading(false);
          setMeetingJoined(true);
        });

        api.addListener('videoConferenceLeft', handleVideoConferenceLeft);
        api.addListener('readyToClose', handleReadyToClose);
        api.addListener('participantLeft', handleParticipantLeft);
        api.addListener('participantJoined', handleParticipantJoined);
        
        // Handle errors
        api.addListener('errorOccurred', (error) => {
          console.error('Jitsi error occurred:', error);
          // Only set error state for serious errors, not warnings
          if (error && 
              (error.type === 'warning' || 
               (error.message && error.message.includes('extension')))) {
            console.warn('Non-critical Jitsi error - ignoring');
          } else {
            handleJitsiError(error);
          }
        });
      } catch (err) {
        addDebugInfo(`Error initializing Jitsi meeting: ${err.message}`);
        console.error('Error initializing Jitsi meeting:', err);
        setError('Failed to initialize Jitsi meeting. Please try again.');
        setLoading(false);
      }
    };

    // If react-jitsi fails, try direct approach
    if (!useIframeAPI) {
      loadExternalAPI();
    }
  }, [domain, displayName, roomName, useIframeAPI]);

  // Look for iframe load event to detect if the meeting is ready
  useEffect(() => {
    // Safety timeout - if loading persists for more than 12 seconds, hide the loader
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        addDebugInfo('Safety timeout reached - hiding loader');
        setLoading(false);
      }
    }, 12000);

    // Check if we have an iframe and attach a load listener to it
    const checkForIframe = setInterval(() => {
      const iframe = document.querySelector('#jitsi-container iframe, .jutsu-container iframe');
      if (iframe) {
        addDebugInfo('Iframe element found, attaching load listener');
        iframe.onload = () => {
          addDebugInfo('Iframe loaded');
          // Give it a short delay to initialize fully
          setTimeout(() => {
            setLoading(false);
          }, 2000);
        };
        clearInterval(checkForIframe);
      }
    }, 500);

    return () => {
      clearTimeout(safetyTimeout);
      clearInterval(checkForIframe);
    };
  }, [loading]);

  // Handle fallback when CSP blocks the standard integration
  useEffect(() => {
    // Set a timeout to check if loading is still true after 5 seconds
    // This may indicate that the component couldn't load due to CSP
    const timeoutId = setTimeout(() => {
      if (loading && !error && !meetingJoined) {
        addDebugInfo('Jitsi is taking too long to load, trying direct API approach');
        setUseIframeAPI(false);
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [loading, error, meetingJoined]);

  // Handle Jitsi events
  const handleJitsiIframeLoad = () => {
    addDebugInfo('Jutsu component onMeetingLoad called');
    setLoading(false);
  };

  const handleJitsiError = (error) => {
    console.error('Jitsi Meet error:', error);
    // Don't set error state for extension-related errors or warnings
    if (error && error.message && (
        error.message.includes('extension') || 
        error.message.includes('ERR_FAILED') ||
        error.type === 'warning'
      )) {
      console.warn('Non-critical Jitsi error - ignoring:', error.message);
      return;
    }
    
    setError('Failed to load meeting. Please try again.');
    setLoading(false);
    
    // If react-jitsi fails with a serious error, try direct approach
    setUseIframeAPI(false);
  };

  // Handle participant joined
  const handleParticipantJoined = (participant) => {
    addDebugInfo(`Participant joined: ${participant?.displayName || 'Unknown'}`);
    // Hide loading when participants join
    setLoading(false);
  };

  // Handle participant left
  const handleParticipantLeft = (participant) => {
    addDebugInfo(`Participant left: ${participant?.displayName || 'Unknown'}`);
  };

  // Handle API ready event
  const handleJitsiApiReady = (apiObj) => {
    try {
      console.log('Jitsi API is ready');
      // Store the API object reference
      jitsiApiRef.current = apiObj;

      if (apiObj) {
        // Configure API to disable Chrome extension check
        if (apiObj.executeCommand) {
          try {
            apiObj.executeCommand('disableChromeExtensionCheck');
          } catch (err) {
            console.warn('Could not disable Chrome extension check:', err);
          }
        }

        // Add event handlers explicitly
        if (apiObj.addEventListener) {
          apiObj.addEventListener('videoConferenceJoined', () => {
            console.log('Video conference joined event from apiReady');
            setLoading(false);
            setMeetingJoined(true);
          });

          // Listen for participant left events
          apiObj.addEventListener('videoConferenceLeft', handleVideoConferenceLeft);
          apiObj.addEventListener('readyToClose', handleReadyToClose);
        }
      }
      
      // Hide loading after a short delay, as the API is ready
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    } catch (error) {
      console.error('Error setting up Jitsi API event listeners:', error);
    }
  };

  // Handle video conference left
  const handleVideoConferenceLeft = () => {
    addDebugInfo('Participant left the conference');
    // Implement any cleanup
    onClose();
  };

  // Handle when Jitsi is ready to close
  const handleReadyToClose = () => {
    addDebugInfo('Jitsi is ready to close');
    onClose();
  };

  // Properly end the meeting
  const endMeeting = () => {
    try {
      if (jitsiApiRef.current) {
        addDebugInfo('Executing Jitsi hangup command');
        // Try to execute Jitsi's own hangup command
        jitsiApiRef.current.executeCommand('hangup');
      } else {
        addDebugInfo('Jitsi API reference not available for hangup');
      }
    } catch (error) {
      addDebugInfo(`Error hanging up the call: ${error.message}`);
      console.error('Error hanging up the call:', error);
    } finally {
      // Ensure we close the meeting UI in all cases
      onClose();
    }
  };

  // Clean up event listeners when component unmounts
  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        try {
          addDebugInfo('Cleaning up Jitsi API event listeners');
          if (useIframeAPI) {
            jitsiApiRef.current.removeEventListener('videoConferenceLeft', handleVideoConferenceLeft);
            jitsiApiRef.current.removeEventListener('readyToClose', handleReadyToClose);
          } else {
            // Different cleanup for direct API
            jitsiApiRef.current.dispose();
          }
        } catch (error) {
          addDebugInfo(`Error removing event listeners: ${error.message}`);
          console.error('Error removing event listeners:', error);
        }
      }
    };
  }, [useIframeAPI]);

  // Provide a direct link to join the meeting if everything fails
  const getDirectJitsiLink = () => {
    // Sanitize room name for direct link
    const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '');
    return `https://${domain}/${sanitizedRoomName}`;
  };

  // Handle the "show debug" button click
  const toggleDebugInfo = () => {
    const debugElement = document.getElementById('jitsi-debug-info');
    if (debugElement) {
      debugElement.style.display = debugElement.style.display === 'none' ? 'block' : 'none';
    }
  };

  return (
    <div className="jitsi-meet-container" ref={containerRef}>
      <div className="jitsi-header">
        <h3>Virtual Meeting: {roomName}</h3>
        <div className="jitsi-controls">
          <button className="debug-button" onClick={toggleDebugInfo}>
            Debug
          </button>
          {isCreator && (
            <button className="end-meeting-button" onClick={endMeeting}>
              End Meeting for All
            </button>
          )}
          <button className="close-button" onClick={onClose}>
            {isCreator ? 'Exit Meeting' : 'Leave Meeting'}
          </button>
        </div>
      </div>
      
      <div id="jitsi-debug-info" style={{display: 'none', color: 'white', background: 'rgba(0,0,0,0.8)', padding: '10px', maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '12px'}}>
        {debugInfo}
      </div>
      
      {loading && (
        <div className="jitsi-loading">
          <div className="loading-spinner"></div>
          <p>Loading meeting room...</p>
          <p className="loading-info">Domain: {domain}, Room: {roomName}</p>
        </div>
      )}
      
      {error && (
        <div className="jitsi-error">
          <p>{error}</p>
          <p>You can try joining the meeting directly:</p>
          <a 
            href={getDirectJitsiLink()} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="direct-link-button"
          >
            Join Meeting in New Tab
          </a>
          <button onClick={onClose}>Return to Dashboard</button>
        </div>
      )}
      
      <div className="meeting-content-area">
        {!error && (
          <>
            {useIframeAPI ? (
              <div className={loading ? "jutsu-wrapper hidden" : "jutsu-wrapper"}>
                <Jutsu
                  domain={domain}
                  roomName={roomName}
                  displayName={displayName}
                  onMeetingLoad={handleJitsiIframeLoad}
                  onError={handleJitsiError}
                  onApiReady={handleJitsiApiReady}
                  onVideoConferenceJoined={() => {
                    addDebugInfo('Video conference joined from props');
                    setLoading(false);
                    setMeetingJoined(true);
                  }}
                  configOverwrite={{
                    startWithAudioMuted: true,
                    startWithVideoMuted: false,
                    prejoinPageEnabled: false,
                    disableDeepLinking: true,
                    disableChromeExtensionCheck: true,
                    disableThirdPartyRequests: true
                  }}
                  interfaceConfigOverwrite={{
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    MOBILE_APP_PROMO: false,
                    HIDE_INVITE_MORE_HEADER: true,
                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
                  }}
                  containerStyle={{ width: '100%', height: '100%' }}
                />
              </div>
            ) : (
              <div 
                id="jitsi-container" 
                className={loading ? "jitsi-container hidden" : "jitsi-container"}
              ></div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JitsiMeetComponent; 