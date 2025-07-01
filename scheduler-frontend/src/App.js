import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import SetupPage from './pages/SetupPage';

const API = process.env.REACT_APP_API_BASE_URL;

function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔐 Check session on load
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          credentials: 'include',
        });

        const data = await res.json();

        if (!res.ok) {
          setAuthError(`⚠️ Session Error: ${data.message}`);
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
  }, []);

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
