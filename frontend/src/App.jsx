import React, { useState, useRef, useEffect } from 'react';
import RoomOverlay from './components/RoomOverlay';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import ActiveUsersList from './components/ActiveUsersList';
import { useCanvasDrawing } from './hooks/useCanvasDrawing';
import { useWebSockets } from './hooks/useWebSockets';
import { LogOut, Layout } from 'lucide-react';

export default function App() {
  const [roomId, setRoomId] = useState(null);
  const [username, setUsername] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saved', 'error'
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  const canvasRef = useRef(null);
  const historyRef = useRef([]);

  // Local draw action handler: adds to local history and broadcasts via WebSocket
  const handleLocalDrawAction = (action) => {
    // Append to local history
    if (action.type === 'CLEAR') {
      historyRef.current = [];
    } else {
      historyRef.current.push(action);
    }
    // Send over socket
    sendDrawAction(action);
  };

  // Remote draw action handler: called by WebSocket listener
  const handleRemoteDrawAction = (action) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (action.type === 'UNDO') {
      const name = action.username;
      const strokeId = action.strokeId;
      const history = historyRef.current;

      if (strokeId) {
        // Remove all actions associated with this strokeId
        historyRef.current = history.filter((a) => a.strokeId !== strokeId);
      } else {
        // Fallback for actions missing a strokeId
        let lastIndex = -1;
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].username === name) {
            lastIndex = i;
            break;
          }
        }
        if (lastIndex !== -1) {
          history.splice(lastIndex, 1);
        }
      }
      drawHistory(historyRef.current);
    } else if (action.type === 'CLEAR') {
      historyRef.current = [];
      executeAction(ctx, action);
    } else {
      historyRef.current.push(action);
      executeAction(ctx, action);
    }
  };

  // Local user undo logic
  const handleLocalUndo = () => {
    const history = historyRef.current;
    
    // Find the last strokeId created by the local user
    let lastStrokeId = null;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].username === username && history[i].strokeId) {
        lastStrokeId = history[i].strokeId;
        break;
      }
    }

    if (lastStrokeId) {
      // Remove all segments sharing this strokeId
      historyRef.current = history.filter((a) => a.strokeId !== lastStrokeId);
      drawHistory(historyRef.current);
    } else {
      // Fallback: pop just the last single segment
      let lastIndex = -1;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].username === username) {
          lastIndex = i;
          break;
        }
      }
      if (lastIndex !== -1) {
        history.splice(lastIndex, 1);
        drawHistory(history);
      }
    }
    sendUndoAction();
  };

  // Remote cursor update handler
  const handleCursorUpdate = (cursor) => {
    setCursors((prev) => ({
      ...prev,
      [cursor.username]: {
        ...cursor,
        lastUpdated: Date.now(),
      },
    }));
  };

  // Active users panel update handler
  const handleActiveUsersUpdate = (users) => {
    setActiveUsers(users);
  };

  const {
    tool,
    setTool,
    color,
    setColor,
    lineWidth,
    setLineWidth,
    fillShape,
    setFillShape,
    startDrawing,
    draw,
    stopDrawing,
    clearBoard,
    drawHistory,
    executeAction,
  } = useCanvasDrawing(canvasRef, handleLocalDrawAction, username || 'Anonymous');

  const { sendDrawAction, sendCursorPosition, sendUndoAction, isConnected } = useWebSockets(
    roomId,
    username,
    handleRemoteDrawAction,
    handleCursorUpdate,
    handleActiveUsersUpdate
  );

  // Fetch room history when user joins
  useEffect(() => {
    if (!roomId) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/room/${roomId}/history`);
        if (response.ok) {
          const history = await response.json();
          historyRef.current = history;
          // Redraw canvas with full history
          setTimeout(() => {
            drawHistory(history);
          }, 100);
        }
      } catch (e) {
        console.error('Failed to load drawing history', e);
      }
    };

    fetchHistory();
  }, [roomId]);

  // Redraw board on window focus or DPI change to ensure lines are intact
  useEffect(() => {
    const handleVisibilityOrResize = () => {
      if (historyRef.current.length > 0) {
        drawHistory(historyRef.current);
      }
    };

    window.addEventListener('resize', handleVisibilityOrResize);
    document.addEventListener('visibilitychange', handleVisibilityOrResize);
    return () => {
      window.removeEventListener('resize', handleVisibilityOrResize);
      document.removeEventListener('visibilitychange', handleVisibilityOrResize);
    };
  }, [drawHistory]);

  const handleJoinRoom = (code, name) => {
    setUsername(name);
    setRoomId(code);
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    setUsername(null);
    setActiveUsers([]);
    setCursors({});
    historyRef.current = [];
  };

  const handleSaveWorkspace = async () => {
    if (!roomId) return;
    setSaving(true);
    setSaveStatus('');
    try {
      const response = await fetch(`${backendUrl}/api/room/${roomId}/save`, {
        method: 'POST',
      });
      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create an offscreen canvas to combine slate-900 background + drawings
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const oCtx = offscreen.getContext('2d');

    // Paint solid slate-900 background (matches CSS board style)
    oCtx.fillStyle = '#0f172a';
    oCtx.fillRect(0, 0, offscreen.width, offscreen.height);

    // Draw the main board drawings (including eraser holes)
    oCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `syncboard-${roomId}.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
  };

  if (!roomId || !username) {
    return <RoomOverlay onJoinRoom={handleJoinRoom} />;
  }

  return (
    <div className="workspace-container">
      {/* Header Bar */}
      <header className="workspace-header glass">
        <div className="header-brand">
          <Layout className="logo" />
          <span className="logo-text">SyncBoard</span>
        </div>
        
        {saveStatus === 'saved' && <div className="toast success">Workspace Saved!</div>}
        {saveStatus === 'error' && <div className="toast error">Save Failed</div>}

        <button className="leave-btn" onClick={handleLeaveRoom} title="Leave Room">
          <LogOut size={16} />
          <span>Exit Board</span>
        </button>
      </header>

      {/* Main Workspace Area */}
      <div className="workspace-main">
        {/* Left Side: Users Panel */}
        <ActiveUsersList
          roomId={roomId}
          activeUsers={activeUsers}
          isConnected={isConnected}
        />

        {/* Center: Interactive Board */}
        <Canvas
          canvasRef={canvasRef}
          cursors={cursors}
          startDrawing={startDrawing}
          draw={draw}
          stopDrawing={stopDrawing}
          onMouseMove={sendCursorPosition}
        />
      </div>

      {/* Floating Bottom Toolbar */}
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        lineWidth={lineWidth}
        setLineWidth={setLineWidth}
        fillShape={fillShape}
        setFillShape={setFillShape}
        onClear={clearBoard}
        onUndo={handleLocalUndo}
        onExport={handleExportPNG}
        onSave={handleSaveWorkspace}
        saving={saving}
      />
    </div>
  );
}
