import React, { useState } from 'react';
import { Users, Copy, Check, Info } from 'lucide-react';

export default function ActiveUsersList({ roomId, activeUsers, isConnected }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getUserName = (user) => {
    if (!user) return 'Anonymous';
    if (typeof user === 'string') return user;
    if (typeof user === 'object' && user.username) return user.username;
    return String(user);
  };

  // Generate a deterministic color for each user's avatar
  const getUserColor = (username) => {
    const name = getUserName(username);
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#ec4899', // Pink
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Yellow
      '#8b5cf6', // Violet
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#f43f5e', // Rose
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="active-users-panel glass">
      <div className="panel-header">
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
          <span className="status-text">{isConnected ? 'Sync Online' : 'Connecting...'}</span>
        </div>
      </div>

      <div className="room-info">
        <span className="room-label">Room Code:</span>
        <button className="code-badge" onClick={handleCopyCode} title="Click to copy">
          <span className="room-id-digits">{roomId}</span>
          {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
        </button>
      </div>

      <div className="users-list-section">
        <div className="users-title">
          <Users size={16} />
          <span>Active Users ({activeUsers.length})</span>
        </div>

        <div className="users-list">
          {activeUsers.length === 0 ? (
            <div className="empty-users-info">No active users</div>
          ) : (
            activeUsers.map((user, index) => {
              const name = getUserName(user);
              return (
                <div key={`${name}-${index}`} className="user-item">
                  <div
                    className="user-avatar"
                    style={{ backgroundColor: getUserColor(name) }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name" title={name}>{name}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
