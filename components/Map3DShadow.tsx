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
      el: Math.round(p.el * 100) / 100, az: Math.round(p.az * 100) / 100,
      time: p.time, iso: p.iso,
    })));

    const mel    = Math.round(simPos.elevation * 100) / 100;
    const maz    = Math.round(simPos.azimuth * 10) / 10;
    const simIso = pathData[0]?.iso?.slice(0, 10)
      ? `${pathData[0].iso.slice(0, 10)}T${simTime}:00`
      : new Date().toISOString();

    // Pin ring around observer
    const steps = 20, rd = 0.000035;
    const ring: number[][] = [];
    for (let i = 0; i <= steps; i++) {
      const a = 2 * Math.PI * i / steps;
      ring.push([lon + rd * Math.cos(a) / Math.cos(lat * Math.PI / 180), lat + rd * Math.sin(a)]);
    }
    const obsGj = JSON.stringify({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { color: '#F39C12', height: 0.6, minHeight: 0 }, geometry: { type: 'Polygon', coordinates: [ring] } }]
    });

    // Pick start index near current real time
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    let startIdx = 0, bd = 99999;
    for (let i = 0; i < pathData.length; i++) {
      const [h, m] = pathData[i].time.split(':').map(Number);
      const d = Math.abs(h * 60 + m - nowMins);
      if (d < bd) { bd = d; startIdx = i; }
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
<link href="https://cdn.osmbuildings.org/4.1.1/OSMBuildings.css" rel="stylesheet"/>
<script src="https://cdn.osmbuildings.org/4.1.1/OSMBuildings.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}html,body{background:#0A0C10;overflow:hidden;}
#map{width:100%;height:600px;}
.hud{position:absolute;z-index:20;background:rgba(7,9,16,0.92);border:1px solid rgba(243,156,18,0.22);border-radius:14px;padding:14px 18px;color:#F0F2F5;font-family:monospace;font-size:12px;line-height:2.1;pointer-events:none;backdrop-filter:blur(20px);box-shadow:0 8px 40px rgba(0,0,0,.7);}
.hud b{color:#F39C12;}
.tbadge{position:absolute;top:60px;left:14px;z-index:20;background:rgba(7,9,16,0.92);border:1px solid rgba(243,156,18,.25);border-radius:10px;padding:8px 16px;color:#F39C12;font-size:14px;font-weight:600;font-family:monospace;pointer-events:none;backdrop-filter:blur(12px);}
.hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);z-index:20;color:rgba(255,255,255,.25);font-size:10px;pointer-events:none;font-family:monospace;background:rgba(7,9,16,.65);padding:5px 16px;border-radius:20px;border:1px solid rgba(255,255,255,.04);white-space:nowrap;}
.tile-row{position:absolute;top:14px;left:14px;z-index:20;display:flex;gap:6px;}
.tile-btn{background:rgba(7,9,16,.92);border:1px solid rgba(255,255,255,.07);color:#6B7280;font-size:11px;font-weight:600;font-family:monospace;padding:6px 13px;border-radius:9px;cursor:pointer;}
.tile-btn.on{border-color:rgba(243,156,18,.35);color:#F39C12;background:rgba(243,156,18,.07);}
.cb{background:#fff;border:2px solid #E5E7EB;color:#555;font-size:14px;font-weight:700;padding:8px 12px;border-radius:10px;cursor:pointer;line-height:1;}
.cb:hover{border-color:#E07B00;color:#E07B00;background:#FFF3E0;}
.cb.N{border-color:rgba(224,123,0,.4);color:#E07B00;font-size:11px;font-weight:800;}
.leaflet-control-attribution,.osmb-attribution{display:none!important;}
</style></head><body>
<div style="position:relative;width:100%;height:600px;">
  <div id="map"></div>
  <div class="tile-row">
    <button class="tile-btn on" id="bs" onclick="setT('s')">🗺 Street</button>
    <button class="tile-btn" id="bsat" onclick="setT('sat')">🛰 Satellite</button>
  </div>
  <div class="hud" style="top:14px;right:14px;min-width:160px;">
    <div style="font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#4B5563;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.05);">OSM Buildings</div>
    🌅 Sunrise <b>${sunTimes.rise}</b><br>
    🌇 Sunset &nbsp;<b>${sunTimes.set}</b><br>
    ☀️ Elev &nbsp;&nbsp;&nbsp;<b id="hel">${mel}°</b><br>
    🕐 Time &nbsp;&nbsp;&nbsp;<b id="htm">${simTime}</b>
  </div>
  <div class="tbadge">☀️ &nbsp;<span id="stm">${simTime}</span></div>
  <div class="hint">🖱 Drag · Scroll zoom · ↔ rotate · ▲▼ tilt</div>
  <div style="position:absolute;top:14px;right:170px;z-index:25;display:flex;flex-direction:column;gap:6px;align-items:center;background:rgba(255,255,255,0.95);border:2px solid rgba(224,123,0,0.25);border-radius:16px;padding:12px 10px;box-shadow:0 4px 20px rgba(0,0,0,0.12);">
    <div style="font-size:10px;font-weight:800;color:#E07B00;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px;white-space:nowrap;">View angle</div>
    <button class="cb" onclick="aT(-10)">▲</button>
    <div style="display:flex;gap:5px;">
      <button class="cb" onclick="aR(-15)">◀</button>
      <button class="cb N" onclick="rst()">N</button>
      <button class="cb" onclick="aR(15)">▶</button>
    </div>
    <button class="cb" onclick="aT(10)">▼</button>
  </div>
  <div style="position:absolute;top:198px;right:176px;z-index:25;width:42px;height:42px;pointer-events:none;background:rgba(7,9,16,.88);border:1px solid rgba(255,255,255,.07);border-radius:50%;display:flex;align-items:center;justify-content:center;">
    <svg id="cmp" width="34" height="34" viewBox="-20 -20 40 40" style="transition:transform .2s;">
      <polygon points="0,-12 3,0 0,3 -3,0" fill="#E74C3C"/>
      <polygon points="0,12 3,0 0,-3 -3,0" fill="#374151"/>
      <text x="0" y="-14" text-anchor="middle" fill="#E74C3C" font-size="5.5" font-weight="bold" font-family="monospace">N</text>
      <text x="0" y="19" text-anchor="middle" fill="#374151" font-size="5.5" font-family="monospace">S</text>
      <text x="15" y="3" text-anchor="middle" fill="#374151" font-size="5.5" font-family="monospace">E</text>
      <text x="-15" y="3" text-anchor="middle" fill="#374151" font-size="5.5" font-family="monospace">W</text>
    </svg>
  </div>
  <svg id="arc-svg" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:18;overflow:visible;"></svg>
  <div id="sun" style="font-size:36px;line-height:1;pointer-events:none;position:absolute;transform:translate(-50%,-50%);display:none;filter:drop-shadow(0 0 18px rgba(255,200,0,.95));">☀️</div>
  <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:22;">
    <div style="width:14px;height:14px;border-radius:50%;background:#E07B00;border:3px solid #fff;box-shadow:0 0 0 3px rgba(224,123,0,0.45);"></div>
  </div>
</div>
<script>
const D2R=Math.PI/180;
const TILES={s:'https://tile-a.openstreetmap.fr/hot/{z}/{x}/{y}.png',sat:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'};
const _saved = (function(){try{const s=sessionStorage.getItem('osmCam');return s?JSON.parse(s):{rot:0,tilt:0};}catch(e){return {rot:0,tilt:0};}})();
let curT='s',tL=null,curRot=_saved.rot,curTilt=_saved.tilt;

const map=new OSMBuildings({container:'map',position:{latitude:${lat},longitude:${lon}},zoom:17,minZoom:15,maxZoom:20,tilt:curTilt,rotation:curRot,effects:['shadows'],attribution:''});
map.setDate(new Date('${simIso}'));
tL=map.addMapTiles(TILES.s);
map.addGeoJSONTiles('https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json');
map.addGeoJSON(${obsGj});

function setT(m){if(m===curT)return;curT=m;if(tL)map.remove(tL);tL=map.addMapTiles(TILES[m]);document.getElementById('bs').className='tile-btn'+(m==='s'?' on':'');document.getElementById('bsat').className='tile-btn'+(m==='sat'?' on':'');}
function saveCamera(){try{sessionStorage.setItem('osmCam',JSON.stringify({rot:curRot,tilt:curTilt}));}catch(e){}}
function aR(d){curRot=(curRot+d+360)%360;map.setRotation(curRot);document.getElementById('cmp').style.transform='rotate('+curRot+'deg)';drawArc();saveCamera();}
function aT(d){curTilt=Math.max(0,Math.min(70,curTilt+d));map.setTilt(curTilt);drawArc();saveCamera();}
function rst(){curRot=0;curTilt=0;map.setRotation(0);map.setTilt(0);document.getElementById('cmp').style.transform='rotate(0deg)';drawArc();saveCamera();}
map.on('rotate',function(){try{curRot=((map.getRotation()%360)+360)%360;document.getElementById('cmp').style.transform='rotate('+curRot+'deg)';drawArc();saveCamera();}catch(e){}});
const allPts=${allPtsJs};
const sunEl=document.getElementById('sun');
let curEl=${mel},curAz=${maz};

const arcSvg=document.getElementById('arc-svg');
function projectToScreen(az,el){const W=document.getElementById('map').clientWidth||800,H=600;const f=Math.max(0,el)/90,rx=W*0.48*(1-f),ry=H*0.44*(1-f),ar=(az-curRot)*D2R;return[W/2+rx*Math.sin(ar),H/2-ry*Math.cos(ar)*0.6];}
function drawArc(){
  const W=document.getElementById('map').clientWidth||800,H=600;
  arcSvg.setAttribute('viewBox','0 0 '+W+' '+H);
  while(arcSvg.firstChild)arcSvg.removeChild(arcSvg.firstChild);
  const ab=allPts.filter(function(p){return p.el>=0;});if(ab.length<2)return;
  const sc=ab.map(function(p){return projectToScreen(p.az,p.el);});
  [['rgba(255,180,0,0.18)',14],['rgba(255,200,80,0.28)',6]].forEach(function(c){const g=document.createElementNS('http://www.w3.org/2000/svg','polyline');g.setAttribute('points',sc.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' '));g.setAttribute('fill','none');g.setAttribute('stroke',c[0]);g.setAttribute('stroke-width',c[1]);g.setAttribute('stroke-linecap','round');arcSvg.appendChild(g);});
  const arc=document.createElementNS('http://www.w3.org/2000/svg','polyline');arc.setAttribute('points',sc.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' '));arc.setAttribute('fill','none');arc.setAttribute('stroke','#F39C12');arc.setAttribute('stroke-width','2.5');arc.setAttribute('stroke-dasharray','6 9');arc.setAttribute('opacity','0.92');arcSvg.appendChild(arc);
  ab.forEach(function(p,i){if(i%3!==0)return;const s=projectToScreen(p.az,p.el);const d=document.createElementNS('http://www.w3.org/2000/svg','circle');d.setAttribute('cx',s[0].toFixed(1));d.setAttribute('cy',s[1].toFixed(1));d.setAttribute('r','2.8');d.setAttribute('fill','#FFD06D');d.setAttribute('opacity','0.85');arcSvg.appendChild(d);});
  [{pt:sc[0],txt:'🌅 Rise',anchor:'end'},{pt:sc[sc.length-1],txt:'Set 🌇',anchor:'start'}].forEach(function(lbl){const ci=document.createElementNS('http://www.w3.org/2000/svg','circle');ci.setAttribute('cx',lbl.pt[0].toFixed(1));ci.setAttribute('cy',lbl.pt[1].toFixed(1));ci.setAttribute('r','4.5');ci.setAttribute('fill','#F39C12');arcSvg.appendChild(ci);const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',(lbl.pt[0]+(lbl.anchor==='end'?-10:10)).toFixed(1));t.setAttribute('y',(lbl.pt[1]-8).toFixed(1));t.setAttribute('fill','#FFD06D');t.setAttribute('font-size','10');t.setAttribute('font-family','monospace');t.setAttribute('font-weight','600');t.setAttribute('text-anchor',lbl.anchor);t.setAttribute('opacity','0.9');t.textContent=lbl.txt;arcSvg.appendChild(t);});
}

function moveSun(az,el){if(el<-5){sunEl.style.display='none';return;}const s=projectToScreen(az,el);sunEl.style.display='block';sunEl.style.left=s[0]+'px';sunEl.style.top=s[1]+'px';}

function updateView(p){
  if(p.iso)map.setDate(new Date(p.iso));
  curEl=p.el;curAz=p.az;
  moveSun(p.az,p.el);
  var stm=document.getElementById('stm');if(stm)stm.textContent=p.time;
  var hel=document.getElementById('hel');if(hel)hel.textContent=p.el.toFixed(1)+'°';
  var htm=document.getElementById('htm');if(htm)htm.textContent=p.time;
}

updateView({el:${mel},az:${maz},time:'${simTime}',iso:'${simIso}'});
drawArc();
map.on('change',function(){moveSun(curEl>-5?curEl:curEl,curAz);drawArc();});

// Internal animation loop
var ai=${startIdx};
var isAnimating=${animating ? 'true' : 'false'};
var animInterval=null;
function startAnim(){if(animInterval)return;animInterval=setInterval(function(){updateView(allPts[ai]);drawArc();ai=(ai+1)%allPts.length;},200);}
function stopAnim(){if(animInterval){clearInterval(animInterval);animInterval=null;}}
if(isAnimating)startAnim();

window.addEventListener('message',function(e){
  if(!e.data)return;
  if(e.data.type==='setAnimating'){isAnimating=e.data.value;if(isAnimating)startAnim();else stopAnim();}
  if(e.data.type==='seekTime'&&!isAnimating){
    var parts=e.data.time.split(':');var mins=parseInt(parts[0])*60+parseInt(parts[1]);
    var best=0,bd=99999;
    for(var j=0;j<allPts.length;j++){var t=allPts[j].time.split(':');var d=Math.abs(parseInt(t[0])*60+parseInt(t[1])-mins);if(d<bd){bd=d;best=j;}}
    ai=best;updateView(allPts[best]);drawArc();
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
