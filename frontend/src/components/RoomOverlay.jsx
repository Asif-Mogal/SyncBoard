import React, { useState } from 'react';
import { Sparkles, Palette, Users, ArrowRight } from 'lucide-react';

export default function RoomOverlay({ onJoinRoom }) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setError('');
    setLoading(true);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
    try {
      const response = await fetch(`${backendUrl}/api/room/create`, {
        method: 'POST',
      });
      if (response.ok) {
        const code = await response.text();
        onJoinRoom(code, username);
      } else {
        setError('Failed to create room. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to backend failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      setError('Please enter a valid 6-digit room code');
      return;
    }
    setError('');
    onJoinRoom(roomCode, username);
  };

  return (
    <div className="room-overlay">
      <div className="overlay-background">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
      </div>
      
      <div className="card-container glass">
        <div className="card-header">
          <div className="logo-icon">
            <Palette className="icon-gradient" size={32} />
          </div>
          <h1>SyncBoard</h1>
          <p>Real-Time Collaborative Drawing Board</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="card-body">
          <div className="input-group">
            <label htmlFor="username">Your Username</label>
            <input
              id="username"
              type="text"
              placeholder="e.g., Asif"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              maxLength={15}
            />
          </div>

          <div className="divider">
            <span>Choose Action</span>
          </div>

          <div className="actions-section">
            <button
              onClick={handleCreateRoom}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                'Creating Room...'
              ) : (
                <>
                  Create New Room
                  <Sparkles size={16} className="btn-icon" />
                </>
              )}
            </button>

            <div className="or-separator">or</div>

            <form onSubmit={handleJoinRoom} className="join-form">
              <div className="input-row">
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  maxLength={6}
                />
                <button type="submit" className="btn btn-secondary" disabled={loading}>
                  Join
                  <ArrowRight size={16} className="btn-icon" />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="card-footer">
          <div className="footer-item">
            <Users size={14} />
            <span>Multiuser Sync</span>
          </div>
          <div className="footer-item">
            <Sparkles size={14} />
            <span>Low Latency</span>
          </div>
        </div>
      </div>
    </div>
  );
}
