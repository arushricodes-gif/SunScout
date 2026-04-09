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
<link href="https://cdn.osmbuildings.org/4.1.1/OSMBuildings.css" rel="stylesheet"/>
<script src="https://cdn.osmbuildings.org/4.1.1/OSMBuildings.js"></script>
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
  <svg id="arc-svg" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:18;overflow:visible;"></svg>
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
var map=new OSMBuildings({container:'map',position:{latitude:${lat},longitude:${lon}},zoom:15,minZoom:13,maxZoom:20,tilt:0,rotation:0,effects:['shadows'],attribution:''});
map.setDate(new Date());
map.addMapTiles('https://tile-a.openstreetmap.fr/hot/{z}/{x}/{y}.png');
map.addGeoJSONTiles('https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json');

// Observer pin ring
var rd=0.000035,ring=[];
for(var i=0;i<=20;i++){var a=2*Math.PI*i/20;ring.push([${lon}+rd*Math.cos(a)/Math.cos(${lat}*Math.PI/180),${lat}+rd*Math.sin(a)]);}
map.addGeoJSON({type:'FeatureCollection',features:[{type:'Feature',properties:{color:'#E07B00',height:1,minHeight:0},geometry:{type:'Polygon',coordinates:[ring]}}]});

// Camera controls
var curRot=0,curTilt=0;
function applyCamera(){map.setRotation(curRot);map.setTilt(curTilt);}
document.getElementById('btn-up').onclick    = function(){curTilt=Math.max(0,curTilt-10);applyCamera();};
document.getElementById('btn-down').onclick  = function(){curTilt=Math.min(70,curTilt+10);applyCamera();};
document.getElementById('btn-left').onclick  = function(){curRot=(curRot-15+360)%360;applyCamera();};
document.getElementById('btn-right').onclick = function(){curRot=(curRot+15)%360;applyCamera();};
document.getElementById('btn-n').onclick     = function(){curRot=0;curTilt=0;applyCamera();};

var COLORS={Summer:'#FF4444',Autumn:'#FF8C00',Spring:'#C8A800',Winter:'#5BAED8'};
// Draw seasonal arcs as SVG overlay (screen-space, same as main 3D map)
var D2R=Math.PI/180;
var allSeasons=${JSON.stringify(Object.entries(seasonal).map(([sid,coords])=>({sid,coords,color:COLORS[sid]})))};
var arcSvg=document.getElementById('arc-svg');

function projectToScreen(lat,lon){
  var W=document.getElementById('map').clientWidth||800,H=window.innerHeight||600;
  var pos=map.project(lat,lon);
  return pos?[pos.x,pos.y]:[W/2,H/2];
}

function drawSeasonalArcs(){
  var W=document.getElementById('map').clientWidth||800,H=window.innerHeight||600;
  arcSvg.setAttribute('viewBox','0 0 '+W+' '+H);
  while(arcSvg.firstChild)arcSvg.removeChild(arcSvg.firstChild);
  allSeasons.forEach(function(s){
    if(!s.coords.length)return;
    var sc=s.coords.map(function(c){return projectToScreen(c[0],c[1]);});
    var line=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    line.setAttribute('points',sc.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' '));
    line.setAttribute('fill','none');line.setAttribute('stroke',s.color);line.setAttribute('stroke-width','3');line.setAttribute('opacity','0.9');
    arcSvg.appendChild(line);
    var mid=sc[Math.floor(sc.length/2)];
    var txt=document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x',mid[0].toFixed(1));txt.setAttribute('y',(mid[1]-10).toFixed(1));
    txt.setAttribute('fill',s.color);txt.setAttribute('font-size','12');txt.setAttribute('font-weight','700');txt.setAttribute('font-family','monospace');txt.setAttribute('text-anchor','middle');
    txt.textContent=s.sid;arcSvg.appendChild(txt);
  });
}
map.on('change',drawSeasonalArcs);
setTimeout(drawSeasonalArcs,500);
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
