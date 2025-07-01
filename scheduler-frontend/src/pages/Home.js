import React, { useEffect } from 'react';
import './Home.css';

const API = process.env.REACT_APP_API_BASE_URL;

function Home() {
  useEffect(() => {
    // Disable scroll when Home mounts
    document.body.style.overflow = 'hidden';
    return () => {
      // Re-enable scroll on unmount
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleLogin = () => {
    window.location.href = `${API}/api/auth/google`;
  };

  return (
    <div className="home-container">
      <img src="/logo.png" alt="Background Logo" className="logo-bg" />
      <div className="home-content">
        <h1 className="home-title">CONQUEST PORTAL</h1>
        <p className="home-subtitle">Login securely using your Google account</p>
        <button className="home-button" onClick={handleLogin}>
          Sign in
        </button>
      </div>
    </div>
  );
}

export default Home;