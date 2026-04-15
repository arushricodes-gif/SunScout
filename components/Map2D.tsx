'use client';
// components/Map2D.tsx
// The iframe owns its animation loop. React only rebuilds srcDoc when path/location changes.

import { useEffect, useMemo, useRef } from 'react';
import type { PathPoint } from '@/app/page';

interface SimPos { sunLat: number; sunLon: number; shadowLat: number; shadowLon: number; elevation: number; }

interface Map2DProps {
  lat: number;
  lon: number;
  pathData: PathPoint[];
  simPos: SimPos | null;
  riseEdge: [number, number] | null;
  setEdge: [number, number] | null;
  animating: boolean;
  locationSelectMode: boolean;
  height?: number;
  onLocationSelect?: (lat: number, lon: number) => void;
}

export default function Map2D({
  lat, lon, pathData, simPos, riseEdge, setEdge,
  animating, locationSelectMode, height = 560, onLocationSelect,
}: Map2DProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = useMemo(() => {
    const pathJs  = JSON.stringify(pathData.map(p => ({ lat: p.lat, lon: p.lon, shlat: p.shlat, shlon: p.shlon, el: p.el, time: p.time })));
    const riseJs  = JSON.stringify(riseEdge);
    const setJs   = JSON.stringify(setEdge);
    const spJs    = JSON.stringify(simPos ? { lat: simPos.sunLat, lon: simPos.sunLon, shlat: simPos.shadowLat, shlon: simPos.shadowLon, el: simPos.elevation } : null);
    const hasPath = pathData.length > 0;

    return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}body{background:#0A0C10;}
#map{height:${height}px;width:100%;border-radius:16px;border:1px solid rgba(243,156,18,.1);cursor:${locationSelectMode?'crosshair':'default'};}
.leaflet-control-attribution{display:none!important;}
.tile-row{position:absolute;top:14px;left:14px;z-index:20;display:flex;gap:6px;}
.tile-btn{background:rgba(7,9,16,.92);border:1px solid rgba(255,255,255,.07);color:#6B7280;font-size:11px;font-weight:600;font-family:monospace;padding:6px 13px;border-radius:9px;cursor:pointer;}
.tile-btn.on{border-color:rgba(243,156,18,.35);color:#F39C12;background:rgba(243,156,18,.07);}
.hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);z-index:20;color:rgba(255,255,255,.25);font-size:10px;pointer-events:none;font-family:monospace;background:rgba(7,9,16,.65);padding:5px 16px;border-radius:20px;border:1px solid rgba(255,255,255,.04);white-space:nowrap;}
#click-hint{position:absolute;bottom:46px;left:50%;transform:translateX(-50%);z-index:25;background:rgba(7,9,16,.88);border:1px solid rgba(243,156,18,.3);border-radius:10px;padding:7px 18px;color:#F39C12;font-size:11px;font-weight:600;font-family:monospace;pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .4s;}
</style></head><body>
<div style="position:relative;height:${height}px;">
  <div id="map"></div>
  <div class="tile-row">
    <button class="tile-btn on" id="bs" onclick="setTile('s')">Street</button>
    <button class="tile-btn" id="bsat" onclick="setTile('sat')">Satellite</button>
    <button class="tile-btn" id="bwind" onclick="toggleWind()">🌬️ Wind</button>
  </div>
  ${hasPath ? `
  <div style="position:absolute;top:14px;right:14px;z-index:9999;background:rgba(255,255,255,0.97);border:2px solid rgba(224,123,0,0.2);border-radius:14px;padding:14px 20px;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
    <div style="font-size:12px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;">Legend</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="width:32px;height:5px;background:#E74C3C;display:inline-block;border-radius:2px;"></span><span style="font-size:14px;font-weight:700;color:#E74C3C;">Sunrise line</span></div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="width:32px;height:5px;background:#3498DB;display:inline-block;border-radius:2px;"></span><span style="font-size:14px;font-weight:700;color:#3498DB;">Sunset line</span></div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="width:32px;height:0;border-top:4px dashed #8B9AB0;display:inline-block;"></span><span style="font-size:14px;font-weight:700;color:#8B9AB0;">Shadow line</span></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="width:32px;height:0;border-top:4px dashed #E07B00;display:inline-block;"></span><span style="font-size:14px;font-weight:700;color:#E07B00;">Sun path line</span></div>
  </div>` : ''}
  <div class="hint">${locationSelectMode ? '🖱 Click to set location' : '🖱 Drag · Scroll zoom'}</div>
  <div id="click-hint">📍 Location set!</div>
</div>
<script>
var TILES={s:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',sat:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'};
var curT='s',tL=null;
var street=L.tileLayer(TILES.s),sat2=L.tileLayer(TILES.sat);
var map=L.map('map',{center:[${lat},${lon}],zoom:17,layers:[street],zoomControl:false,attributionControl:false});
L.control.zoom({position:'bottomright'}).addTo(map); tL=street;
function setTile(m){if(m===curT)return;curT=m;if(tL)map.removeLayer(tL);tL=L.tileLayer(TILES[m]).addTo(map);document.getElementById('bs').className='tile-btn'+(m==='s'?' on':'');document.getElementById('bsat').className='tile-btn'+(m==='sat'?' on':'');}

var pin=L.marker([${lat},${lon}],{icon:L.divIcon({html:'<div style="font-size:22px;filter:drop-shadow(0 0 6px rgba(243,156,18,.8));">📍</div>',iconSize:[28,28],iconAnchor:[14,28],className:''})}).addTo(map);
${locationSelectMode ? `
var ch=document.getElementById('click-hint'),ht=null;
map.on('click',function(e){pin.setLatLng([e.latlng.lat,e.latlng.lng]);ch.style.opacity='1';clearTimeout(ht);ht=setTimeout(function(){ch.style.opacity='0';},1500);window.parent.postMessage({type:'map2d_click',lat:e.latlng.lat,lon:e.latlng.lng},'*');});` : ''}

L.circle([${lat},${lon}],{radius:250,color:'rgba(243,156,18,.25)',weight:1.5,fillColor:'rgba(243,156,18,.04)',fillOpacity:1}).addTo(map);

var pd=${pathJs};
${hasPath ? `L.polyline(pd.map(function(p){return[p.lat,p.lon];}),{color:'#F39C12',weight:7,dashArray:'8,12',opacity:.85}).addTo(map);` : ''}
${riseEdge ? `L.polyline([[${lat},${lon}],${riseJs}],{color:'#E74C3C',weight:5,opacity:.85}).addTo(map);` : ''}
${setEdge  ? `L.polyline([[${lat},${lon}],${setJs}],{color:'#3498DB',weight:5,opacity:.85}).addTo(map);` : ''}

${hasPath ? `
var sunIco=L.divIcon({html:'<div style="text-align:center;line-height:1;"><div style="font-size:28pt;filter:drop-shadow(0 0 10px rgba(255,200,0,.9));">☀️</div><div id="stl" style="background:linear-gradient(135deg,#F39C12,#E67E22);color:#000;padding:3px 9px;border-radius:7px;font-weight:700;font-size:11px;font-family:monospace;margin-top:2px;">--:--</div></div>',iconSize:[60,60],iconAnchor:[30,22],className:''});
var sunM=L.marker([pd[0].lat,pd[0].lon],{icon:sunIco}).addTo(map);
var shad=L.polyline([[${lat},${lon}],[pd[0].shlat,pd[0].shlon]],{color:'#8B9AB0',weight:5,dashArray:'6,10',opacity:.80}).addTo(map);

function upd(p){
  sunM.setLatLng([p.lat,p.lon]);
  shad.setLatLngs([[${lat},${lon}],[p.shlat,p.shlon]]);
  var sl=document.getElementById('stl');if(sl)sl.textContent=p.time;
  sunM.setOpacity(p.el<0?0:1);
  shad.setStyle({opacity:p.el<0?0:.7});
}

// Pick start index near current real time
var now=new Date(),nowMins=now.getHours()*60+now.getMinutes(),startIdx=0,bd=99999;
for(var i=0;i<pd.length;i++){var t=pd[i].time.split(':');var d=Math.abs(parseInt(t[0])*60+parseInt(t[1])-nowMins);if(d<bd){bd=d;startIdx=i;}}

var sp=${spJs};
if(sp)upd({lat:sp.lat,lon:sp.lon,shlat:sp.shlat,shlon:sp.shlon,el:sp.el,time:''});

var ai=startIdx;
var isAnimating=${animating ? 'true' : 'false'};
var animInterval=null;

function startAnim(){if(animInterval)return;animInterval=setInterval(function(){upd(pd[ai]);ai=(ai+1)%pd.length;},150);}
function stopAnim(){if(animInterval){clearInterval(animInterval);animInterval=null;}}

if(isAnimating)startAnim();

window.addEventListener('message',function(e){
  if(!e.data)return;
  if(e.data.type==='setAnimating'){
    isAnimating=e.data.value;
    if(isAnimating)startAnim(); else stopAnim();
  }
  if(e.data.type==='seekTime'&&!isAnimating){
    var parts=e.data.time.split(':');var mins=parseInt(parts[0])*60+parseInt(parts[1]);
    var best=0,bd2=99999;
    for(var j=0;j<pd.length;j++){var t2=pd[j].time.split(':');var d2=Math.abs(parseInt(t2[0])*60+parseInt(t2[1])-mins);if(d2<bd2){bd2=d2;best=j;}}
    ai=best;upd(pd[best]);
  }
});
` : ''}

// ── WIND OVERLAY ──
var windCanvas = document.createElement('canvas');
windCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:19;';
document.querySelector('#map').parentElement.appendChild(windCanvas);
var wCtx = windCanvas.getContext('2d');
var windOn = false;
var windParticles = [];
var windSpeed = 0, windDir = 0, windAnimId = null;

function toggleWind() {
  windOn = !windOn;
  document.getElementById('bwind').className = 'tile-btn' + (windOn ? ' on' : '');
  if (windOn) { fetchWind(); }
  else { cancelAnimationFrame(windAnimId); wCtx.clearRect(0,0,windCanvas.width,windCanvas.height); windParticles=[]; }
}

function fetchWind() {
  var lat = map.getCenter().lat, lon = map.getCenter().lng;
  var h = new Date().getHours();
  fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&hourly=windspeed_10m,winddirection_10m&forecast_days=1')
    .then(function(r){return r.json();})
    .then(function(d){
      windSpeed = d.hourly.windspeed_10m[h];
      windDir = d.hourly.winddirection_10m[h];
      initParticles();
      animateWind();
    });
}

function initParticles() {
  windParticles = [];
  var w = windCanvas.width, h = windCanvas.height;
  for (var i = 0; i < 80; i++) {
    windParticles.push({ x: Math.random()*w, y: Math.random()*h, age: Math.random()*100 });
  }
}

function animateWind() {
  if (!windOn) return;
  var w = windCanvas.offsetWidth, h = windCanvas.offsetHeight;
  windCanvas.width = w; windCanvas.height = h;
  wCtx.clearRect(0,0,w,h);
  var rad = (windDir - 180) * Math.PI / 180;
  var speed = (windSpeed / 30) * 3 + 0.5;
  var dx = Math.sin(rad) * speed, dy = -Math.cos(rad) * speed;
  wCtx.strokeStyle = 'rgba(37,99,235,0.55)';
  wCtx.lineWidth = 1.5;
  windParticles.forEach(function(p) {
    var tail = 12;
    wCtx.beginPath();
    wCtx.moveTo(p.x - dx*tail, p.y - dy*tail);
    wCtx.lineTo(p.x, p.y);
    wCtx.stroke();
    // arrowhead
    wCtx.beginPath();
    wCtx.arc(p.x, p.y, 2, 0, Math.PI*2);
    wCtx.fillStyle = 'rgba(37,99,235,0.8)';
    wCtx.fill();
    p.x += dx * 1.5; p.y += dy * 1.5; p.age++;
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
  });
  // wind label
  wCtx.fillStyle = 'rgba(37,99,235,0.9)';
  wCtx.font = 'bold 11px monospace';
  wCtx.fillText('💨 ' + windSpeed.toFixed(1) + ' km/h  ' + windDir + '°', 12, h - 14);
  windAnimId = requestAnimationFrame(animateWind);
}

map.on('move', function() { if(windOn) fetchWind(); });
</script></body></html>`;
  // Only rebuild when actual data changes, NOT animating toggle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, pathData.length > 0 ? pathData[0].iso.slice(0,10) : '', JSON.stringify(riseEdge), JSON.stringify(setEdge), locationSelectMode, height]);

  // Communicate animating changes via postMessage — no iframe reload
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'setAnimating', value: animating }, '*');
  }, [animating]);

  // When paused + simTime changes, seek iframe
  useEffect(() => {
    if (!animating && simPos) {
      // Nothing to do — upd() runs from simPos on next render if pathData changes
    }
  }, [animating, simPos]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'map2d_click' && onLocationSelect) {
        onLocationSelect(e.data.lat, e.data.lon);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onLocationSelect]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      style={{ width: '100%', height: height + 20, border: 'none', borderRadius: 16 }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
