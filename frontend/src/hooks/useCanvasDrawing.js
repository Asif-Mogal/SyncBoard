import { useState, useEffect, useRef } from 'react';

export const useCanvasDrawing = (canvasRef, onDrawAction, username) => {
  const [tool, setTool] = useState('pen'); // 'pen', 'line', 'rect', 'circle', 'eraser'
  const [color, setColor] = useState('#8b5cf6'); // premium purple default
  const [lineWidth, setLineWidth] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [fillShape, setFillShape] = useState(false);

  const startPointRef = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);
  const strokeIdRef = useRef(null);

  // Set up context
  const getContext = () => {
    if (!canvasRef.current) return null;
    return canvasRef.current.getContext('2d');
  };

  // Replay actions
  const drawHistory = (actions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getContext();
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Replay actions
    actions.forEach((action) => {
      executeAction(ctx, action);
    });
  };

  const getFillColor = (hexColor) => {
    if (!hexColor || hexColor === 'eraser') return 'transparent';
    if (hexColor.startsWith('rgba')) return hexColor;
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.25)`;
  };

  // Paint a single action
  const executeAction = (ctx, action) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (action.type === 'CLEAR') {
      const canvas = canvasRef.current;
      if (canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } else if (action.type === 'DRAW') {
      ctx.beginPath();
      if (action.color === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = action.color;
      }
      ctx.lineWidth = action.lineWidth;
      ctx.moveTo(action.prevX, action.prevY);
      ctx.lineTo(action.currX, action.currY);
      ctx.stroke();
    } else if (action.type === 'SHAPE') {
      ctx.beginPath();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.lineWidth;

      const width = action.currX - action.prevX;
      const height = action.currY - action.prevY;

      if (action.shape === 'line') {
        ctx.moveTo(action.prevX, action.prevY);
        ctx.lineTo(action.currX, action.currY);
      } else if (action.shape === 'rect') {
        if (action.fill) {
          ctx.fillStyle = getFillColor(action.color);
          ctx.fillRect(action.prevX, action.prevY, width, height);
        }
        ctx.strokeRect(action.prevX, action.prevY, width, height);
      } else if (action.shape === 'circle') {
        const radius = Math.sqrt(width * width + height * height);
        ctx.arc(action.prevX, action.prevY, radius, 0, 2 * Math.PI);
        if (action.fill) {
          ctx.fillStyle = getFillColor(action.color);
          ctx.fill();
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  // Handle local drawing events
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getContext();
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    // Account for high DPI scaling mapping to logical 1920x1080 space
    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    // Generate unique strokeId for this drawing segment
    strokeIdRef.current = `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    startPointRef.current = { x, y };

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
      }
      ctx.lineWidth = lineWidth;
    } else {
      // Take snapshot for previewing shapes/lines
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = getContext();
    if (!ctx) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const prevX = startPointRef.current.x;
    const prevY = startPointRef.current.y;

    if (tool === 'pen' || tool === 'eraser') {
      const drawColor = tool === 'eraser' ? 'eraser' : color;
      
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
      }
      ctx.lineWidth = lineWidth;
      ctx.lineTo(x, y);
      ctx.stroke();

      // Trigger socket draw action
      const action = {
        type: 'DRAW',
        username,
        prevX,
        prevY,
        currX: x,
        currY: y,
        color: drawColor,
        lineWidth,
        strokeId: strokeIdRef.current
      };
      
      onDrawAction(action);
      
      // Update start point for pen tracking
      startPointRef.current = { x, y };
    } else {
      // Shapes / Lines: restore snapshot and draw preview
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }

      ctx.beginPath();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      const width = x - prevX;
      const height = y - prevY;

      if (tool === 'line') {
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
      } else if (tool === 'rect') {
        if (fillShape) {
          ctx.fillStyle = getFillColor(color);
          ctx.fillRect(prevX, prevY, width, height);
        }
        ctx.strokeRect(prevX, prevY, width, height);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(width * width + height * height);
        ctx.arc(prevX, prevY, radius, 0, 2 * Math.PI);
        if (fillShape) {
          ctx.fillStyle = getFillColor(color);
          ctx.fill();
        }
      }
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Commit shape action if it's a shape
    if (tool !== 'pen' && tool !== 'eraser') {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1920 / rect.width;
      const scaleY = 1080 / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const prevX = startPointRef.current.x;
      const prevY = startPointRef.current.y;

      const action = {
        type: 'SHAPE',
        username,
        prevX,
        prevY,
        currX: x,
        currY: y,
        color,
        lineWidth,
        shape: tool,
        fill: fillShape,
        strokeId: strokeIdRef.current
      };
      onDrawAction(action);
    }
    snapshotRef.current = null;
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getContext();
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const action = {
      type: 'CLEAR',
      username,
      prevX: 0, prevY: 0, currX: 0, currY: 0,
      color: '', lineWidth: 0
    };
    onDrawAction(action);
  };

  return {
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
    executeAction
  };
};
