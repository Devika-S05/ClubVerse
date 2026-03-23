import { useState, useEffect } from "react";
import { useAuth, apiCall } from "../context/AuthContext";

const API = "http://localhost:8000";
const C = {
  bg:"#f8fafc", surface:"#fff", surface2:"#e5e7eb",
  border:"#d1d5db", ink:"#111827", muted:"#6b7280",
  accent:"#1e3a8a", accentBg:"#dbeafe",
  green:"#16a34a", greenBg:"#f0fdf4",
};
const MON_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function scoreClub(club, interests) {
  if (!interests.length) return 0;
  const hay = [...(club.tags||[]), club.name, club.department, club.description].join(" ").toLowerCase();
  return interests.reduce((a,w) => a + (hay.includes(w.toLowerCase())?1:0), 0);
}

function scoreEvent(ev, interests) {
  if (!interests.length) return 0;
  const hay = [ev.title, ev.description, ev.club_name||""].join(" ").toLowerCase();
  return interests.reduce((a,w) => a + (hay.includes(w.toLowerCase())?1:0), 0);
}

export default function ProfilePage({ onClubClick, onBack }) {
  const { user, logout } = useAuth();
  const [subs,       setSubs]       = useState([]);
  const [allClubs,   setAllClubs]   = useState([]);
  const [upEvents,   setUpEvents]   = useState([]);
  const [interests,  setInterests]  = useState(user?.interests||[]);
  const [inputI,     setInputI]     = useState("");
  const [tab,        setTab]        = useState("interests");
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      await apiCall("/notifications/sync", "POST").catch(()=>{});
      const [s, cl, ev, gen] = await Promise.all([
        apiCall("/subscriptions"),
        apiCall("/clubs"),
        apiCall("/events?upcoming=1"),
        apiCall("/general-events?upcoming=1"),
      ]);
      setSubs(s);
      setAllClubs(cl);
      setUpEvents([...ev, ...gen.map(e=>({...e, club_name:"College Event"}))]);
    } catch(e) { console.error(e); }
  };



  const addInterest = () => {
    const w = inputI.trim().toLowerCase();
    if (w && !interests.includes(w)) {
      setInterests([...interests, w]);
    }
    setInputI("");
  };

  const removeInterest = i => setInterests(interests.filter((_,j)=>j!==i));

  const saveInterests = async (list=interests) => {
    setSaving(true);
    try {
      await apiCall("/auth/interests","PUT",{interests:list});
      setToast("Interest saved!");
    } catch(e) { setToast("Failed to save"); }
    finally { setSaving(false); setTimeout(()=>setToast(null),3000); }
  };

  const addAndSave = () => {
    const w = inputI.trim().toLowerCase();
    if (!w) return;
    if (interests.includes(w)) { setInputI(""); return; }
    const updated = [...interests, w];
    setInterests(updated);
    setInputI("");
    saveInterests(updated);
  };

  // Suggestions based on interests
  const suggestedClubs = interests.length
    ? allClubs
        .filter(c=>!subs.find(s=>s.id===c.id))
        .map(c=>({...c,sc:scoreClub(c,interests)}))
        .filter(c=>c.sc>0)
        .sort((a,b)=>b.sc-a.sc)
        .slice(0,6)
    : [];

  const suggestedEvents = interests.length
    ? upEvents
        .map(e=>({...e,sc:scoreEvent(e,interests)}))
        .filter(e=>e.sc>0)
        .sort((a,b)=>b.sc-a.sc)
        .slice(0,6)
    : [];

  const [modal, setModal] = useState(null); // "clubs" | "interests" | null

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {/* Nav */}
      <div style={{background:"rgba(248,247,244,.93)",backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${C.border}`,padding:"0 48px",height:64,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          position:"sticky",top:0,zIndex:100}}>
        <button onClick={onBack} style={backBtn}>← Back to Home</button>
        <button onClick={()=>{logout();onBack();}} style={{...backBtn}}>
          Logout
        </button>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"40px 24px"}}>
        {toast && (
          <div style={{position:"fixed",bottom:28,right:28,background:C.greenBg,
              border:`1px solid ${C.green}`,color:C.green,borderRadius:12,
              padding:"14px 22px",fontWeight:600,zIndex:999}}>✅ {toast}</div>
        )}

        {/* Profile header */}
        <div style={{background:C.surface,borderRadius:20,padding:28,marginBottom:24,
            border:`1.5px solid ${C.border}`,display:"flex",gap:20,alignItems:"center"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:C.ink,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Playfair Display',serif",fontSize:"1.8rem",
              fontWeight:900,color:"#fff",flexShrink:0}}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.8rem",
                fontWeight:700,marginBottom:4}}>{user?.name}</h1>
            <p style={{color:C.muted,fontSize:".88rem",marginBottom:12}}>{user?.email}</p>
            <div style={{display:"flex",gap:24}}>
              <button onClick={()=>setModal("clubs")}
                style={{background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"center"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.4rem",fontWeight:900,color:C.ink,lineHeight:1}}>{subs.length}</div>
                <div style={{fontSize:".75rem",color:C.muted,marginTop:2}}>My Clubs</div>
              </button>
              <button onClick={()=>setModal("interests")}
                style={{background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"center"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.4rem",fontWeight:900,color:C.ink,lineHeight:1}}>{interests.length}</div>
                <div style={{fontSize:".75rem",color:C.muted,marginTop:2}}>Interests</div>
              </button>
            </div>
          </div>
        </div>



        {/* ── INTERESTS PANEL ── */}
        {tab==="interests" && (
          <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:24}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.4rem",fontWeight:700,marginBottom:8}}>
              💡 My Interests
            </h2>
            <p style={{color:C.muted,fontSize:".84rem",marginBottom:16}}>
              Add interests for personalized club and event suggestions.
            </p>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <input value={inputI} onChange={e=>setInputI(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addAndSave()}
                placeholder="e.g. coding, music, robotics, photography…"
                style={{flex:1,background:C.surface2,border:`1.5px solid ${C.border}`,
                  borderRadius:10,padding:"10px 14px",fontSize:".88rem",outline:"none"}}/>
              <button onClick={addAndSave}
                style={{background:C.accent,color:"#fff",border:"none",borderRadius:10,
                  padding:"10px 18px",cursor:"pointer",fontWeight:600}}>Add</button>
            </div>
            {interests.length===0
              ? <p style={{fontSize:".82rem",color:"#aaa"}}>No interests added yet.</p>
              : <p style={{fontSize:".82rem",color:C.muted}}>
                  You have <strong style={{color:C.ink}}>{interests.length}</strong> saved interests.
                  Click <strong>Interests</strong> near your name to view or remove them.
                </p>
            }
          </div>
        )}

        {/* ── MY CLUBS MODAL ── */}
        {modal==="clubs" && (
          <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(23,21,15,.5)",
              backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:20,
                width:"min(540px,92vw)",maxHeight:"80vh",display:"flex",flexDirection:"column",
                boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
              <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,
                  display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",fontWeight:700}}>
                  My Clubs ({subs.length})
                </span>
                <button onClick={()=>setModal(null)} style={{background:C.surface2,border:`1px solid ${C.border}`,
                    width:32,height:32,borderRadius:8,cursor:"pointer",color:C.muted,fontSize:"1rem"}}>✕</button>
              </div>
              <div style={{overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10}}>
                {subs.length===0 ? (
                  <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>
                    <div style={{fontSize:"2rem",marginBottom:8}}>🏛️</div>
                    <p>No subscriptions yet.</p>
                  </div>
                ) : subs.map(club=>{
                  const icon = club.icon_url?`${API}${club.icon_url}`:null;
                  return (
                    <div key={club.id} onClick={()=>{setModal(null);onClubClick(club.id);}}
                      style={{display:"flex",gap:12,alignItems:"center",padding:"12px 14px",
                        borderRadius:12,cursor:"pointer",border:`1.5px solid ${C.border}`,
                        background:C.surface,transition:"all .2s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                      {icon
                        ?<img src={icon} alt="" style={{width:44,height:44,borderRadius:10,objectFit:"cover",flexShrink:0}}/>
                        :<div style={{width:44,height:44,borderRadius:10,background:C.surface2,
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",flexShrink:0}}>🏛️</div>
                      }
                      <div>
                        <div style={{fontWeight:700,fontSize:".92rem"}}>{club.name}</div>
                        <div style={{fontSize:".72rem",color:C.muted}}>{club.department}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── INTERESTS MODAL ── */}
        {modal==="interests" && (
          <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(23,21,15,.5)",
              backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:20,
                width:"min(480px,92vw)",maxHeight:"80vh",display:"flex",flexDirection:"column",
                boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
              <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,
                  display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",fontWeight:700}}>
                  My Interests ({interests.length})
                </span>
                <button onClick={()=>setModal(null)} style={{background:C.surface2,border:`1px solid ${C.border}`,
                    width:32,height:32,borderRadius:8,cursor:"pointer",color:C.muted,fontSize:"1rem"}}>✕</button>
              </div>
              <div style={{overflowY:"auto",padding:20}}>
                {interests.length===0 ? (
                  <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>
                    <div style={{fontSize:"2rem",marginBottom:8}}>💡</div>
                    <p>No interests saved yet.</p>
                  </div>
                ) : (
                  <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                    {interests.map((w,i)=>(
                      <span key={i} style={{background:C.accentBg,color:C.accent,
                          border:"1px solid rgba(184,74,30,.2)",borderRadius:20,
                          padding:"8px 16px",fontSize:".88rem",fontWeight:600,
                          display:"flex",alignItems:"center",gap:8}}>
                        {w}
                        <span onClick={()=>removeInterest(i)}
                          style={{cursor:"pointer",opacity:.6,fontSize:".8rem"}}>✕</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
const backBtn = {
  background:C.accentBg,color:C.accent,border:`1px solid ${C.accent}`,
  borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:".84rem",fontWeight:600,
};
