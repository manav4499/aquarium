import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './auth/login';
import Signup from './auth/signup';
import Dashboard from './dashboard/dashboard';
import FishCatchMap from './FishCatchMap';
import Navbar from './Navbar';
import { ThemeProvider } from './ColorTheme';
import { UserProvider, UserContext } from './UserContext';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user } = useContext(UserContext);
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { user } = useContext(UserContext);

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/map" element={<PrivateRoute><FishCatchMap /></PrivateRoute>} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </>
  );
};

function App() {


  return (
    <Router>
    <ThemeProvider>
      <UserProvider>
        <div className="App">
          <AppRoutes />
        </div>
      </UserProvider>
    </ThemeProvider>
  </Router>
  )
}

export default App;
