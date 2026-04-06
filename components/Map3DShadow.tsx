'use client';
// components/Map3DShadow.tsx
import { useEffect, useMemo, useRef } from 'react';
import type { PathPoint } from '@/app/page';

interface Map3DShadowProps {
  lat: number; lon: number;
  pathData: PathPoint[];
  simTime: string;
  simPos: { sunLat: number; sunLon: number; shadowLat: number; shadowLon: number; azimuth: number; elevation: number };
  sunTimes: { rise: string; set: string; noon: string };
  animating: boolean;
}

export default function Map3DShadow({ lat, lon, pathData, simTime, simPos, sunTimes, animating }: Map3DShadowProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = useMemo(() => {
    const allPtsJs = JSON.stringify(pathData.map(p => ({
      lon: p.lon, lat: p.lat, shlat: p.shlat, shlon: p.shlon,
      el: Math.round(p.el * 100) / 100,
      az: Math.round(p.az * 100) / 100,
      time: p.time, iso: p.iso,
    })));

    const mel = Math.round(simPos.elevation * 100) / 100;
    const simIso = pathData[0]?.iso?.slice(0, 10)
      ? `${pathData[0].iso.slice(0, 10)}T${simTime}:00`
      : new Date().toISOString();

    const pathCoords = JSON.stringify(
      pathData.filter(p => p.el >= 0).map(p => [p.lat, p.lon])
    );

    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    let startIdx = 0, bd = 99999;
    for (let i = 0; i < pathData.length; i++) {
      const [h, m] = pathData[i].time.split(':').map(Number);
      const d = Math.abs(h * 60 + m - nowMins);
      if (d < bd) { bd = d; startIdx = i; }
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.osmbuildings.org/4.1.1/OSMBuildings-Leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}html,body{overflow:hidden;}
#map{width:100%;height:600px;}
.tbadge{position:absolute;top:14px;left:14px;z-index:1000;background:rgba(7,9,16,0.92);border:1px solid rgba(243,156,18,.25);border-radius:10px;padding:8px 16px;color:#F39C12;font-size:14px;font-weight:600;font-family:monospace;pointer-events:none;}
.hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);z-index:1000;color:rgba(255,255,255,.25);font-size:10px;pointer-events:none;font-family:monospace;background:rgba(7,9,16,.65);padding:5px 16px;border-radius:20px;white-space:nowrap;}
.tile-row{position:absolute;top:14px;left:130px;z-index:1000;display:flex;gap:6px;}
.tile-btn{background:rgba(7,9,16,.92);border:1px solid rgba(255,255,255,.07);color:#6B7280;font-size:11px;font-weight:600;font-family:monospace;padding:6px 13px;border-radius:9px;cursor:pointer;}
.tile-btn.on{border-color:rgba(243,156,18,.35);color:#F39C12;background:rgba(243,156,18,.07);}
.cb{background:#fff;border:2px solid #E5E7EB;color:#555;font-size:14px;font-weight:700;padding:8px 12px;border-radius:10px;cursor:pointer;line-height:1;}
.cb:hover{border-color:#E07B00;color:#E07B00;background:#FFF3E0;}
.cb.N{border-color:rgba(224,123,0,.4);color:#E07B00;font-size:11px;font-weight:800;}
.leaflet-control-attribution{display:none!important;}
.sun-lbl{background:linear-gradient(135deg,#F39C12,#E67E22);color:#000;padding:3px 8px;border-radius:7px;font-weight:700;font-size:11px;font-family:monospace;text-align:center;margin-top:2px;}
</style></head><body>
<div style="position:relative;width:100%;height:600px;">
  <div id="map"></div>
  <div class="tbadge">☀️ &nbsp;<span id="stm">${simTime}</span></div>
  <div class="tile-row">
    <button class="tile-btn on" id="bs" onclick="setT('s')">🗺 Street</button>
    <button class="tile-btn" id="bsat" onclick="setT('sat')">🛰 Satellite</button>
  </div>
  <div class="hint">🖱 Drag · Scroll zoom · ↔ rotate · ▲▼ tilt</div>
  <div style="position:absolute;top:14px;right:14px;z-index:1000;display:flex;flex-direction:column;gap:6px;align-items:center;background:rgba(255,255,255,0.95);border:2px solid rgba(224,123,0,0.25);border-radius:16px;padding:12px 10px;box-shadow:0 4px 20px rgba(0,0,0,0.12);">
    <div style="font-size:10px;font-weight:800;color:#E07B00;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px;white-space:nowrap;">Set View Angle</div>
    <button class="cb" id="btn-up">▲</button>
    <div style="display:flex;gap:5px;">
      <button class="cb" id="btn-left">◀</button>
      <button class="cb N" id="btn-n">N</button>
      <button class="cb" id="btn-right">▶</button>
    </div>
    <button class="cb" id="btn-down">▼</button>
  </div>
  <div style="position:absolute;top:198px;right:22px;z-index:1000;width:42px;height:42px;pointer-events:none;background:rgba(7,9,16,.88);border:1px solid rgba(255,255,255,.07);border-radius:50%;display:flex;align-items:center;justify-content:center;">
    <svg id="cmp" width="34" height="34" viewBox="-20 -20 40 40" style="transition:transform .2s;">
      <polygon points="0,-12 3,0 0,3 -3,0" fill="#E74C3C"/>
      <polygon points="0,12 3,0 0,-3 -3,0" fill="#374151"/>
      <text x="0" y="-14" text-anchor="middle" fill="#E74C3C" font-size="5.5" font-weight="bold" font-family="monospace">N</text>
      <text x="0" y="19" text-anchor="middle" fill="#374151" font-size="5.5" font-family="monospace">S</text>
      <text x="15" y="3" text-anchor="middle" fill="#374151" font-size="5.5" font-family="monospace">E</text>
      <text x="-15" y="3" text-anchor="middle" fill="#374151" font-size="5.5" font-family="monospace">W</text>
    </svg>
  </div>
</div>
<script>
// Leaflet base map
var map = L.map('map', {center:[${lat},${lon}], zoom:17, zoomControl:false, attributionControl:false});
L.control.zoom({position:'bottomright'}).addTo(map);
var streetTile = L.tileLayer('https://tile-a.openstreetmap.fr/hot/{z}/{x}/{y}.png');
var satTile    = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
streetTile.addTo(map);
var curT='s';
function setT(m){if(m===curT)return;curT=m;if(m==='s'){map.removeLayer(satTile);streetTile.addTo(map);}else{map.removeLayer(streetTile);satTile.addTo(map);}document.getElementById('bs').className='tile-btn'+(m==='s'?' on':'');document.getElementById('bsat').className='tile-btn'+(m==='sat'?' on':'');}

// OSMBuildings as Leaflet layer
var osmb = new OSMBuildings(map).date(new Date('${simIso}'));
osmb.load('https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json');

// Observer pin — geo-anchored
L.circleMarker([${lat},${lon}],{radius:9,color:'#fff',weight:3,fillColor:'#E07B00',fillOpacity:1}).addTo(map);

// Sun path line — geo-anchored
var pathCoords = ${pathCoords};
if(pathCoords.length>1){
  L.polyline(pathCoords,{color:'#F39C12',weight:5,opacity:0.85,dashArray:'8,10'}).addTo(map);
}

// Sun marker — geo-anchored, updates each tick
var sunIcon = L.divIcon({
  html:'<div style="font-size:26pt;line-height:1;filter:drop-shadow(0 0 10px rgba(255,200,0,.9));text-align:center;">☀️</div><div class="sun-lbl" id="stl">--:--</div>',
  iconSize:[56,56], iconAnchor:[28,20], className:''
});
var sunMarker = L.marker([${simPos.sunLat},${simPos.sunLon}],{icon:sunIcon, zIndexOffset:1000}).addTo(map);

// Shadow line — geo-anchored
var shadowLine = L.polyline(
  [[${lat},${lon}],[${simPos.shadowLat},${simPos.shadowLon}]],
  {color:'#8B9AB0',weight:4,dashArray:'6,8',opacity:0.7}
).addTo(map);

// Update function
var allPts = ${allPtsJs};
function updateView(p){
  if(p.iso) try{osmb.date(new Date(p.iso));}catch(e){}
  sunMarker.setLatLng([p.lat, p.lon]);
  shadowLine.setLatLngs([[${lat},${lon}],[p.shlat,p.shlon]]);
  sunMarker.setOpacity(p.el<0?0:1);
  shadowLine.setStyle({opacity:p.el<0?0:0.7});
  var sl=document.getElementById('stl'); if(sl)sl.textContent=p.time;
  var stm=document.getElementById('stm'); if(stm)stm.textContent=p.time;
}
updateView({lat:${simPos.sunLat},lon:${simPos.sunLon},shlat:${simPos.shadowLat},shlon:${simPos.shadowLon},el:${mel},time:'${simTime}',iso:'${simIso}'});

// Camera controls (OSMBuildings tilt/rotation)
var _s=(function(){try{var s=sessionStorage.getItem('osmCam');return s?JSON.parse(s):{rot:0,tilt:0};}catch(e){return{rot:0,tilt:0};}})();
var curRot=_s.rot||0, curTilt=_s.tilt||0;
function saveCamera(){try{sessionStorage.setItem('osmCam',JSON.stringify({rot:curRot,tilt:curTilt}));}catch(e){}}
function applyCamera(){try{osmb.rotation(curRot);osmb.tilt(curTilt);}catch(e){}document.getElementById('cmp').style.transform='rotate('+curRot+'deg)';}
applyCamera();
document.getElementById('btn-up').onclick    = function(){curTilt=Math.max(0,curTilt-10);applyCamera();saveCamera();};
document.getElementById('btn-down').onclick  = function(){curTilt=Math.min(70,curTilt+10);applyCamera();saveCamera();};
document.getElementById('btn-left').onclick  = function(){curRot=(curRot-15+360)%360;applyCamera();saveCamera();};
document.getElementById('btn-right').onclick = function(){curRot=(curRot+15)%360;applyCamera();saveCamera();};
document.getElementById('btn-n').onclick     = function(){curRot=0;curTilt=0;applyCamera();saveCamera();};

// Animation
var ai=${startIdx}, isAnimating=${animating?'true':'false'}, animInterval=null;
function startAnim(){if(animInterval)return;animInterval=setInterval(function(){updateView(allPts[ai]);ai=(ai+1)%allPts.length;},150);}
function stopAnim(){if(animInterval){clearInterval(animInterval);animInterval=null;}}
if(isAnimating)startAnim();

window.addEventListener('message',function(e){
  if(!e.data)return;
  if(e.data.type==='setAnimating'){isAnimating=e.data.value;if(isAnimating)startAnim();else stopAnim();}
  if(e.data.type==='seekTime'&&!isAnimating){
    var parts=e.data.time.split(':'),mins=parseInt(parts[0])*60+parseInt(parts[1]),best=0,bd=99999;
    for(var j=0;j<allPts.length;j++){var t=allPts[j].time.split(':'),d=Math.abs(parseInt(t[0])*60+parseInt(t[1])-mins);if(d<bd){bd=d;best=j;}}
    ai=best;updateView(allPts[best]);
  }
});
</script></body></html>`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, pathData.length > 0 ? pathData[0].iso.slice(0, 10) : '']);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'setAnimating', value: animating }, '*');
  }, [animating]);

  useEffect(() => {
    if (!animating) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'seekTime', time: simTime }, '*');
    }
  }, [simTime, animating]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      style={{ width: '100%', height: 620, border: 'none', borderRadius: 16 }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
