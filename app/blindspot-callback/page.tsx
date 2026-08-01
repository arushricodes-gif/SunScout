'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBlindSpotClient, getPendingSave, clearPendingSave, saveReportToBlindSpot } from '@/lib/blindspot';

export default function BlindSpotCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    (async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        console.log('[blindspot-callback] tokens in URL hash:', {
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
        });

        if (access_token && refresh_token) {
          const supabase = getBlindSpotClient();
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          console.log('[blindspot-callback] setSession result:', {
            gotSession: !!data?.session,
            userId: data?.session?.user?.id,
            error: error?.message,
          });
          if (error) throw error;
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          console.warn('[blindspot-callback] No tokens found in URL hash at all -- window.location.hash was:', window.location.hash);
        }

        // Re-check the session right before using it, to see exactly what
        // the client thinks it has at this point.
        const { data: checkData } = await getBlindSpotClient().auth.getSession();
        console.log('[blindspot-callback] session right before save:', {
          hasSession: !!checkData?.session,
          userId: checkData?.session?.user?.id,
        });

        setMessage('Saving your report…');
        const pending = getPendingSave();
        console.log('[blindspot-callback] pending report found:', !!pending);
        if (pending) {
          await saveReportToBlindSpot(pending);
          clearPendingSave();
          setMessage('Report saved to BlindSpot.');
        } else {
          setMessage('Signed in.');
        }
        setStatus('done');
        setTimeout(() => router.push('/'), 1200);
      } catch (e: any) {
        console.error('[blindspot-callback] failed:', e);
        setStatus('error');
        setMessage(e.message || 'Something went wrong finishing sign-in.');
      }
    })();
  }, [router]);

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
