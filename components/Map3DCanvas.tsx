'use client';
// components/Map3DCanvas.tsx

import { useEffect, useMemo, useRef } from 'react';
import type { PathPoint } from '@/app/page';

interface Map3DCanvasProps {
  lat: number; lon: number;
  pathData: PathPoint[];
  simPos: { sunLat: number; sunLon: number; azimuth: number; elevation: number };
  simTime: string;
  sunTimes: { rise: string; set: string; noon: string };
  animating: boolean;
}

export default function Map3DCanvas({ lat, lon, pathData, simPos, simTime, sunTimes, animating }: Map3DCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = useMemo(() => {
    const R = 250;
    const cosLat = Math.cos(lat * Math.PI / 180);

    const pts = pathData.map(p => ({
      x: Math.round((p.lon - lon) * 111111 * cosLat * 100) / 100,
      y: Math.round(Math.max(0, p.el) * (R / 90.0) * 2.2 * 100) / 100,
      z: Math.round(-(p.lat - lat) * 111111 * 100) / 100,
      el: Math.round(p.el * 100) / 100,
      time: p.time,
    }));
    const ptsJs = JSON.stringify(pts);

    const cx  = Math.round((simPos.sunLon - lon) * 111111 * cosLat * 100) / 100;
    const cz  = Math.round(-(simPos.sunLat - lat) * 111111 * 100) / 100;
    const cy  = Math.round(Math.max(0, simPos.elevation) * (R / 90.0) * 2.2 * 100) / 100;
    const mel = Math.round(simPos.elevation * 100) / 100;
    const cd  = Math.round(R * 2.2);
    const ch  = Math.round(R * 1.3);

    // Pick start index near current real time
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    let startIdx = 0, bd = 99999;
    for (let i = 0; i < pathData.length; i++) {
      const [h, m] = pathData[i].time.split(':').map(Number);
      const d = Math.abs(h * 60 + m - nowMins);
      if (d < bd) { bd = d; startIdx = i; }
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}body{background:#0A0C10;overflow:hidden;}
canvas{display:block;width:100%!important;height:600px!important;}
.hud{position:absolute;z-index:20;background:rgba(7,9,16,0.92);border:1px solid rgba(243,156,18,0.22);border-radius:14px;padding:14px 18px;color:#F0F2F5;font-family:monospace;font-size:12px;line-height:2.1;pointer-events:none;backdrop-filter:blur(20px);box-shadow:0 8px 40px rgba(0,0,0,.7);}
.hud b{color:#F39C12;}
.tbadge{position:absolute;top:14px;left:14px;z-index:20;background:rgba(7,9,16,0.92);border:1px solid rgba(243,156,18,.25);border-radius:10px;padding:8px 16px;color:#F39C12;font-size:14px;font-weight:600;font-family:monospace;pointer-events:none;backdrop-filter:blur(12px);}
.hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);z-index:20;color:rgba(255,255,255,.25);font-size:10px;pointer-events:none;font-family:monospace;background:rgba(7,9,16,.65);padding:5px 16px;border-radius:20px;border:1px solid rgba(255,255,255,.04);white-space:nowrap;}
</style></head><body>
<canvas id="c"></canvas>
<div class="hud" style="top:14px;right:14px;min-width:160px;">
  <div style="font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#4B5563;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.05);">3D Arc View</div>
  🌅 Sunrise <b>${sunTimes.rise}</b><br>
  🌇 Sunset &nbsp;<b>${sunTimes.set}</b><br>
  ☀️ Elev &nbsp;&nbsp;&nbsp;<b id="hel">${mel}°</b><br>
  🕐 Time &nbsp;&nbsp;&nbsp;<b id="htm">${simTime}</b>
</div>
<div class="tbadge">☀️ &nbsp;<span id="stm">${simTime}</span></div>
<div class="hint">🖱 Drag to orbit · Scroll to zoom</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
const cv=document.getElementById('c');
const W=cv.parentElement?cv.parentElement.clientWidth:window.innerWidth,H=600;
cv.width=W;cv.height=H;
const rend=new THREE.WebGLRenderer({canvas:cv,antialias:true});
rend.setPixelRatio(Math.min(devicePixelRatio,2));
rend.setSize(W,H);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0A0C10);
scene.fog=new THREE.FogExp2(0x0A0C10,0.0007);
const cam=new THREE.PerspectiveCamera(50,W/H,0.5,8000);
cam.position.set(${cd},${ch},${cd});cam.lookAt(0,0,0);
scene.add(new THREE.AmbientLight(0xffffff,0.35));
const dl=new THREE.DirectionalLight(0xffd580,1.8);dl.position.set(300,600,300);scene.add(dl);
const R=${R};

scene.add(new THREE.Mesh(new THREE.CylinderGeometry(R,R,3,80),new THREE.MeshLambertMaterial({color:0x0D1118})));
scene.add(new THREE.GridHelper(R*2,Math.max(10,Math.round(R/13)),0x151C28,0x0F1520));
scene.add(new THREE.Mesh(new THREE.TorusGeometry(R,2.5,8,80),new THREE.MeshBasicMaterial({color:0x1A2535})));
const lm=new THREE.LineBasicMaterial({color:0x1A2535});
[[[-R,0],[R,0]],[[0,-R],[0,R]]].forEach(function(pts){scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(pts[0][0],1,pts[0][1]),new THREE.Vector3(pts[1][0],1,pts[1][1])]),lm));});

const pil=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.5,18,16),new THREE.MeshLambertMaterial({color:0xF39C12}));pil.position.y=9;scene.add(pil);
scene.add(new THREE.Mesh(new THREE.TorusGeometry(11,2,8,32),new THREE.MeshBasicMaterial({color:0xF39C12,transparent:true,opacity:.35})));

