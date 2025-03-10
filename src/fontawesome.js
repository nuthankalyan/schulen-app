/**
 * Centralized Font Awesome configuration
 * This file ensures Font Awesome is properly loaded and provides fallbacks
 */

import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus,
  faUsers,
  faCheckCircle,
  faBell,
  faCheck,
  faTimes,
  faThumbsUp,
  faArrowLeft,
  faHistory,
  faLaptopCode,
  faUserGraduate,
  faBriefcase,
  faChartLine,
  faHandshake,
  faArrowRight,
  faCode,
  faLightbulb,
  faProjectDiagram,
  faFolderOpen,
  faEnvelope,
  faSignOutAlt
} from '@fortawesome/free-solid-svg-icons';

// Add all icons to the library
library.add(
  faUserPlus,
  faUsers,
  faCheckCircle,
  faBell,
  faCheck,
  faTimes,
  faThumbsUp,
  faArrowLeft,
  faHistory,
  faLaptopCode,
  faUserGraduate,
  faBriefcase,
  faChartLine,
  faHandshake,
  faArrowRight,
  faCode,
  faLightbulb,
  faProjectDiagram,
  faFolderOpen,
  faEnvelope,
  faSignOutAlt
);

export { FontAwesomeIcon }; 