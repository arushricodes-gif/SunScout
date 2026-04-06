'use client';

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
L.polyline(${JSON.stringify(coords)},{color:'${col}',weight:5,opacity:.9}).addTo(ms);
L.circleMarker(${JSON.stringify(coords[0])},{radius:8,color:'rgba(255,255,255,.6)',weight:2,fillColor:'${col}',fillOpacity:1}).addTo(ms).bindTooltip('<b style="color:${col};font-family:JetBrains Mono,monospace;font-size:12px;">${sid}</b>',{permanent:true,direction:'top',className:'slbl'});
L.circleMarker(${JSON.stringify(coords[coords.length-1])},{radius:6,color:'rgba(255,255,255,.4)',weight:1,fillColor:'${col}',fillOpacity:.8}).addTo(ms);`;
  }).join('\n');

  // Move SUNRISE label further right, SUNSET further right too
  const sc = [lat, lon - 0.004];   // sunset — shifted right vs before
  const rc = [lat, lon + 0.004];   // sunrise — shifted more right

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0A0C10;}
#msmap{height:620px;width:100%;border-radius:16px;border:1px solid rgba(243,156,18,.08);}
.slbl{background:rgba(255,255,255,0.92)!important;border:1px solid rgba(0,0,0,.12)!important;color:#1A1A1A!important;font-size:11px!important;padding:4px 10px!important;border-radius:6px!important;font-family:'JetBrains Mono',monospace!important;box-shadow:0 2px 8px rgba(0,0,0,.15)!important;}
.leaflet-tooltip-top:before{display:none!important;}
.loclbl{background:transparent!important;border:none!important;box-shadow:none!important;font-family:'Bebas Neue',sans-serif!important;font-size:22px!important;letter-spacing:4px!important;pointer-events:none!important;}
.sr{color:#000!important;-webkit-text-fill-color:#000!important;text-shadow:0 1px 4px rgba(255,255,255,.8)!important;}
.ss{color:#000!important;-webkit-text-fill-color:#000!important;text-shadow:0 1px 4px rgba(255,255,255,.8)!important;}
.leaflet-control-attribution{display:none!important;}
.hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);z-index:20;color:rgba(255,255,255,.25);font-size:10px;pointer-events:none;font-family:monospace;background:rgba(7,9,16,.65);padding:5px 16px;border-radius:20px;white-space:nowrap;}
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
L.circle([${lat},${lon}],{radius:250,color:'rgba(243,156,18,.85)',weight:4,fill:false,dashArray:'8,6'}).addTo(ms);
L.circleMarker([${lat},${lon}],{radius:9,color:'#F39C12',weight:2.5,fillColor:'#F39C12',fillOpacity:.95}).addTo(ms);
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
