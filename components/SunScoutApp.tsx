'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import SolarChart from './SolarChart';
import type { SolarData } from '@/app/page';

const Map3DShadow = dynamic(() => import('./Map3DShadow'), { ssr: false });
const Map2D       = dynamic(() => import('./Map2D'),       { ssr: false });
const SeasonalMap = dynamic(() => import('./SeasonalMap'), { ssr: false });

interface Props {
  coords: [number, number]; setCoords: (c: [number, number]) => void;
  targetDate: string; setTargetDate: (d: string) => void;
  simTime: string; setSimTime: (t: string) => void;
  animating: boolean; setAnimating: (a: boolean) => void;
  solarData: SolarData | null; loading: boolean;
  tzOffset: number; onGpsClick: () => void;
}

const ORG='#E07B00',ORG_LT='#FFF3E0',TEXT_DARK='#1A1A1A',TEXT_SUB='#888888',WHITE='#FFFFFF';
const YEAR=new Date().getFullYear();
const CELESTIAL: Record<string,string|null>={'Today':null,['Spring Equinox']:`${YEAR}-03-20`,['Summer Solstice']:`${YEAR}-06-21`,['Autumn Equinox']:`${YEAR}-10-15`,['Winter Solstice']:`${YEAR}-12-21`,['Custom Date']:'custom'};

