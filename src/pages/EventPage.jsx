import { useState, useEffect } from "react";
import { apiCall } from "../context/AuthContext";

const API = "http://localhost:8000";
const MON_L = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const C = {
  bg:"#f8fafc", surface:"#fff", surface2:"#e5e7eb",
  border:"#d1d5db", ink:"#111827", muted:"#6b7280",
  accent:"#1e3a8a", accentBg:"#dbeafe",
  green:"#16a34a", greenBg:"#f0fdf4",
};

export default function EventPage({ eventId, eventType = "club", onBack, onClubClick }) {
  const [ev,      setEv]      = useState(null);
  const [club,    setClub]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [eventId, eventType]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      if (eventType === "general") {
        // Fetch all general events and find the one we need
        const all = await apiCall("/general-events");
        const found = all.find(e => e.id === eventId);
        if (found) setEv({ ...found, club_name: "College Event" });
      } else {
        // Fetch the club to get the event + club info
        const evList = await apiCall("/events");
        const found = evList.find(e => e.id === eventId);
        if (found) {
          setEv(found);
          // Also fetch the club for full detail
          if (found.club_id) {
            const cl = await apiCall(`/clubs/${found.club_id}`);
            setClub(cl);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        height:"100vh", fontFamily:"'Plus Jakarta Sans',sans-serif", color:C.muted }}>
      Loading…
    </div>
  );

  if (!ev) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", height:"100vh", gap:16,
        fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ fontSize:"2.5rem" }}>📅</div>
      <h2>Event not found</h2>
      <button onClick={onBack} style={backBtn}>← Back</button>
    </div>
  );

  const d      = new Date(ev.event_date);
  const thumb  = ev.thumbnail_url ? `${API}${ev.thumbnail_url}` : null;
  const icon   = club?.icon_url   ? `${API}${club.icon_url}`   : null;
  const coords = ev.coordinators || [];

  return (
    <div style={{ background:C.bg, minHeight:"100vh",
        fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

      {/* Nav */}
      <div style={{ background:"rgba(248,247,244,.93)", backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${C.border}`, padding:"0 48px", height:64,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, zIndex:100 }}>
        <button onClick={onBack} style={backBtn}>← Back</button>
        {club && onClubClick && (
          <button onClick={() => onClubClick(club.id)} style={ghostBtn}>
            View {club.name} →
          </button>
        )}
      </div>

      {/* Hero banner */}
      {thumb && (
        <div style={{ width:"100%", background:C.ink, position:"relative" }}>
          <img src={thumb} alt={ev.title}
            style={{ width:"100%", maxHeight:480, objectFit:"contain",
              display:"block" }}/>
        </div>
      )}

      <div style={{ maxWidth:800, margin:"0 auto", padding:"40px 24px 80px" }}>

        {/* Club chip */}
        {(ev.club_name || club) && (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            {icon && (
              <img src={icon} alt="" style={{ width:32, height:32, borderRadius:8,
                objectFit:"cover", border:`1.5px solid ${C.border}` }}/>
            )}
            <span style={{ fontSize:".78rem", fontWeight:600, color:C.accent,
                background:C.accentBg, padding:"4px 12px", borderRadius:20,
                border:`1px solid rgba(30,58,138,.2)` }}>
              {ev.club_name || club?.name}
            </span>
          </div>
        )}

        {/* Title */}
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(1.8rem,4vw,2.8rem)",
            fontWeight:900, lineHeight:1.1, letterSpacing:"-1px", marginBottom:20 }}>
          {ev.title}
        </h1>

        {/* Meta row */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:16, marginBottom:32,
            padding:"20px 24px", background:C.surface, borderRadius:16,
            border:`1.5px solid ${C.border}` }}>
          <MetaItem icon="📅" label="Date"
            value={`${d.getDate()} ${MON_L[d.getMonth()]} ${d.getFullYear()}`}/>
          {ev.event_time && (
            <MetaItem icon="⏰" label="Time" value={ev.event_time}/>
          )}
          {ev.location && (
            <MetaItem icon="📍" label="Location" value={ev.location}/>
          )}
        </div>

        {/* Description */}
        {ev.description && (
          <div style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem",
                fontWeight:700, marginBottom:12 }}>About this Event</h2>
            <p style={{ color:C.muted, fontSize:".96rem", lineHeight:1.85,
                whiteSpace:"pre-wrap" }}>
              {ev.description}
            </p>
          </div>
        )}

        {/* Registration CTA */}
        {ev.registration_link && (
          <div style={{ marginBottom:36, padding:"28px 32px", background:C.accentBg,
              borderRadius:18, border:`1.5px solid rgba(30,58,138,.2)`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              flexWrap:"wrap", gap:16 }}>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem",
                  fontWeight:700, marginBottom:4 }}>Ready to join?</div>
              <div style={{ fontSize:".84rem", color:C.accent }}>
                Register now to secure your spot.
              </div>
            </div>
            <a href={ev.registration_link} target="_blank" rel="noreferrer"
              style={{ background:C.accent, color:"#fff", padding:"12px 28px",
                borderRadius:12, fontSize:".92rem", fontWeight:700,
                textDecoration:"none", flexShrink:0,
                display:"inline-flex", alignItems:"center", gap:8 }}>
              Register Now →
            </a>
          </div>
        )}

        {/* Coordinators */}
        {coords.length > 0 && (
          <div style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem",
                fontWeight:700, marginBottom:16 }}>Event Coordinators</h2>
            <div style={{ display:"grid",
                gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              {coords.map(co => (
                <div key={co.id} style={{ background:C.surface,
                    border:`1.5px solid ${C.border}`, borderRadius:14, padding:18 }}>
                  <div style={{ width:40, height:40, borderRadius:10,
                      background:C.accentBg, display:"flex", alignItems:"center",
                      justifyContent:"center", fontFamily:"'Playfair Display',serif",
                      fontSize:"1.1rem", fontWeight:900, color:C.accent, marginBottom:10 }}>
                    {co.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontWeight:700, fontSize:".92rem", marginBottom:2 }}>
                    {co.name}
                  </div>
                  {co.position && (
                    <div style={{ fontSize:".78rem", color:C.accent,
                        fontWeight:600, marginBottom:8 }}>{co.position}</div>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {co.email && (
                      <a href={`mailto:${co.email}`}
                        style={{ fontSize:".76rem", color:C.muted, textDecoration:"none" }}>
                        ✉️ {co.email}
                      </a>
                    )}
                    {co.phone && (
                      <a href={`tel:${co.phone}`}
                        style={{ fontSize:".76rem", color:C.muted, textDecoration:"none" }}>
                        📞 {co.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Club info strip (if club event) */}
        {club && (
          <div style={{ padding:"20px 24px", background:C.surface,
              border:`1.5px solid ${C.border}`, borderRadius:16,
              display:"flex", alignItems:"center", gap:14,
              justifyContent:"space-between", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {icon
                ? <img src={icon} alt="" style={{ width:48, height:48,
                    borderRadius:12, objectFit:"cover", border:`1.5px solid ${C.border}` }}/>
                : <div style={{ width:48, height:48, borderRadius:12,
                    background:C.surface2, display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:"1.5rem" }}>🏛️</div>
              }
              <div>
                <div style={{ fontWeight:700, fontSize:".96rem" }}>{club.name}</div>
                <div style={{ fontSize:".76rem", color:C.muted }}>{club.department}</div>
              </div>
            </div>
            {onClubClick && (
              <button onClick={() => onClubClick(club.id)} style={ghostBtn}>
                Visit Club Page →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ icon, label, value }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:10, minWidth:140 }}>
      <span style={{ fontSize:"1.1rem", marginTop:1 }}>{icon}</span>
      <div>
        <div style={{ fontSize:".68rem", textTransform:"uppercase", letterSpacing:"1px",
            color:"#aaa", fontWeight:600, marginBottom:2 }}>{label}</div>
        <div style={{ fontWeight:600, fontSize:".9rem", color:C.ink }}>{value}</div>
      </div>
    </div>
  );
}

const backBtn = {
  background:"#dbeafe", color:"#1e3a8a", border:"1px solid #1e3a8a",
  borderRadius:8, padding:"7px 16px", cursor:"pointer",
  fontSize:".84rem", fontWeight:600,
};

const ghostBtn = {
  background:"#fff", color:C.accent, border:`1px solid ${C.accent}`,
  borderRadius:8, padding:"7px 16px", cursor:"pointer",
  fontSize:".84rem", fontWeight:600,
};
