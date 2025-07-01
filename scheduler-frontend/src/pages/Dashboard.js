import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Dashboard.css';

const API = process.env.REACT_APP_API_BASE_URL;

// 🧠 Helper to format time
function formatSlotTime(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const weekday = startDate.toLocaleString('en-US', { weekday: 'short' }); // e.g., Fri
  const month = startDate.toLocaleString('en-US', { month: 'short' });     // e.g., Jul
  const date = startDate.getDate();                                        // e.g., 18

  const startTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${weekday}, ${month} ${date}, ${startTime} – ${endTime}`;
}

function Dashboard() {
  const [user, setUser] = useState(null);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API}/api/auth/me`, { withCredentials: true })
      .then(res => setUser(res.data))
      .catch(() => setError('❌ Not logged in or session expired'));
  }, []);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API}/api/slots`, { withCredentials: true })
      .then(res => setSlots(res.data))
      .catch(() => setError('❌ Failed to load slots'));
  }, [user]);

  if (error) return <p className="dashboard-error">{error}</p>;
  if (!user) return <p className="dashboard-loading">Loading...</p>;

  const bookedSlots = slots.filter(
    s => s.isBooked && (user.role === 'mentor' || s.bookedBy === user.email)
  );
  const availableSlots = slots.filter(s => !s.isBooked);

  return (
    <div className="dashboard-container">
      <div className="profile-header">
        <h1 className="dashboard-heading">
          Welcome, {user.name}{' '}
          <small data-role={user.role}>
            <strong>{user.role?.toUpperCase()}</strong>
          </small>
        </h1>
      </div>

      {user.role === 'mentor' ? (
        <>
          <h2 className="dashboard-subheading">Available Slots</h2>
          <ul className="slot-list">
            {availableSlots.map(slot => (
              <li key={slot.id} className="slot-item">
                <strong>{formatSlotTime(slot.time, slot.endTime)}</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    className="cancel-button"
                    onClick={() => {
                      axios.delete(`${API}/api/mentor/slots/${slot.id}`, { withCredentials: true })
                        .then(() => window.location.reload())
                        .catch(() => alert('❌ Failed to delete slot'));
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <hr className="section-divider" />

          <h2 className="dashboard-subheading">Booked Slots</h2>
          <ul className="slot-list">
            {bookedSlots.map(slot => (
              <li key={slot.id} className="slot-item booked-slot">
                <strong>{formatSlotTime(slot.time, slot.endTime)}</strong><br />
                <span className="booked-by">
                  Booked by: <strong>{slot.bookedByName}</strong> ({slot.bookedBy})
                </span>
              </li>
            ))}
          </ul>

          <hr className="section-divider" />

          <AddSlotForm />
        </>
      ) : (
        <>
          <h2 className="dashboard-subheading">Available Mentor Slots</h2>
          <ul className="slot-list">
            {availableSlots.map(slot => (
              <li key={slot.id} className="slot-item">
                <strong>{formatSlotTime(slot.time, slot.endTime)}</strong> with {slot.mentorName}
                <div style={{ marginTop: '0.1rem' }}>
                  <button
                    className="book-button"
                    onClick={() => {
                      axios.post(`${API}/api/mentor/book`, { id: slot.id }, { withCredentials: true })
                        .then(() => window.location.reload())
                        .catch(() => alert('❌ Booking failed'));
                    }}
                  >
                    Book
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <hr className="section-divider" />

          <ul className="slot-list">
            {bookedSlots.map(slot => (
              <li key={slot.id} className="slot-item booked-slot">
                <strong>{formatSlotTime(slot.time, slot.endTime)}</strong> with {slot.mentorName}<br />
                <span className="booked-by">
                  Meet Link: <a href={slot.meetLink} target="_blank" rel="noreferrer">{slot.meetLink}</a>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function AddSlotForm() {
  const [time, setTime] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    const start = new Date(time);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour later

    try {
      await axios.post(`${API}/api/mentor/slots`, {
        time: start.toISOString(),
        endTime: end.toISOString(),
      }, { withCredentials: true });

      alert('✅ Slot added!');
      window.location.reload();
    } catch {
      alert('❌ Failed to add slot');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-slot-form">
      <h2 className="dashboard-subheading">Add New Slot</h2>
      <div className="input-row">
        <input
          type="datetime-local"
          step="900" // 15 min intervals
          value={time}
          onChange={e => setTime(e.target.value)}
          required
        />
        <button type="submit" className="add-button">Add Slot</button>
      </div>
    </form>
  );
}

export default Dashboard;
