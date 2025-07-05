import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import SetupPage from './pages/SetupPage';

const API = process.env.REACT_APP_API_BASE_URL || 'https://conqking-production.up.railway.app';

function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 🔐 Check token and user on load
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Check for token in URL (after OAuth redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
          // Store token in localStorage
          localStorage.setItem('authToken', token);
          // Remove token from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Get token from localStorage
        const storedToken = localStorage.getItem('authToken');
        
        if (!storedToken) {
          setAuthError('⚠️ No authentication token found');
          setLoading(false);
          return;
        }

        const res = await fetch(`${API}/api/auth/me`, {
          headers: getAuthHeaders()
        });

        const data = await res.json();

        if (!res.ok) {
          setAuthError(`⚠️ Session Error: ${data.message}`);
          localStorage.removeItem('authToken'); // Clear invalid token
          setLoading(false);
          return;
        }

        setUser(data);

        // 🔁 Redirect based on role
        if (data.role === 'mentor' || data.role === 'founder') {
          navigate('/dashboard');
        } else {
          navigate('/setup');
        }
      } catch (err) {
        setAuthError(`❌ Backend error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  return (
    <div>
      {authError && <div style={{ color: 'red', padding: '1rem' }}>{authError}</div>}

      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/dashboard"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user && user.role ? (
              <Dashboard user={user} />
            ) : (
              <div style={{ padding: '2rem' }}>⏳ Redirecting to setup...</div>
            )
          }
        />

        <Route
          path="/setup"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user ? (
              user.role ? (
                <div style={{ padding: '2rem' }}>✅ Redirecting to dashboard...</div>
              ) : (
                <SetupPage user={user} />
              )
            ) : (
              <div style={{ padding: '2rem' }}>⏳ Checking login...</div>
            )
          }
        />
      </Routes>
    </div>
  );
}

export default App;
