'use client';
// components/SeasonalMap.tsx

interface SeasonalMapProps {
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

export default function SeasonalMap({ lat, lon, seasonal }: SeasonalMapProps) {
  const pathsJs = Object.entries(seasonal).map(([sid, coords]) => {
    if (!coords.length) return '';
    const col = COLORS[sid] || '#fff';
    return `
L.polyline(${JSON.stringify(coords)},{color:'${col}',weight:5,opacity:.85}).addTo(ms);
L.circleMarker(${JSON.stringify(coords[0])},{radius:7,color:'rgba(255,255,255,.5)',weight:2,fillColor:'${col}',fillOpacity:1}).addTo(ms).bindTooltip('<b style="color:${col};font-family:JetBrains Mono,monospace;">${sid}</b>',{permanent:true,direction:'top',className:'slbl'});
L.circleMarker(${JSON.stringify(coords[coords.length - 1])},{radius:5,color:'rgba(255,255,255,.3)',weight:1,fillColor:'${col}',fillOpacity:.7}).addTo(ms);`;
  }).join('\n');

  const sc = [lat, lon - 0.005];
  const rc = [lat, lon + 0.003];

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0A0C10;}
#msmap{height:620px;width:100%;border-radius:16px;border:1px solid rgba(243,156,18,.08);}
.slbl{background:rgba(7,9,16,.88)!important;border:1px solid rgba(255,255,255,.1)!important;color:#fff!important;font-size:11px!important;padding:3px 8px!important;border-radius:6px!important;font-family:'JetBrains Mono',monospace!important;}
.leaflet-tooltip-top:before{display:none!important;}
.loclbl{background:transparent!important;border:none!important;box-shadow:none!important;font-family:'Bebas Neue',sans-serif!important;font-size:24px!important;letter-spacing:5px!important;pointer-events:none!important;}
.sr{color:#FF4444!important;text-shadow:0 0 24px rgba(255,68,68,.5),2px 2px 6px #000!important;}
.ss{color:#3498DB!important;text-shadow:0 0 24px rgba(52,152,219,.5),2px 2px 6px #000!important;}
.leaflet-control-attribution{display:none!important;}
.hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);z-index:20;color:rgba(255,255,255,.25);font-size:10px;pointer-events:none;font-family:'JetBrains Mono',monospace;background:rgba(7,9,16,.65);padding:5px 16px;border-radius:20px;border:1px solid rgba(255,255,255,.04);white-space:nowrap;letter-spacing:.04em;}
</style></head><body>
<div style="position:relative;">
  <div id="msmap"></div>
  <div class="hint">Seasonal sun path arcs · ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
</div>
<script>
var sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
var str=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
var ms=L.map('msmap',{center:[${lat},${lon}],zoom:17,layers:[str],zoomControl:false,attributionControl:false});
L.control.zoom({position:'bottomright'}).addTo(ms);
L.control.layers({'🛰 Satellite':sat,'🗺 Street':str},null,{position:'topleft',collapsed:false}).addTo(ms);
L.circle([${lat},${lon}],{radius:250,color:'rgba(243,156,18,.55)',weight:2,fillColor:'rgba(243,156,18,.06)',fillOpacity:1,dashArray:'6,6'}).addTo(ms);
L.circleMarker([${lat},${lon}],{radius:8,color:'#F39C12',weight:2,fillColor:'#F39C12',fillOpacity:.9}).addTo(ms);
L.marker(${JSON.stringify(sc)},{opacity:0}).addTo(ms).bindTooltip("SUNSET",{permanent:true,direction:'center',className:'loclbl ss'});
L.marker(${JSON.stringify(rc)},{opacity:0}).addTo(ms).bindTooltip("SUNRISE",{permanent:true,direction:'center',className:'loclbl sr'});
${pathsJs}
</script></body></html>`;

  return (
    <iframe
      srcDoc={html}
      style={{ width: '100%', height: 640, border: 'none', borderRadius: 16 }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
