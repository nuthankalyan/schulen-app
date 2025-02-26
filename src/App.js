import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Home } from './components/Home';
import { About } from './components/About';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { Main } from './components/Main';
import { BrowseProjects } from './components/BrowserProjects';
import { ProjectDetails } from './components/ProjectDetails';

const PrivateRoute = ({ element: Component, ...rest }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? <Component {...rest} /> : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/About" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/main" element={<PrivateRoute element={Main} />} />
      <Route path="/main/browseprojects" element={<PrivateRoute element={BrowseProjects} />} />
      <Route path="/main/browseprojects/:id" element={<PrivateRoute element={ProjectDetails} />} />
    </Routes>
  );
}

export default App;