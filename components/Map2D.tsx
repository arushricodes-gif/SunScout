'use client';
import { useEffect, useMemo, useRef } from 'react';
import type { PathPoint } from '@/app/page';

interface SimPos { sunLat: number; sunLon: number; shadowLat: number; shadowLon: number; elevation: number; }

interface Map2DProps {
  lat: number; lon: number;
  pathData: PathPoint[];
  simPos: SimPos | null;
  riseEdge: [number, number] | null;
  setEdge: [number, number] | null;
  animating: boolean;
  locationSelectMode: boolean;
  height?: number;
  onLocationSelect?: (lat: number, lon: number) => void;
}

export default function Map2D({ lat, lon, pathData, simPos, riseEdge, setEdge, animating, locationSelectMode, height = 620, onLocationSelect }: Map2DProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = useMemo(() => {
    const pathJs = JSON.stringify(pathData.map(p => ({ lat: p.lat, lon: p.lon, shlat: p.shlat, shlon: p.shlon, el: p.el, time: p.time })));
    const riseJs = JSON.stringify(riseEdge);
    const setJs  = JSON.stringify(setEdge);
    const spJs   = JSON.stringify(simPos ? { lat: simPos.sunLat, lon: simPos.sunLon, shlat: simPos.shadowLat, shlon: simPos.shadowLon, el: simPos.elevation } : null);
    const hasPath = pathData.length > 0;

    return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}body{background:#0A0C10;}
#map{height:${height}px;width:100%;border-radius:16px;border:1px solid rgba(243,156,18,.1);cursor:crosshair;}
.leaflet-control-attribution{display:none!important;}
.tile-row{position:absolute;top:14px;left:14px;z-index:20;display:flex;gap:6px;}
.tile-btn{background:rgba(7,9,16,.92);border:1px solid rgba(255,255,255,.07);color:#6B7280;font-size:11px;font-weight:600;font-family:monospace;padding:6px 13px;border-radius:9px;cursor:pointer;}
.tile-btn.on{border-color:rgba(243,156,18,.35);color:#F39C12;background:rgba(243,156,18,.07);}
.hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);z-index:20;color:rgba(255,255,255,.25);font-size:10px;pointer-events:none;font-family:monospace;background:rgba(7,9,16,.65);padding:5px 16px;border-radius:20px;white-space:nowrap;}
#dbl-hint{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:25;background:rgba(224,123,0,0.92);border-radius:10px;padding:7px 18px;color:#fff;font-size:12px;font-weight:700;font-family:monospace;pointer-events:none;white-space:nowrap;transition:opacity .8s;}
.sun-label{background:linear-gradient(135deg,#F39C12,#E67E22);color:#000;padding:3px 9px;border-radius:7px;font-weight:700;font-size:11px;font-family:monospace;margin-top:2px;text-align:center;}
</style></head><body>
<div style="position:relative;height:${height}px;">
  <div id="map"></div>
  <div class="tile-row">
    <button class="tile-btn on" id="bs" onclick="setTile('s')">Street</button>
    <button class="tile-btn" id="bsat" onclick="setTile('sat')">Satellite</button>
  </div>
  <div id="dbl-hint">📍 Double-click anywhere to set location</div>
  <div class="hint">🖱 Double-click to place pin · Drag · Scroll zoom</div>
</div>
<script>
var TILES={s:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',sat:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'};
var curT='s',tL=null;
var street=L.tileLayer(TILES.s),sat2=L.tileLayer(TILES.sat);
var map=L.map('map',{center:[${lat},${lon}],zoom:17,layers:[street],zoomControl:false,attributionControl:false,doubleClickZoom:false});
L.control.zoom({position:'bottomright'}).addTo(map);
tL=street;
function setTile(m){if(m===curT)return;curT=m;if(tL)map.removeLayer(tL);tL=L.tileLayer(TILES[m]).addTo(map);document.getElementById('bs').className='tile-btn'+(m==='s'?' on':'');document.getElementById('bsat').className='tile-btn'+(m==='sat'?' on':'');}

var pin=L.marker([${lat},${lon}],{icon:L.divIcon({html:'<div style="font-size:22px;filter:drop-shadow(0 0 6px rgba(243,156,18,.8));">📍</div>',iconSize:[28,28],iconAnchor:[14,28],className:''})}).addTo(map);

var dblHint=document.getElementById('dbl-hint');
setTimeout(function(){dblHint.style.opacity='0';},4000);

map.on('dblclick',function(e){
  var newLat=e.latlng.lat,newLon=e.latlng.lng;
  pin.setLatLng([newLat,newLon]);
  dblHint.style.opacity='0';
  window.parent.postMessage({type:'map2d_click',lat:newLat,lon:newLon},'*');
});

window.addEventListener('message',function(e){
  if(!e.data)return;
  if(e.data.type==='updatePin'){
    pin.setLatLng([e.data.lat,e.data.lon]);
    map.setView([e.data.lat,e.data.lon],17,{animate:false});
  }
  if(e.data.type==='setAnimating'){isAnimating=e.data.value;if(isAnimating)startAnim();else stopAnim();}
  if(e.data.type==='seekTime'&&!isAnimating){
    var parts=e.data.time.split(':'),mins=parseInt(parts[0])*60+parseInt(parts[1]),best=0,bd=99999;
    for(var j=0;j<pd.length;j++){var t=pd[j].time.split(':'),d=Math.abs(parseInt(t[0])*60+parseInt(t[1])-mins);if(d<bd){bd=d;best=j;}}
    ai=best;if(pd[best])upd(pd[best]);
  }
});

L.circle([${lat},${lon}],{radius:250,color:'rgba(243,156,18,.25)',weight:1.5,fillColor:'rgba(243,156,18,.04)',fillOpacity:1}).addTo(map);

var pd=${pathJs};
${hasPath ? `L.polyline(pd.map(function(p){return[p.lat,p.lon];}),{color:'#F39C12',weight:7,dashArray:'8,12',opacity:.85}).addTo(map);` : ''}
${riseEdge ? `L.polyline([[${lat},${lon}],${riseJs}],{color:'#E74C3C',weight:5,opacity:.85}).addTo(map);` : ''}
${setEdge  ? `L.polyline([[${lat},${lon}],${setJs}],{color:'#3498DB',weight:5,opacity:.85}).addTo(map);` : ''}

${hasPath ? `
var sunIcon=L.divIcon({html:'<div style="font-size:26pt;line-height:1;filter:drop-shadow(0 0 10px rgba(255,200,0,.9));text-align:center;">☀️</div><div class="sun-label" id="stl">--:--</div>',iconSize:[56,56],iconAnchor:[28,20],className:''});
var sunM=L.marker([pd[0].lat,pd[0].lon],{icon:sunIcon,zIndexOffset:1000}).addTo(map);
var shad=L.polyline([[${lat},${lon}],[pd[0].shlat,pd[0].shlon]],{color:'#8B9AB0',weight:5,dashArray:'6,10',opacity:.80}).addTo(map);

function upd(p){sunM.setLatLng([p.lat,p.lon]);shad.setLatLngs([[${lat},${lon}],[p.shlat,p.shlon]]);var sl=document.getElementById('stl');if(sl)sl.textContent=p.time;sunM.setOpacity(p.el<0?0:1);shad.setStyle({opacity:p.el<0?0:.7});}

var now=new Date(),nowMins=now.getHours()*60+now.getMinutes(),startIdx=0,bd2=99999;
for(var i=0;i<pd.length;i++){var t2=pd[i].time.split(':');var d2=Math.abs(parseInt(t2[0])*60+parseInt(t2[1])-nowMins);if(d2<bd2){bd2=d2;startIdx=i;}}

var sp=${spJs};
if(sp)upd({lat:sp.lat,lon:sp.lon,shlat:sp.shlat,shlon:sp.shlon,el:sp.el,time:''});
else if(pd[startIdx])upd(pd[startIdx]);

var ai=startIdx,isAnimating=${animating?'true':'false'},animInterval=null;
function startAnim(){if(animInterval)return;animInterval=setInterval(function(){upd(pd[ai]);ai=(ai+1)%pd.length;},150);}
function stopAnim(){if(animInterval){clearInterval(animInterval);animInterval=null;}}
if(isAnimating)startAnim();
` : `var pd=[],ai=0,isAnimating=false,animInterval=null;
function startAnim(){}function stopAnim(){}function upd(){}
`}
</script></body></html>`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, pathData.length > 0 ? pathData[0].time : '', JSON.stringify(riseEdge), JSON.stringify(setEdge), height]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'setAnimating', value: animating }, '*');
  }, [animating]);

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
    <iframe ref={iframeRef} srcDoc={html}
      style={{ width: '100%', height: height + 20, border: 'none', borderRadius: 16 }}
      sandbox="allow-scripts allow-same-origin" />
  );
}