function spr(txt,col){const cv2=document.createElement('canvas');cv2.width=128;cv2.height=64;const c2=cv2.getContext('2d');c2.fillStyle=col;c2.font='bold 34px monospace';c2.textAlign='center';c2.textBaseline='middle';c2.fillText(txt,64,32);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv2),transparent:true,depthTest:false}));sp.scale.set(48,24,1);return sp;}
const ld=R+52;
[['N','#E74C3C',0,-ld],['S','#2D3748',0,ld],['E','#2D3748',ld,0],['W','#2D3748',-ld,0]].forEach(function(d){const s=spr(d[0],d[1]);s.position.set(d[2],8,d[3]);scene.add(s);});

const pd=${ptsJs};
const ap=pd.filter(function(p){return p.el>=0;}).map(function(p){return new THREE.Vector3(p.x,p.y,p.z);});
if(ap.length>1){const cv3=new THREE.CatmullRomCurve3(ap);scene.add(new THREE.Mesh(new THREE.TubeGeometry(cv3,ap.length*3,3,8,false),new THREE.MeshBasicMaterial({color:0xF39C12,transparent:true,opacity:.82})));}
pd.filter(function(p){return p.el>=0;}).forEach(function(p,i){if(i%4!==0)return;const col=new THREE.Color().setHSL(.09-(i/pd.length)*.04,1,.55);const d=new THREE.Mesh(new THREE.SphereGeometry(3.5,8,8),new THREE.MeshBasicMaterial({color:col}));d.position.set(p.x,p.y,p.z);scene.add(d);});
pd.filter(function(p){return p.el>=0;}).forEach(function(p,i){if(i%7!==0)return;const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x,0,p.z),new THREE.Vector3(p.x,p.y,p.z)]);scene.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x2D1B00,transparent:true,opacity:.35})));});

const sunCv=document.createElement('canvas');sunCv.width=128;sunCv.height=128;const sunCtx=sunCv.getContext('2d');sunCtx.font='96px serif';sunCtx.textAlign='center';sunCtx.textBaseline='middle';sunCtx.fillText('☀️',64,64);
const sm=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(sunCv),transparent:true,depthTest:false}));sm.scale.set(60,60,1);scene.add(sm);

const sg=[new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0)];
const sgeo=new THREE.BufferGeometry().setFromPoints(sg);
scene.add(new THREE.Line(sgeo,new THREE.LineBasicMaterial({color:0x374151,transparent:true,opacity:.5})));

function setSun(x,y,z,t,el){
  const yy=Math.max(0,y);sm.position.set(x,yy,z);
  const s=sgeo.attributes.position;s.setXYZ(0,0,.5,0);s.setXYZ(1,x===0?0:-x*2,.5,z===0?0:-z*2);s.needsUpdate=true;
  document.getElementById('hel').textContent=el.toFixed(1)+'°';
  document.getElementById('htm').textContent=t;
  document.getElementById('stm').textContent=t;
  sm.visible=el>=-2;
}
setSun(${cx},${cy},${cz},'${simTime}',${mel});

let drag=false,prev={x:0,y:0},th=Math.PI/4,ph=1.1,cr=R*1.8;
function uCam(){cam.position.set(cr*Math.sin(ph)*Math.sin(th),cr*Math.cos(ph),cr*Math.sin(ph)*Math.cos(th));cam.lookAt(0,0,0);}
uCam();
cv.addEventListener('mousedown',function(e){drag=true;prev={x:e.clientX,y:e.clientY};});
cv.addEventListener('mouseup',function(){drag=false;});
cv.addEventListener('mousemove',function(e){if(!drag)return;th-=(e.clientX-prev.x)*.005;ph=Math.max(.15,Math.min(Math.PI/2.1,ph+(e.clientY-prev.y)*.005));prev={x:e.clientX,y:e.clientY};uCam();});
cv.addEventListener('wheel',function(e){cr=Math.max(R*.6,Math.min(R*4,cr+e.deltaY*.4));uCam();e.preventDefault();},{passive:false});
let lt=null;
cv.addEventListener('touchstart',function(e){lt=e.touches[0];});
cv.addEventListener('touchmove',function(e){if(!lt)return;const t=e.touches[0];th-=(t.clientX-lt.clientX)*.005;ph=Math.max(.15,Math.min(Math.PI/2.1,ph+(t.clientY-lt.clientY)*.005));lt=t;uCam();e.preventDefault();},{passive:false});

(function loop(){requestAnimationFrame(loop);rend.render(scene,cam);})();

// Internal animation loop
var ai=${startIdx};
var isAnimating=${animating ? 'true' : 'false'};
var animInterval=null;
function startAnim(){if(animInterval)return;animInterval=setInterval(function(){const p=pd[ai];setSun(p.x,p.y,p.z,p.time,p.el);ai=(ai+1)%pd.length;},160);}
function stopAnim(){if(animInterval){clearInterval(animInterval);animInterval=null;}}
if(isAnimating)startAnim();

window.addEventListener('message',function(e){
  if(!e.data)return;
  if(e.data.type==='setAnimating'){isAnimating=e.data.value;if(isAnimating)startAnim();else stopAnim();}
  if(e.data.type==='seekTime'&&!isAnimating){
    var parts=e.data.time.split(':');var mins=parseInt(parts[0])*60+parseInt(parts[1]);
    var best=0,bd=99999;
    for(var j=0;j<pd.length;j++){var t=pd[j].time.split(':');var d=Math.abs(parseInt(t[0])*60+parseInt(t[1])-mins);if(d<bd){bd=d;best=j;}}
    ai=best;const p=pd[best];setSun(p.x,p.y,p.z,p.time,p.el);
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
      style={{ width: '100%', height: 640, border: 'none', borderRadius: 16 }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
