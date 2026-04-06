'use client';
// components/SolarChart.tsx
// Elevation chart drawn on canvas — no Plotly/Recharts dependency

import { useEffect, useRef } from 'react';
import type { PathPoint } from '@/app/page';

interface SolarChartProps {
  pathData: PathPoint[];
  simTime: string;
}

export default function SolarChart({ pathData, simTime }: SolarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pathData.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = 200;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const pad = { left: 48, right: 16, top: 16, bottom: 32 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const maxEl = Math.max(...pathData.map(p => p.el), 10);
    const minEl = 0;

    const toX = (i: number) => pad.left + (i / (pathData.length - 1)) * chartW;
    const toY = (el: number) => pad.top + chartH - ((el - minEl) / (maxEl - minEl)) * chartH;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= 4; y++) {
      const yy = pad.top + (y / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(W - pad.right, yy); ctx.stroke();
      const label = Math.round(maxEl * (1 - y / 4));
      ctx.fillStyle = '#888';
      ctx.font = '10px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${label}°`, pad.left - 6, yy + 4);
    }

    // Fill area
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, 'rgba(224,123,0,0.18)');
    grad.addColorStop(1, 'rgba(224,123,0,0.01)');
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(0));
    pathData.forEach((p, i) => ctx.lineTo(toX(i), toY(p.el)));
    ctx.lineTo(toX(pathData.length - 1), toY(0));
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#E07B00';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    pathData.forEach((p, i) => {
      if (i === 0) ctx.moveTo(toX(i), toY(p.el));
      else ctx.lineTo(toX(i), toY(p.el));
    });
    ctx.stroke();

    // X-axis labels (every 2 hours)
    ctx.fillStyle = '#888';
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    pathData.forEach((p, i) => {
      if (p.time.endsWith(':00') && parseInt(p.time) % 2 === 0) {
        const x = toX(i);
        ctx.fillText(p.time, x, H - 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + chartH); ctx.stroke();
      }
    });

    // Current time indicator
    const [sh, sm] = simTime.split(':').map(Number);
    const simMinutes = sh * 60 + sm;
    const closest = pathData.reduce((best, p, i) => {
      const [ph, pm] = p.time.split(':').map(Number);
      const diff = Math.abs(ph * 60 + pm - simMinutes);
      return diff < best.diff ? { i, diff } : best;
    }, { i: 0, diff: Infinity });

    const xi = toX(closest.i);
    const yi = toY(pathData[closest.i]?.el ?? 0);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(224,123,0,0.4)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.moveTo(xi, pad.top); ctx.lineTo(xi, pad.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(xi, yi, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#E07B00';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [pathData, simTime]);

  return (
    <div style={{
      background: '#fff', border: '2px solid #FFF3E0',
      borderRadius: 16, padding: '16px 20px',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        Elevation Arc
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 200, display: 'block' }}
      />
    </div>
  );
}
