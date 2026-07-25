// components/ReportButton.tsx
// Drop this anywhere in SunScoutApp — pass coords, address, tzOffset

'use client';

import { useState } from 'react';

interface ReportButtonProps {
  lat: number;
  lon: number;
  tzOffset: number;
  address?: string;
}

export default function ReportButton({ lat, lon, tzOffset, address }: ReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const addr = address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      const url = `/api/report/pdf?lat=${lat}&lon=${lon}&tzOffset=${tzOffset}&address=${encodeURIComponent(addr)}`;
      // Open in new tab — user can print to PDF
      window.open(url, '_blank');
    } catch {
      setError('Failed to generate report. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: loading ? '#d4a85a' : '#E07B00',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          transition: 'all .2s',
          boxShadow: '0 4px 16px rgba(224,123,0,0.3)',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
      >
        {loading ? (
          <>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>☀️</span>
            Generating report...
          </>
        ) : (
          <>
            <span>📄</span>
            Generate AI Report
          </>
        )}
      </button>

      {error && (
        <div style={{ fontSize: 12, color: '#dc2626' }}>{error}</div>
      )}

      <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.4 }}>
        Full 12-month solar analysis · Free
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}