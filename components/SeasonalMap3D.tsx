'use client';

import { useMemo } from 'react';

interface Props {
  lat: number;
  lon: number;
  seasonal: Record<string, [number, number][]>;
}

const COLORS: Record<string,string> = {
  Summer:'#FF4444', Autumn:'#FF8C00', Spring:'#C8A800', Winter:'#5BAED8'
};

export default function SeasonalMap3D({ lat, lon, seasonal }: Props) {
  const html = useMemo(() => {
    const seasonsJs = JSON.stringify(
      Object.entries(seasonal).map(([sid, coords]) => ({
        sid, color: COLORS[sid] || '#fff',
        pts: coords.map(([la, lo]) => ({ lat: la, lon: lo }))
      }))
    );

    // Observer pin ring
    const steps=20, rd=0.000035, ring:number[][]=[];
    for(let i=0;i<=steps;i++){const a=2*Math.PI*i/steps;ring.push([lon+rd*Math.cos(a)/Math.cos(lat*Math.PI/180),lat+rd*Math.sin(a)]);}
    const obsGj = JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',properties:{color:'#F39C12',height:0.6,minHeight:0},geometry:{type:'Polygon',coordinates:[ring]}}]});

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<link href="https://cdn.osmbuildings.org/4.1.1/OSMBuildings.css" rel="stylesheet"/>
<script src="https://cdn.osmbuildings.org/4.1.1/OSMBuildings.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}html,body{background:#0A0C10;overflow:hidden;}
#map{width:100%;height:100vh;}
.cb{background:#fff;border:1.5px solid #E5E7EB;color:#555;font-size:13px;font-weight:700;padding:7px 11px;border-radius:9px;cursor:pointer;line-height:1;}
.cb:hover{border-color:#E07B00;color:#E07B00;background:#FFF3E0;}
.cb.N{border-color:rgba(224,123,0,.4);color:#E07B00;font-size:10px;font-weight:800;}
.leaflet-control-attribution,.osmb-attribution{display:none!important;}
.hint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);z-index:25;color:rgba(255,255,255,.3);font-size:10px;pointer-events:none;font-family:monospace;background:rgba(7,9,16,.7);padding:4px 14px;border-radius:20px;white-space:nowrap;}
</style></head><body>
<div style="position:relative;width:100%;height:100vh;">
  <div id="map"></div>
  <div class="hint">Seasonal sun paths · click to move pin · drag · scroll zoom</div>
  <svg id="arc-svg" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:18;overflow:visible;"></svg>
  <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:22;">
    <div style="width:14px;height:14px;border-radius:50%;background:#E07B00;border:3px solid #fff;box-shadow:0 0 0 3px rgba(224,123,0,0.45);"></div>
  </div>
  <div style="position:absolute;top:14px;right:14px;z-index:25;display:flex;flex-direction:column;gap:5px;align-items:center;background:rgba(255,255,255,0.97);border:1.5px solid rgba(224,123,0,0.2);border-radius:14px;padding:10px 9px;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
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
const D2R=Math.PI/180;
var curRot=0,curTilt=0,initZoom=15;

const map=new OSMBuildings({container:'map',position:{latitude:${lat},longitude:${lon}},zoom:initZoom,minZoom:13,maxZoom:20,tilt:0,rotation:0,effects:['shadows'],attribution:''});
map.setDate(new Date());
map.addMapTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
map.addGeoJSONTiles('https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json');
map.addGeoJSON(${obsGj});

function applyCamera(){map.setRotation(curRot);map.setTilt(curTilt);}
document.getElementById('btn-up').onclick    =function(){curTilt=Math.max(0,curTilt-10);applyCamera();drawArcs();};
document.getElementById('btn-down').onclick  =function(){curTilt=Math.min(70,curTilt+10);applyCamera();drawArcs();};
document.getElementById('btn-left').onclick  =function(){curRot=(curRot-15+360)%360;applyCamera();drawArcs();};
document.getElementById('btn-right').onclick =function(){curRot=(curRot+15)%360;applyCamera();drawArcs();};
document.getElementById('btn-n').onclick     =function(){curRot=0;curTilt=0;applyCamera();drawArcs();};
map.on('rotate',function(){try{curRot=((map.getRotation()%360)+360)%360;drawArcs();}catch(e){}});

var seasons=${seasonsJs};
var arcSvg=document.getElementById('arc-svg');

function projectToScreen(az,el){
  var W=document.getElementById('map').clientWidth||800,H=window.innerHeight||600;
  var f=Math.max(0,el)/90,rx=W*0.48*(1-f),ry=H*0.44*(1-f),ar=(az-curRot)*D2R;
  return[W/2+rx*Math.sin(ar),H/2-ry*Math.cos(ar)*0.6];
}

// Convert lat/lon to azimuth/elevation relative to observer
function latLonToAzEl(sLat,sLon){
  var dLat=(sLat-${lat})*111000;
  var dLon=(sLon-${lon})*111000*Math.cos(${lat}*D2R);
  var dist=Math.sqrt(dLat*dLat+dLon*dLon);
  var az=Math.atan2(dLon,dLat)*180/Math.PI;
  if(az<0)az+=360;
  var el=Math.atan2(dist/1000,1)*180/Math.PI; // elevation proxy
  return{az:az,el:el};
}

function drawArcs(){
  var W=document.getElementById('map').clientWidth||800,H=window.innerHeight||600;
  arcSvg.setAttribute('viewBox','0 0 '+W+' '+H);
  while(arcSvg.firstChild)arcSvg.removeChild(arcSvg.firstChild);
  seasons.forEach(function(s){
    if(!s.pts.length)return;
    var sc=s.pts.map(function(p){var ae=latLonToAzEl(p.lat,p.lon);return projectToScreen(ae.az,ae.el);});
    // glow
    var g=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    g.setAttribute('points',sc.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' '));
    g.setAttribute('fill','none');g.setAttribute('stroke',s.color);g.setAttribute('stroke-width','18');g.setAttribute('opacity','0.15');g.setAttribute('stroke-linecap','round');
    arcSvg.appendChild(g);
    // main arc
    var arc=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    arc.setAttribute('points',sc.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' '));
    arc.setAttribute('fill','none');arc.setAttribute('stroke',s.color);arc.setAttribute('stroke-width','4');arc.setAttribute('opacity','0.9');arc.setAttribute('stroke-linecap','round');
    arcSvg.appendChild(arc);
    // label at midpoint
    var mid=sc[Math.floor(sc.length/2)];
    var t=document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x',mid[0].toFixed(1));t.setAttribute('y',(mid[1]-10).toFixed(1));
    t.setAttribute('fill',s.color);t.setAttribute('font-size','12');t.setAttribute('font-weight','700');t.setAttribute('font-family','monospace');t.setAttribute('text-anchor','middle');t.setAttribute('opacity','0.95');
    t.textContent=s.sid;arcSvg.appendChild(t);
    // rise dot
    var c1=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c1.setAttribute('cx',sc[0][0].toFixed(1));c1.setAttribute('cy',sc[0][1].toFixed(1));c1.setAttribute('r','5');c1.setAttribute('fill',s.color);arcSvg.appendChild(c1);
    // set dot
    var c2=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c2.setAttribute('cx',sc[sc.length-1][0].toFixed(1));c2.setAttribute('cy',sc[sc.length-1][1].toFixed(1));c2.setAttribute('r','5');c2.setAttribute('fill',s.color);arcSvg.appendChild(c2);
  });
}

setTimeout(drawArcs,300);

// Add static SUNRISE/SUNSET labels based on first season
function addSunLabels(){
  if(!seasons.length||!seasons[0].pts.length)return;
  var W=document.getElementById('map').clientWidth||800,H=window.innerHeight||600;
  arcSvg.setAttribute('viewBox','0 0 '+W+' '+H);
  var s0=seasons[0];
  var rpt=s0.pts[0],spt=s0.pts[s0.pts.length-1];
  var rae=latLonToAzEl(rpt.lat,rpt.lon),sae=latLonToAzEl(spt.lat,spt.lon);
  var rsc=projectToScreen(rae.az,rae.el),ssc=projectToScreen(sae.az,sae.el);
  ['🌅 Sunrise','Sunset 🌇'].forEach(function(lbl,i){
    var pt=i===0?rsc:ssc;
    var t=document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x',(pt[0]+(i===0?-12:12)).toFixed(1));
    t.setAttribute('y',(pt[1]+22).toFixed(1));
    t.setAttribute('fill','#FFD06D');t.setAttribute('font-size','11');t.setAttribute('font-weight','700');
    t.setAttribute('font-family','monospace');t.setAttribute('text-anchor',i===0?'end':'start');t.setAttribute('opacity','0.9');
    t.textContent=lbl;arcSvg.appendChild(t);
  });
}
setTimeout(addSunLabels,400);
</script></body></html>`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, JSON.stringify(seasonal)]);

  return (
    <iframe
      srcDoc={html}
      style={{ width:'100%', height:'100%', border:'none', display:'block' }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
