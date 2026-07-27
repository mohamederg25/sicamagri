import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

/**
 * ChartCard — A wrapper around any chart with export-to-PNG capability.
 *
 * @param {Object} props
 * @param {string} props.title — Card title
 * @param {React.ReactNode} props.children — The chart content (recharts, etc.)
 * @param {string} [props.filename] — Download filename (without extension)
 * @param {string} [props.icon] — Optional emoji/icon prefix
 * @param {Object} [props.style] — Additional card styles
 */
const ChartCard = ({ title, children, filename = 'chart', icon, style }) => {
  const chartRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const handleExportImage = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Chart export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        ...style,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#222222',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {icon && <span>{icon}</span>}
          {title}
        </h3>
        <button
          onClick={handleExportImage}
          disabled={exporting}
          title="Exporter le graphique en PNG"
          style={{
            padding: '6px 12px',
            backgroundColor: exporting ? '#f3f4f6' : 'white',
            color: exporting ? '#9ca3af' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: exporting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!exporting) {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }
          }}
          onMouseLeave={(e) => {
            if (!exporting) {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#d1d5db';
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exporting ? 'Export...' : 'PNG'}
        </button>
      </div>
      <div ref={chartRef}>
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
