import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Home } from './components/Home';
import { About } from './components/About';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { Main } from './components/Main';
import { BrowseProjects } from './components/BrowserProjects';
import { ProjectDetails } from './components/ProjectDetails';
import { MyProjects } from './components/MyProjects';
import { ProjectDashboard } from './components/ProjectDashboard';
import { Community } from './components/Community';
import { Blogs } from './components/Blogs';

const PrivateRoute = ({ element: Component, ...rest }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? <Component {...rest} /> : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/main" element={<PrivateRoute element={Main} />} />
      <Route path="/main/browseprojects" element={<PrivateRoute element={BrowseProjects} />} />
      <Route path="/main/browseprojects/:id" element={<PrivateRoute element={ProjectDetails} />} />
      <Route path="/main/myprojects" element={<PrivateRoute element={MyProjects} />} />
      <Route path="/main/project-dashboard/:id" element={<PrivateRoute element={ProjectDashboard} />} />
      <Route path="/main/community" element={<PrivateRoute element={Community} />} />
      <Route path="/main/blogs" element={<PrivateRoute element={Blogs} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;