'use client';

import { useEffect, useState } from 'react';
import { getBlindSpotClient, getPendingSave, clearPendingSave, saveReportToBlindSpot, getReturnTo, clearReturnTo } from '@/lib/blindspot';

export default function BlindSpotCallback() {
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    (async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');

        if (access_token && refresh_token) {
          const supabase = getBlindSpotClient();
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          window.history.replaceState(null, '', window.location.pathname);
        }

        setMessage('Saving your report…');
        const pending = getPendingSave();
        if (pending) {
          await saveReportToBlindSpot(pending);
          clearPendingSave();
          setMessage('Report saved to BlindSpot.');
        } else {
          setMessage('Signed in.');
        }
        setStatus('done');

        // Return to exactly the page they were on (the map, with whatever
        // pin/view they had) instead of always landing on the homepage.
        const returnTo = getReturnTo();
        clearReturnTo();
        setTimeout(() => {
          window.location.href = returnTo || '/';
        }, 1200);
      } catch (e: any) {
        setStatus('error');
        setMessage(e.message || 'Something went wrong finishing sign-in.');
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>{status === 'error' ? '⚠️' : '☀️'}</div>
        <p style={{ fontSize: 14, color: status === 'error' ? '#dc2626' : '#888' }}>{message}</p>
        {status === 'error' && (
          <a href="/" style={{ fontSize: 13, color: '#E07B00', marginTop: 12, display: 'inline-block' }}>Back to SunScout</a>
        )}
      </div>
    </div>
  );
}
