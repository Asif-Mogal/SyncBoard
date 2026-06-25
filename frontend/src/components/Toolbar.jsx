import React from 'react';
import { Pencil, Square, Circle, Minus, Eraser, Trash2, Undo, Download, Save, PaintBucket } from 'lucide-react';

const COLORS = [
  '#8b5cf6', // Indigo/purple
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Green
  '#ef4444', // Red
  '#f59e0b', // Yellow
  '#ffffff', // White
  '#000000', // Black
];

export default function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  lineWidth,
  setLineWidth,
  fillShape,
  setFillShape,
  onClear,
  onUndo,
  onExport,
  onSave,
  saving,
}) {
  return (
    <div className="toolbar-container glass">
      {/* Tool Selection Section */}
      <div className="toolbar-group">
        <button
          onClick={() => setTool('pen')}
          className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
          title="Pen"
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={() => setTool('line')}
          className={`tool-btn ${tool === 'line' ? 'active' : ''}`}
          title="Line"
        >
          <Minus size={18} />
        </button>
        <button
          onClick={() => setTool('rect')}
          className={`tool-btn ${tool === 'rect' ? 'active' : ''}`}
          title="Rectangle"
        >
          <Square size={18} />
        </button>
        <button
          onClick={() => setTool('circle')}
          className={`tool-btn ${tool === 'circle' ? 'active' : ''}`}
          title="Circle"
        >
          <Circle size={18} />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
          title="Eraser"
        >
          <Eraser size={18} />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* Colors Section */}
      <div className="toolbar-group colors-group">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              if (tool === 'eraser') setTool('pen');
              setColor(c);
            }}
            className={`color-dot ${color === c && tool !== 'eraser' ? 'selected' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
        
        {/* Custom Color Picker wrapper */}
        <div className="custom-color-picker-container">
          <input
            type="color"
            value={color}
            onChange={(e) => {
              if (tool === 'eraser') setTool('pen');
              setColor(e.target.value);
            }}
            className="custom-color-picker"
            title="Custom Color"
          />
        </div>
      </div>

      <div className="toolbar-divider"></div>

      {/* Brush Size / Line Width slider */}
      <div className="toolbar-group stroke-group">
        <span className="stroke-label">{lineWidth}px</span>
        <input
          type="range"
          min="1"
          max="40"
          value={lineWidth}
          onChange={(e) => setLineWidth(parseInt(e.target.value))}
          className="stroke-slider"
        />

        {/* Fill Toggle - show only for shape tools */}
        {(tool === 'rect' || tool === 'circle') && (
          <button
            onClick={() => setFillShape(!fillShape)}
            className={`tool-btn ${fillShape ? 'active' : ''}`}
            title="Fill Shape"
          >
            <PaintBucket size={18} />
          </button>
        )}
      </div>

      <div className="toolbar-divider"></div>

      {/* Action Operations */}
      <div className="toolbar-group">
        <button onClick={onUndo} className="action-btn" title="Undo Last Stroke">
          <Undo size={18} />
        </button>
        <button onClick={onClear} className="action-btn clear-btn" title="Clear Canvas">
          <Trash2 size={18} />
        </button>
        <button onClick={onExport} className="action-btn" title="Export board as PNG">
          <Download size={18} />
        </button>
        <button
          onClick={onSave}
          className={`action-btn save-btn ${saving ? 'loading' : ''}`}
          title="Save Workspace to DB"
          disabled={saving}
        >
          <Save size={18} />
        </button>
      </div>
    </div>
  );
}
