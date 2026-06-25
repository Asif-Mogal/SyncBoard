import React, { useEffect } from 'react';

export default function Canvas({
  canvasRef,
  cursors,
  startDrawing,
  draw,
  stopDrawing,
  onMouseMove,
}) {
  // Setup high DPI scaling on mount/resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = 1920;
    const logicalHeight = 1080;

    // Set canvas dimensions adjusted for high-DPI screens
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;

    // Scale the rendering context to use logical coordinates
    ctx.scale(dpr, dpr);
    
    // Default drawing settings
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Since resetting canvas dimensions clears the context, 
    // any history should be re-rendered (handled in parent).
  }, []);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Scale client mouse coordinates to the logical 1920x1080 space
    const x = (e.clientX - rect.left) * (1920 / rect.width);
    const y = (e.clientY - rect.top) * (1080 / rect.height);
    
    // Propagate mouse movement for throttling and broadcasting
    onMouseMove(x, y);

    // Call hook drawing logic if drawing
    draw(e);
  };

  const getUserColor = (username) => {
    const name = typeof username === 'string' ? username : (username?.username || String(username) || 'Anonymous');
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
    <div className="canvas-wrapper">
      <div className="canvas-aspect-container">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="drawing-canvas"
        />

        {/* Live Cursors Overlay */}
        <div className="cursors-overlay">
          {Object.values(cursors).map((cursor) => {
            // Expire stale cursors (older than 10 seconds of inactivity)
            if (!cursor.x || !cursor.y || Date.now() - cursor.lastUpdated > 10000) {
              return null;
            }
            const color = getUserColor(cursor.username);
            return (
              <div
                key={cursor.username}
                className="remote-cursor"
                style={{
                  left: `${(cursor.x / 1920) * 100}%`,
                  top: `${(cursor.y / 1080) * 100}%`,
                }}
              >
                <svg
                  className="cursor-pointer"
                  style={{ fill: color }}
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                >
                  <path d="M4.5 3v15.2l3.8-3.8 2.9 6.8 2.6-1.1-2.9-6.8 5.3-.5z" />
                </svg>
                <div className="cursor-label" style={{ backgroundColor: color }}>
                  {cursor.username}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
