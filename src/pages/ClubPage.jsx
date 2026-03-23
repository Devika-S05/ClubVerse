import { useState, useEffect } from "react";
import { apiCall, useAuth } from "../context/AuthContext";

const API = "http://localhost:8000";
const MON_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const C = {
  bg:"#f8fafc", surface:"#fff", surface2:"#e5e7eb",
  border:"#d1d5db", ink:"#111827", muted:"#6b7280",
  accent:"#1e3a8a", accentBg:"#dbeafe",
  green:"#16a34a", greenBg:"#f0fdf4",
};

export default function ClubPage({ clubId, onBack }) {
  const { user } = useAuth();
  const [club,       setClub]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [toast,      setToast]      = useState(null);

  useEffect(() => {
    apiCall(`/clubs/${clubId}`)
      .then(setClub)
      .catch(console.error)
      .finally(() => setLoading(false));
    if (user) {
      apiCall(`/subscriptions/check/${clubId}`)
        .then(d => setSubscribed(d.subscribed))
        .catch(()=>{});
    }
  }, [clubId, user]);

  const toggleSub = async () => {
    if (!user) { setToast({msg:"Please login to subscribe",type:"error"}); return; }
    setSubLoading(true);
    try {
      if (subscribed) {
        await apiCall(`/clubs/${clubId}/subscribe`,"DELETE");
        setSubscribed(false);
        setToast({msg:`Unsubscribed from ${club.name}`,type:"info"});
      } else {
        await apiCall(`/clubs/${clubId}/subscribe`,"POST");
        setSubscribed(true);
        setToast({msg:`Subscribed to ${club.name}! You'll get event notifications.`,type:"success"});
      }
    } catch(e) { setToast({msg:e.message,type:"error"}); }
    finally { setSubLoading(false); setTimeout(()=>setToast(null),3000); }
  };

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
        fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#7a7265"}}>Loading…</div>
  );
  if (!club) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        height:"100vh",gap:16,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      Club not found.
      <button onClick={onBack} style={backBtn}>← Back</button>
    </div>
  );

  const today    = new Date().toISOString().slice(0,10);
  const upcoming = (club.events||[]).filter(e=>e.event_date>=today)
                    .sort((a,b)=>a.event_date.localeCompare(b.event_date));
  const past     = (club.events||[]).filter(e=>e.event_date<today)
                    .sort((a,b)=>b.event_date.localeCompare(a.event_date));
  const iconUrl  = club.icon_url ? `${API}${club.icon_url}` : null;

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {toast && (
        <div style={{position:"fixed",bottom:28,right:28,zIndex:999,
            background:toast.type==="error"?"#fef2f2":toast.type==="info"?C.surface2:C.greenBg,
            border:`1px solid ${toast.type==="error"?"#dc2626":toast.type==="info"?C.border:C.green}`,
            color:toast.type==="error"?"#dc2626":toast.type==="info"?C.muted:C.green,
            borderRadius:12,padding:"14px 22px",fontWeight:600,fontSize:".88rem",
            boxShadow:"0 8px 32px rgba(0,0,0,.12)"}}>
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div style={{background:"rgba(248,247,244,.93)",backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${C.border}`,padding:"0 48px",height:64,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          position:"sticky",top:0,zIndex:100}}>
        <button onClick={onBack} style={backBtn}>← Back to ClubVerse</button>
        <button onClick={toggleSub} disabled={subLoading}
          style={{background:subscribed?C.surface2:C.accent,
            color:subscribed?C.muted:"#fff",
            border:`1.5px solid ${subscribed?C.border:C.accent}`,
            borderRadius:10,padding:"8px 20px",cursor:"pointer",
            fontWeight:600,fontSize:".86rem",transition:"all .2s"}}>
          {subLoading?"…":subscribed?"✓ Subscribed":"🔔 Subscribe"}
        </button>
      </div>

      {/* Club header */}
      <div style={{padding:"48px 48px 36px",
          background:"linear-gradient(155deg,#f8f7f4 0%,#ede9e0 100%)",
          borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:18}}>
          {iconUrl
            ?<img src={iconUrl} alt={club.name} style={{width:72,height:72,borderRadius:16,
                objectFit:"cover",border:`2px solid ${C.border}`,flexShrink:0}}/>
            :<div style={{width:72,height:72,borderRadius:16,background:C.surface2,
                border:`2px solid ${C.border}`,display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:"2.4rem",flexShrink:0}}>🏛️</div>
          }
          <div>
            <div style={{fontSize:".68rem",textTransform:"uppercase",letterSpacing:"1.2px",
                color:"#aaa",fontWeight:600,marginBottom:4}}>{club.department||"General"}</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"2.4rem",fontWeight:900,
                letterSpacing:"-1px",lineHeight:1.1}}>{club.name}</h1>
          </div>
        </div>
        {(club.tags||[]).length>0 && (
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:18}}>
            {club.tags.map(t=>(
              <span key={t} style={{background:C.accentBg,color:C.accent,
                  border:"1px solid rgba(184,74,30,.2)",padding:"3px 12px",
                  borderRadius:20,fontSize:".72rem",fontWeight:600}}>{t}</span>
            ))}
          </div>
        )}
        <p style={{color:C.muted,fontSize:"1rem",lineHeight:1.85,maxWidth:720}}>
          {club.description || "No description provided."}
        </p>
        {club.email && (
          <a href={`mailto:${club.email}`} style={{display:"inline-flex",alignItems:"center",gap:6,
              marginTop:10,color:C.accent,fontSize:".86rem",fontWeight:600,textDecoration:"none"}}>
            ✉️ {club.email}
          </a>
        )}{/*
        {subscribed && (
          <div style={{marginTop:14,display:"inline-flex",alignItems:"center",gap:6,
              background:C.greenBg,color:C.green,border:`1px solid ${C.green}`,
              borderRadius:20,padding:"4px 14px",fontSize:".78rem",fontWeight:600}}>
            ✓ You are subscribed — you'll get notified about new events!
          </div>
        )}*/}
      </div>

      <div style={{padding:"0 48px 80px"}}>
        {/* ExeCom */}
        {(club.execom||[]).length>0 && (
          <section style={{marginTop:48}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",fontWeight:700,marginBottom:24}}>
              Executive Committee
            </h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
              {club.execom.map(m=>(
                <div key={m.id} style={{background:C.surface,border:`1.5px solid ${C.border}`,
                    borderRadius:16,padding:20}}>
                  <div style={{width:48,height:48,borderRadius:12,background:C.accentBg,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontFamily:"'Playfair Display',serif",fontSize:"1.4rem",fontWeight:900,
                      color:C.accent,marginBottom:12}}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{fontWeight:600,fontSize:".95rem",marginBottom:2}}>{m.name}</div>
                  {m.position&&<div style={{fontSize:".78rem",color:C.accent,fontWeight:600,marginBottom:10}}>{m.position}</div>}
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {m.email&&<a href={`mailto:${m.email}`} style={{fontSize:".76rem",color:C.muted,textDecoration:"none"}}>✉️ {m.email}</a>}
                    {m.phone&&<a href={`tel:${m.phone}`} style={{fontSize:".76rem",color:C.muted,textDecoration:"none"}}>📞 {m.phone}</a>}
                    {m.linkedin&&<a href={m.linkedin} target="_blank" rel="noreferrer" style={{fontSize:".76rem",color:"#0284c7",textDecoration:"none"}}>🔗 LinkedIn</a>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        {upcoming.length>0 && (
          <section style={{marginTop:48}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",fontWeight:700,marginBottom:24}}>
              Upcoming Events
            </h2>
            <div style={{display:"flex",gap:16,overflowX:"auto",paddingBottom:8}}>
              {upcoming.map(ev=><EventTile key={ev.id} ev={ev} isPast={false}/>)}
            </div>
          </section>
        )}

        {/* Past Events */}
        {past.length>0 && (
          <section style={{marginTop:48}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",fontWeight:700,marginBottom:24}}>
              Past Events
            </h2>
            <div style={{display:"flex",gap:16,overflowX:"auto",paddingBottom:8}}>
              {past.map(ev=><EventTile key={ev.id} ev={ev} isPast={true}/>)}
            </div>
          </section>
        )}

        {/* Recruitments */}
        {(club.recruitments||[]).filter(r=>r.is_active).length>0 && (
          <section style={{marginTop:48}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",fontWeight:700,marginBottom:24}}>
              🎯 We're Enrolling!
            </h2>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {club.recruitments.filter(r=>r.is_active).map(r=>(
                <div key={r.id} style={{background:C.surface,border:`2px solid ${C.accent}`,
                    borderRadius:16,padding:24,display:"flex",alignItems:"center",
                    justifyContent:"space-between",gap:20,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:6,
                        background:C.accentBg,color:C.accent,borderRadius:20,
                        padding:"3px 12px",fontSize:".72rem",fontWeight:600,marginBottom:10}}>
                      ✦ Open Recruitment
                    </div>
                    <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",
                        fontWeight:700,marginBottom:6}}>{r.title}</h3>
                    {r.description&&(
                      <p style={{fontSize:".84rem",color:C.muted,lineHeight:1.7,marginBottom:8}}>
                        {r.description}
                      </p>
                    )}
                    <div style={{display:"flex",flexWrap:"wrap",gap:16,marginTop:4}}>
                      <p style={{fontSize:".78rem",color:C.muted,fontWeight:600}}>
                        📅 Last date: <span style={{color:C.accent}}>
                          {new Date(r.last_date).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}
                        </span>
                      </p>
                      {r.venue && <p style={{fontSize:".78rem",color:C.muted,fontWeight:600}}>📍 <span style={{color:C.accent}}>{r.venue}</span></p>}
                      {r.time && <p style={{fontSize:".78rem",color:C.muted,fontWeight:600}}>⏰ <span style={{color:C.accent}}>{r.time}</span></p>}
                    </div>
                  </div>
                  {r.registration_link&&(
                    <a href={r.registration_link} target="_blank" rel="noreferrer"
                      style={{flexShrink:0,background:C.accent,color:"#fff",padding:"10px 24px",
                        borderRadius:10,fontSize:".86rem",fontWeight:700,textDecoration:"none",
                        display:"inline-flex",alignItems:"center",gap:8}}>
                      Apply Now →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {(club.events||[]).length===0 && (
          <div style={{textAlign:"center",padding:"60px 0",color:C.muted,marginTop:48}}>
            No events added yet.
          </div>
        )}
      </div>
    </div>
  );
}

function EventTile({ ev, isPast }) {
  const [hov,setHov]=useState(false);
  const d     = new Date(ev.event_date);
  const thumb = ev.thumbnail_url ? `${API}${ev.thumbnail_url}` : null;
  const pic   = ev.picture_url   ? `${API}${ev.picture_url}`   : null;

  return (
    <div style={{flexShrink:0,width:280,background:"#fff",
        border:`1.5px solid ${hov?C.accent:C.border}`,borderRadius:16,overflow:"hidden",
        transition:"all .22s",transform:hov?"translateY(-3px)":"none",
        boxShadow:hov?"0 8px 32px rgba(0,0,0,.1)":"none",opacity:isPast?.85:1}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {(pic||thumb) ? (
        <img src={pic||thumb} alt={ev.title} style={{width:"100%",height:148,objectFit:"cover",display:"block"}}/>
      ) : (
        <div style={{width:"100%",height:80,background:C.surface2,display:"flex",
            alignItems:"center",justifyContent:"center",fontSize:"2rem"}}>📅</div>
      )}
      <div style={{padding:18}}>
        {isPast && (
          <span style={{background:C.surface2,color:C.muted,fontSize:".64rem",fontWeight:600,
              textTransform:"uppercase",letterSpacing:"1px",padding:"2px 8px",
              borderRadius:8,marginBottom:8,display:"inline-block"}}>Completed</span>
        )}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:".96rem",fontWeight:700,
            marginBottom:6,lineHeight:1.3}}>{ev.title}</div>
        <div style={{fontSize:".73rem",color:C.muted,marginBottom:8}}>
          📅 {d.getDate()} {MON_S[d.getMonth()]} {d.getFullYear()}
          {ev.event_time && ` · ⏰ ${ev.event_time}`}
          {ev.location && <span style={{display:"block",marginTop:2}}>📍 {ev.location}</span>}
        </div>
        <p style={{fontSize:".78rem",color:C.muted,lineHeight:1.6,marginBottom:10}}>
          {(ev.description||"").slice(0,110)}{(ev.description||"").length>110?"…":""}
        </p>
        {!isPast && ev.registration_link && (
          <a href={ev.registration_link} target="_blank" rel="noreferrer"
            style={{display:"inline-block",background:C.accent,color:"#fff",
              padding:"6px 14px",borderRadius:8,fontSize:".75rem",fontWeight:600,textDecoration:"none"}}>
            Register →
          </a>
        )}
        {(ev.coordinators||[]).length>0 && (
          <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
            <p style={{fontSize:".65rem",color:"#aaa",fontWeight:600,textTransform:"uppercase",
                letterSpacing:"1px",marginBottom:6}}>Coordinators</p>
            {ev.coordinators.map(co=>(
              <div key={co.id} style={{fontSize:".74rem",color:C.muted,marginBottom:4}}>
                <span style={{fontWeight:600}}>{co.name}</span>
                {co.position&&<span style={{color:C.accent}}> · {co.position}</span>}
                {co.phone&&<span> · {co.phone}</span>}
                {co.email&&<a href={`mailto:${co.email}`} style={{color:C.accent,textDecoration:"none"}}> · {co.email}</a>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const backBtn = {
  background:"#dbeafe",color:"#1e3a8a",border:"1px solid #1e3a8a",
  borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:".84rem",fontWeight:600,
};
