/**
 * DashboardWidget — Wrapper for a customizable dashboard widget
 * ==============================================================
 * Renders a title bar with drag handle (in customize mode) and close/hide button.
 * Children are the widget content (charts, tables, KPIs, etc.).
 */

import { GripVertical, X, Maximize2 } from 'lucide-react';

const DashboardWidget = ({
  id,
  title,
  children,
  customizing,
  onRemove,
  style,
}) => {
  return (
    <div
      className={`dashboard-widget ${customizing ? 'dashboard-widget--editing' : ''}`}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: customizing ? '2px dashed #008030' : '1px solid #C8E6C9',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        boxShadow: customizing ? '0 2px 12px rgba(0,128,48,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
        ...style,
      }}
    >
      {/* ── Title bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderBottom: '1px solid #f0f0f0',
          cursor: customizing ? 'grab' : 'default',
          userSelect: 'none',
          background: customizing ? '#f0fdf4' : 'white',
          flexShrink: 0,
          minHeight: '44px',
        }}
        // react-grid-layout uses this class for the drag handle
        className={customizing ? 'react-grid-drag-handle' : ''}
      >
        {customizing && (
          <span style={{ color: '#008030', display: 'flex', alignItems: 'center' }}>
            <GripVertical size={18} />
          </span>
        )}
        <span
          style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: 700,
            color: '#222',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
        {customizing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove?.(id);
            }}
            title="Masquer ce widget"
            style={{
              padding: '4px 6px',
              border: 'none',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              fontFamily: 'inherit',
              transition: 'all 0.12s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fecaca'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Content area (scrollable) ── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: customizing ? '14px 16px' : '0',
        }}
      >
        {children}
      </div>

      {/* ── Resize handle indicator (customize mode only) ── */}
      {customizing && (
        <div
          className="react-grid-resize-handle"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: '20px',
            height: '20px',
            cursor: 'se-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#008030',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        >
          <Maximize2 size={12} />
        </div>
      )}
    </div>
  );
};

export default DashboardWidget;
