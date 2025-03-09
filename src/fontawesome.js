/**
 * Centralized Font Awesome configuration
 * This file ensures Font Awesome is properly loaded and provides fallbacks
 */

// All Font Awesome icons used in the application
let FontAwesomeIcon;
let icons = {};

try {
  // Import the FontAwesomeIcon component
  const fontawesome = require('@fortawesome/react-fontawesome');
  FontAwesomeIcon = fontawesome.FontAwesomeIcon;
  
  // Import all solid icons
  const solidIcons = require('@fortawesome/free-solid-svg-icons');
  
  // Map of all icons used in the application
  icons = {
    // ProjectDetails icons
    faUserPlus: solidIcons.faUserPlus,
    faUsers: solidIcons.faUsers,
    faCheckCircle: solidIcons.faCheckCircle,
    faBell: solidIcons.faBell,
    faCheck: solidIcons.faCheck,
    faTimes: solidIcons.faTimes,
    faThumbsUp: solidIcons.faThumbsUp,
    faArrowLeft: solidIcons.faArrowLeft,
    faHistory: solidIcons.faHistory,
    faClose: solidIcons.faTimes,
    
    // Home icons
    faLaptopCode: solidIcons.faLaptopCode,
    faUserGraduate: solidIcons.faUserGraduate,
    faBriefcase: solidIcons.faBriefcase,
    faChartLine: solidIcons.faChartLine,
    faHandshake: solidIcons.faHandshake,
    faArrowRight: solidIcons.faArrowRight,
    faCode: solidIcons.faCode,
    faLightbulb: solidIcons.faLightbulb,
    
    // BrowserProjects icons
    faProjectDiagram: solidIcons.faProjectDiagram,
    faFolderOpen: solidIcons.faFolderOpen,
    faEnvelope: solidIcons.faEnvelope,
    faSignOutAlt: solidIcons.faSignOutAlt
  };
} catch (error) {
  console.warn('Font Awesome could not be loaded:', error);
  
  // Define the icon map for fallbacks
  const iconMap = {
    // ProjectDetails icons
    faUserPlus: '👤+',
    faUsers: '👥',
    faCheckCircle: '✓',
    faBell: '🔔',
    faCheck: '✓',
    faTimes: '✗',
    faThumbsUp: '👍',
    faArrowLeft: '←',
    faHistory: '🕒',
    faClose: '✗',
    
    // Home icons
    faLaptopCode: '💻',
    faUserGraduate: '🎓',
    faBriefcase: '💼',
    faChartLine: '📈',
    faHandshake: '🤝',
    faArrowRight: '→',
    faCode: '{ }',
    faLightbulb: '💡',
    
    // BrowserProjects icons
    faProjectDiagram: '📊',
    faFolderOpen: '📂',
    faEnvelope: '✉️',
    faSignOutAlt: '🚪'
  };
  
  // Create a simple icon component as fallback
  FontAwesomeIcon = ({ icon }) => {
    return <span style={{ fontWeight: 'bold' }}>{iconMap[icon.iconName] || '•'}</span>;
  };
  
  // Create empty icon objects for fallback
  Object.keys(iconMap).forEach(key => {
    icons[key] = { iconName: key };
  });
}

export { FontAwesomeIcon, icons }; 