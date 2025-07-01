// src/pages/SetupPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_BASE_URL;

function SetupPage() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [startupName, setStartupName] = useState('');
  const [expertise, setExpertise] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setUser(data);

        // If already set up, skip this page
        if (data?.role && (data.role === 'mentor' || data.role === 'founder')) {
          navigate('/dashboard');
        }
      })
      .catch(() => setError('❌ Not logged in or session expired'));
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!role) return setError('Role is required');
    if (role === 'mentor' && !expertise) return setError('Expertise required for mentors');
    if (role === 'founder' && !startupName) return setError('Startup name required for founders');

    try {
      const res = await fetch(`${API}/api/auth/setup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, startupName, expertise, linkedin }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || '✅ Setup complete');
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        throw new Error(data.message || 'Setup failed');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>👋 Welcome, {user.name}</h2>
      <p>Please complete your profile setup.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <label>
          Role:
          <select value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="">Select</option>
            <option value="mentor">Mentor</option>
            <option value="founder">Founder</option>
          </select>
        </label>

        {role === 'founder' && (
          <label>
            Startup Name:
            <input type="text" value={startupName} onChange={(e) => setStartupName(e.target.value)} required />
          </label>
        )}

        {role === 'mentor' && (
          <label>
            Expertise:
            <input type="text" value={expertise} onChange={(e) => setExpertise(e.target.value)} required />
          </label>
        )}

        <label>
          LinkedIn (optional):
          <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
        </label>

        <button type="submit">Save Profile</button>
      </form>

      {message && <div style={{ color: 'green', marginTop: '1rem' }}>{message}</div>}
      {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
    </div>
  );
}

export default SetupPage;
