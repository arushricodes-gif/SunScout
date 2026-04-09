'use client';

import { useMemo } from 'react';

interface SeasonalMap3DProps {
  lat: number;
  lon: number;
  seasonal: Record<string, [number, number][]>;
}

const COLORS: Record<string, string> = {
  Summer: '#FF4444',
  Autumn: '#FF8C00',
  Spring: '#C8A800',
  Winter: '#5BAED8',
};

export default function SeasonalMap3D({ lat, lon, seasonal }: SeasonalMap3DProps) {
  const html = useMemo(() => {
    const pathsJs = Object.entries(seasonal).map(([sid, coords]) => {
      if (!coords.length) return '';
      const col = COLORS[sid] || '#fff';
      return `
L.polyline(${JSON.stringify(coords)},{color:'${col}',weight:5,opacity:.9,pane:'arcPane'}).addTo(map);
L.circleMarker(${JSON.stringify(coords[0])},{radius:8,color:'rgba(255,255,255,.6)',weight:2,fillColor:'${col}',fillOpacity:1,pane:'arcPane'}).addTo(map).bindTooltip('<b style="color:${col};font-size:12px;font-weight:700;">${sid}</b>',{permanent:true,direction:'top',className:'slbl'});
L.circleMarker(${JSON.stringify(coords[coords.length-1])},{radius:6,color:'rgba(255,255,255,.4)',weight:1,fillColor:'${col}',fillOpacity:.8,pane:'arcPane'}).addTo(map);`;
    }).join('\n');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.osmbuildings.org/3.1.0/OSMBuildings-Leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}html,body{overflow:hidden;}
#map{width:100%;height:100vh;}
.slbl{background:rgba(255,255,255,0.95)!important;border:1px solid rgba(0,0,0,.1)!important;font-size:12px!important;font-weight:700!important;padding:4px 10px!important;border-radius:6px!important;box-shadow:0 2px 8px rgba(0,0,0,.15)!important;}
.leaflet-tooltip-top:before{display:none!important;}
.leaflet-control-attribution,.osmb-attribution{display:none!important;}
.hint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);z-index:1000;color:rgba(255,255,255,.3);font-size:10px;pointer-events:none;font-family:monospace;background:rgba(7,9,16,.7);padding:4px 14px;border-radius:20px;white-space:nowrap;}
.cb{background:#fff;border:1.5px solid #E5E7EB;color:#555;font-size:13px;font-weight:700;padding:7px 11px;border-radius:9px;cursor:pointer;line-height:1;}
.cb:hover{border-color:#E07B00;color:#E07B00;background:#FFF3E0;}
.cb.N{border-color:rgba(224,123,0,.4);color:#E07B00;font-size:10px;font-weight:800;}
</style></head><body>
<div style="position:relative;width:100%;height:100vh;">
  <div id="map"></div>
  <div class="hint">Seasonal sun path arcs · ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
  <div style="position:absolute;top:14px;right:14px;z-index:1000;display:flex;flex-direction:column;gap:5px;align-items:center;background:rgba(255,255,255,0.97);border:1.5px solid rgba(224,123,0,0.2);border-radius:14px;padding:10px 9px;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
    <div style="font-size:9px;font-weight:800;color:#E07B00;text-transform:uppercase;letter-spacing:.08em;margin-bottom:1px;">View Angle</div>
    <button class="cb" id="btn-up">▲</button>
    <div style="display:flex;gap:4px;">
      <button class="cb" id="btn-left">◀</button>
      <button class="cb N" id="btn-n">N</button>
      <button class="cb" id="btn-right">▶</button>
    </div>
    <button class="cb" id="btn-down">▼</button>
  </div>
</div>
<script>
var map = L.map('map',{center:[${lat},${lon}],zoom:15,zoomControl:false,attributionControl:false,doubleClickZoom:false});
L.control.zoom({position:'bottomright'}).addTo(map);

var osmb = new OSMBuildings(map);
osmb.date(new Date());
osmb.load('https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json');

L.tileLayer('https://tile-a.openstreetmap.fr/hot/{z}/{x}/{y}.png').addTo(map);

// Create pane above OSMBuildings
map.createPane('arcPane');
map.getPane('arcPane').style.zIndex = 650;

// Observer pin
L.circleMarker([${lat},${lon}],{radius:9,color:'#fff',weight:3,fillColor:'#E07B00',fillOpacity:1,pane:'arcPane'}).addTo(map);

// Draw all 4 seasonal arcs
${pathsJs}

// Camera controls
var curRot=0,curTilt=0;
function applyCamera(){try{osmb.rotation(curRot);osmb.tilt(curTilt);}catch(e){}}
document.getElementById('btn-up').onclick    = function(){curTilt=Math.max(0,curTilt-10);applyCamera();};
document.getElementById('btn-down').onclick  = function(){curTilt=Math.min(70,curTilt+10);applyCamera();};
document.getElementById('btn-left').onclick  = function(){curRot=(curRot-15+360)%360;applyCamera();};
document.getElementById('btn-right').onclick = function(){curRot=(curRot+15)%360;applyCamera();};
document.getElementById('btn-n').onclick     = function(){curRot=0;curTilt=0;applyCamera();};
</script></body></html>`;
  }, [lat, lon, JSON.stringify(seasonal)]);

  return (
    <iframe
      srcDoc={html}
      style={{ width:'100%', height:'100%', border:'none', display:'block' }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