export default function SunScoutApp({ coords,setCoords,targetDate,setTargetDate,simTime,setSimTime,animating,setAnimating,solarData,loading,onGpsClick }: Props) {
  const [view,setView]                   = useState<'3d'|'2d'|'year'>('3d');
  const [searchQuery,setSearchQuery]     = useState('');
  const [searching,setSearching]         = useState(false);
  const [datePreset,setDatePreset]       = useState('Today');
  const [showCustomDate,setShowCustomDate] = useState(false);
  const [showInfo,setShowInfo]           = useState(false);

  const [lat,lon]=coords;
  const data=solarData;
  const [simH,simM]=simTime.split(':').map(Number);
  const el=data?.simPos.elevation??0;
  const az=data?.simPos.azimuth??0;

  const broadcast=(msg:object)=>{document.querySelectorAll('iframe').forEach(f=>{try{(f as HTMLIFrameElement).contentWindow?.postMessage(msg,'*');}catch{}});};
  const setSimHM=(h:number,m:number)=>{const t=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;setSimTime(t);broadcast({type:'seekTime',time:t});};
  const toggleAnim=()=>{const next=!animating;setAnimating(next);broadcast({type:'setAnimating',value:next});};

  const handleSearch=async(e:React.FormEvent)=>{e.preventDefault();if(!searchQuery.trim())return;setSearching(true);try{const r=await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);const d=await r.json();if(d.result)setCoords(d.result);}catch{}finally{setSearching(false);}};

  const handlePreset=(preset:string)=>{setDatePreset(preset);if(preset==='Custom Date'){setShowCustomDate(true);return;}setShowCustomDate(false);if(preset==='Today'){const now=new Date();setTargetDate(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`);}else{const d=CELESTIAL[preset];if(d)setTargetDate(d);}};

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'var(--bg)',overflow:'hidden'}}>

      {/* TOP BAR */}
      <div style={{background:WHITE,borderBottom:`2px solid ${ORG_LT}`,padding:'8px 16px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',flexShrink:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
            <line x1="18" y1="2" x2="18" y2="8" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="18" y1="28" x2="18" y2="34" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="2" y1="18" x2="8" y2="18" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="28" y1="18" x2="34" y2="18" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="6.1" y1="6.1" x2="10.3" y2="10.3" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <line x1="25.7" y1="6.1" x2="21.5" y2="10.3" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <line x1="6.1" y1="29.9" x2="10.3" y2="25.7" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <line x1="25.7" y1="29.9" x2="21.5" y2="25.7" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="18" cy="18" r="9" fill="#FFF3E0" stroke="#F39C12" strokeWidth="1.5"/>
            <circle cx="18" cy="18" r="6.5" fill="#E07B00"/>
            <circle cx="15.5" cy="15.5" r="2" fill="rgba(255,255,255,0.3)"/>
          </svg>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:ORG,letterSpacing:3}}>SUN SCOUT</span>
        </div>
        <div style={{width:1,height:28,background:ORG_LT,flexShrink:0}}/>
        <form onSubmit={handleSearch} style={{display:'flex',gap:6,flex:'1 1 180px',minWidth:160}}>
          <input className="input-field" placeholder="Search for a place..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{flex:1,padding:'6px 10px',fontSize:13}}/>
          <button type="submit" className="btn-primary" disabled={searching} style={{padding:'6px 12px',fontSize:13}}>{searching?'…':'🔍'}</button>
        </form>
        <button className="btn-primary" onClick={onGpsClick} style={{padding:'6px 12px',fontSize:13,whiteSpace:'nowrap',flexShrink:0}}>📍 My Location</button>
        <div style={{background:ORG_LT,borderRadius:8,padding:'5px 10px',fontSize:12,fontWeight:700,color:TEXT_DARK,whiteSpace:'nowrap',flexShrink:0}}>{lat.toFixed(3)}°, {lon.toFixed(3)}°</div>
        <div style={{width:1,height:28,background:ORG_LT,flexShrink:0}}/>
        <select value={datePreset} onChange={e=>handlePreset(e.target.value)} style={{padding:'6px 10px',fontSize:12,fontWeight:700,borderRadius:8,border:`2px solid ${ORG_LT}`,background:WHITE,color:TEXT_DARK,cursor:'pointer',flexShrink:0}}>
          {Object.keys(CELESTIAL).map(k=><option key={k} value={k}>{k}</option>)}
        </select>
        {showCustomDate&&<input type="date" value={targetDate} onChange={e=>setTargetDate(e.target.value)} style={{padding:'6px 10px',fontSize:12,borderRadius:8,border:`2px solid ${ORG_LT}`,background:WHITE,color:TEXT_DARK}}/>}
        <div style={{width:1,height:28,background:ORG_LT,flexShrink:0}}/>
        {data&&<>
          <span style={{fontSize:12,fontWeight:600,color:TEXT_SUB,whiteSpace:'nowrap'}}>🌅 <b style={{color:ORG}}>{data.sunTimes.rise}</b></span>
          <span style={{fontSize:12,fontWeight:600,color:TEXT_SUB,whiteSpace:'nowrap'}}>🌇 <b style={{color:ORG}}>{data.sunTimes.set}</b></span>
          <span style={{fontSize:12,fontWeight:600,color:TEXT_SUB,whiteSpace:'nowrap'}}>☀️ Noon <b style={{color:ORG}}>{data.sunTimes.noon}</b></span>
        </>}
        <div style={{flex:1}}/>
        <div style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontWeight:700,fontSize:13,whiteSpace:'nowrap'}} onClick={toggleAnim}>
          <div style={{width:36,height:20,borderRadius:10,background:animating?ORG:'#D1D5DB',position:'relative',transition:'background .2s',flexShrink:0}}>
            <div style={{width:14,height:14,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:animating?19:3,transition:'left .2s'}}/>
          </div>
          {animating?'⏸ Pause':'▶ Play'}
        </div>
        {!animating&&<div style={{display:'flex',gap:10,alignItems:'center'}}>
          <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:TEXT_DARK,whiteSpace:'nowrap'}}>Hr {simH}<input type="range" min={0} max={23} value={simH} onChange={e=>setSimHM(+e.target.value,simM)} style={{width:70,accentColor:ORG}}/></label>
          <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:TEXT_DARK,whiteSpace:'nowrap'}}>Min {simM}<input type="range" min={0} max={55} step={5} value={simM} onChange={e=>setSimHM(simH,+e.target.value)} style={{width:70,accentColor:ORG}}/></label>
        </div>}
        <div style={{width:1,height:28,background:ORG_LT,flexShrink:0}}/>
        <div style={{display:'flex',gap:3}}>
          {([['3d','🏙 3D'],['2d','🗺 2D'],['year','🔄 Seasons']] as [string,string][]).map(([id,label])=>(
            <button key={id} onClick={()=>setView(id as '3d'|'2d'|'year')} style={{background:view===id?ORG:WHITE,color:view===id?'#fff':TEXT_DARK,border:`2px solid ${view===id?ORG:'#E5E7EB'}`,borderRadius:8,padding:'5px 10px',fontWeight:700,fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>{label}</button>
          ))}
        </div>
        <button onClick={()=>setShowInfo(!showInfo)} style={{background:showInfo?ORG_LT:WHITE,border:`2px solid ${ORG_LT}`,borderRadius:8,padding:'5px 10px',fontWeight:700,fontSize:12,cursor:'pointer',flexShrink:0}}>📊 Data</button>
      </div>

      {/* MAP AREA */}
      <div style={{flex:1,overflow:'hidden',position:'relative'}}>
        {loading&&<div style={{position:'absolute',top:16,left:'50%',transform:'translateX(-50%)',zIndex:999,background:'rgba(224,123,0,0.92)',color:'#fff',borderRadius:10,padding:'8px 20px',fontWeight:700,fontSize:13}}>☀️ Computing sun path…</div>}
        {el<=0&&data&&view!=='year'&&<div style={{position:'absolute',top:16,left:'50%',transform:'translateX(-50%)',zIndex:999,background:'rgba(7,9,16,0.88)',color:'#F39C12',borderRadius:10,padding:'8px 20px',fontWeight:600,fontSize:13,whiteSpace:'nowrap'}}>�� Sun below horizon · Sunrise {data.sunTimes.rise} · Sunset {data.sunTimes.set}</div>}

        {view==='3d'&&(
          data?(
            <Map3DShadow lat={lat} lon={lon} pathData={data.pathData} simTime={simTime} simPos={data.simPos} sunTimes={data.sunTimes} animating={animating} onLocationSelect={(la,lo)=>setCoords([la,lo])}/>
          ):(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:16,color:TEXT_SUB}}>
              <div style={{fontSize:48}}>☀️</div>
              <div style={{fontSize:18,fontWeight:700,color:TEXT_DARK}}>Loading sun data…</div>
            </div>
          )
        )}

        {view==='2d'&&(
          <Map2D lat={lat} lon={lon} pathData={data?.pathData??[]} simPos={data?.simPos??null} riseEdge={data?.riseEdge??null} setEdge={data?.setEdge??null} animating={animating} locationSelectMode={true} height={typeof window!=='undefined'?window.innerHeight-120:700} onLocationSelect={(la,lo)=>setCoords([la,lo])}/>
        )}

        {view==='year'&&data&&(
          <div style={{height:'100%',overflowY:'auto',padding:16}}>
            <SeasonalMap lat={lat} lon={lon} seasonal={data.seasonal}/>
            <div style={{display:'flex',justifyContent:'center',gap:24,flexWrap:'wrap',background:WHITE,padding:'12px 20px',borderRadius:12,marginTop:10,border:`2px solid ${ORG_LT}`}}>
              {[{label:'Summer',color:'#FF4444'},{label:'Autumn',color:'#FF8C00'},{label:'Spring',color:'#C8A800'},{label:'Winter',color:'#5BAED8'}].map(s=>(
                <div key={s.label} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{display:'inline-block',width:24,height:4,background:s.color,borderRadius:2}}/>
                  <span style={{color:s.color,fontWeight:700,fontSize:14}}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DATA PANEL */}
      {showInfo&&data&&(
        <div style={{background:WHITE,borderTop:`2px solid ${ORG_LT}`,padding:'12px 20px',flexShrink:0,maxHeight:'35vh',overflowY:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
            {[{label:'🕐 Time',val:simTime},{label:'🧭 Azimuth',val:`${az.toFixed(1)}°`},{label:'☀️ Elevation',val:`${el.toFixed(1)}°`},{label:'⚡ Radiation',val:`${data.radiation} W/m²`}].map(m=>(
              <div key={m.label} className="metric-card"><div className="metric-label">{m.label}</div><div className="metric-value">{m.val}</div></div>
            ))}
          </div>
          <SolarChart pathData={data.pathData} simTime={simTime}/>
        </div>
      )}
    </div>
  );
}
