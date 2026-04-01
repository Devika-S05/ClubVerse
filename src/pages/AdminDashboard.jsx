import { useState, useEffect } from "react";
import { apiCall, useAuth } from "../context/AuthContext";

const API = "http://localhost:8000";

const C = {
  bg:"#f8fafc", surface:"#fff", surface2:"#e5e7eb",
  border:"#d1d5db", ink:"#111827", muted:"#6b7280",
  accent:"#1e3a8a", accentBg:"#dbeafe",
  green:"#16a34a", greenBg:"#f0fdf4",
};

const inp = (ex={}) => ({
  width:"100%",background:C.surface2,border:`1.5px solid ${C.border}`,borderRadius:10,
  padding:"10px 14px",fontSize:".88rem",color:C.ink,outline:"none",
  marginBottom:12,display:"block",...ex
});
const lbl = (ex={}) => ({
  display:"block",fontSize:".72rem",fontWeight:600,color:C.muted,
  textTransform:"uppercase",letterSpacing:"1px",marginBottom:5,...ex
});
const pBtn = (v="primary", ex={}) => ({
  border:"none",borderRadius:9,padding:"9px 18px",cursor:"pointer",
  fontWeight:600,fontSize:".84rem",transition:"all .2s",
  ...(v==="primary"&&{background:C.ink,color:"#fff"}),
  ...(v==="accent"&&{background:C.accent,color:"#fff"}),
  ...(v==="danger"&&{background:"#fef2f2",color:"#dc2626",border:"1px solid #dc2626"}),
  ...(v==="ghost"&&{background:"none",color:C.muted,border:`1px solid ${C.border}`}),
  ...ex
});
const cardStyle = (ex={}) => ({
  background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:24,...ex
});

const MON_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t=setTimeout(onDone,3000); return()=>clearTimeout(t); },[]);
  return (
    <div style={{position:"fixed",bottom:28,right:28,zIndex:999,
        background:type==="error"?"#fef2f2":C.greenBg,
        border:`1px solid ${type==="error"?"#dc2626":C.green}`,
        color:type==="error"?"#dc2626":C.green,
        borderRadius:12,padding:"14px 22px",fontWeight:600,fontSize:".88rem",
        boxShadow:"0 8px 32px rgba(0,0,0,.12)",maxWidth:340}}>
      {type==="error"?"⚠️ ":"✅ "}{msg}
    </div>
  );
}

/* ── General Events Manager ─────────────────────────────────────────────── */
function EventForm({ event, onSaved, onCancel }) {
  const isEdit = !!event;
  const today = new Date().toISOString().slice(0,10);
  const [form,setForm] = useState({
    title:event?.title||"", description:event?.description||"",
    event_date:event?.event_date||"", event_time:event?.event_time||"",
    location:event?.location||"",
    registration_link:event?.registration_link||"",
    volunteer_link:event?.volunteer_link||"",
    existing_thumbnail_url:event?.thumbnail_url||"",
  });
  const [thumb,setThumb] = useState(null);
  const [newPhotos,setNewPhotos] = useState([]);
  const [existingPhotos,setExistingPhotos] = useState(
    event?.photos?.length ? event.photos :
    event?.picture_url   ? [{id:null, photo_url:event.picture_url}] : []
  );
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const isPast = form.event_date && form.event_date < today;

  const deletePhoto = async (photoId) => {
    if (!photoId) return;
    if (!confirm("Remove this photo?")) return;
    try {
      const token = localStorage.getItem("cv_token");
      await fetch(`${API}/api/event-photos/${photoId}`, {
        method:"DELETE", headers:{Authorization:`Bearer ${token}`}
      });
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch(e) { alert("Failed to delete photo"); }
  };

  const submit = async e => {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v])=>{ if(v) fd.append(k,v); });
      if (thumb) fd.append("thumbnail",thumb);
      newPhotos.forEach(f => fd.append("photos",f));
      const token = localStorage.getItem("cv_token");
      const url = isEdit?`${API}/api/general-events/${event.id}`:`${API}/api/general-events`;
      const res = await fetch(url,{method:isEdit?"PUT":"POST",
        headers:{Authorization:`Bearer ${token}`},body:fd});
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSaved();
    } catch(e) { setError(e.message||"Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl()}>Event Title *</label>
          <input required style={inp()} placeholder="e.g. Annual Tech Fest"
            value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl()}>Description</label>
          <textarea style={inp({height:80,resize:"vertical"})} placeholder="Brief description…"
            value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        </div>
        <div>
          <label style={lbl()}>Date *</label>
          <input type="date" required style={inp()}
            value={form.event_date} onChange={e=>setForm({...form,event_date:e.target.value})}/>
        </div>
        <div>
          <label style={lbl()}>Time</label>
          <input type="time" style={inp()}
            value={form.event_time} onChange={e=>setForm({...form,event_time:e.target.value})}/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl()}>Location</label>
          <input style={inp()} placeholder="e.g. Main Auditorium, Block A Room 101…"
            value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl()}>Registration Link</label>
          <input type="url" style={inp()} placeholder="https://forms.google.com/…"
            value={form.registration_link} onChange={e=>setForm({...form,registration_link:e.target.value})}/>
        </div>
        {/* ── Volunteer Form ── */}
        <div style={{gridColumn:"1/-1",background:C.surface2,borderRadius:12,padding:"16px 18px",marginBottom:4}}>
          <label style={lbl({marginBottom:4})}>🙋 Volunteer Registration Form <span style={{color:C.muted,textTransform:"none",fontWeight:400}}>(optional)</span></label>
          <p style={{fontSize:".76rem",color:C.muted,marginBottom:10}}>
            A separate form link for students who want to volunteer at this event.
          </p>
          <input type="url" style={inp({marginBottom:0})} placeholder="https://forms.google.com/volunteer-form…"
            value={form.volunteer_link} onChange={e=>setForm({...form,volunteer_link:e.target.value})}/>
        </div>
        {/* ── Thumbnail ── */}
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl()}>Thumbnail / Icon</label>
          {form.existing_thumbnail_url&&!thumb&&(
            <img src={`${API}${form.existing_thumbnail_url}`} alt=""
              style={{width:64,height:64,objectFit:"cover",borderRadius:10,marginBottom:8,display:"block"}}/>
          )}
          <input type="file" accept="image/*" style={inp()} onChange={e=>setThumb(e.target.files[0]||null)}/>
          <p style={{fontSize:".74rem",color:C.muted,marginTop:-8,marginBottom:12}}>
            This image will be used as the event card thumbnail.
          </p>
        </div>
        {/* ── Gallery Photos ── */}
        {isPast ? (
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl()}>
              Event Gallery Photos
              <span style={{color:C.accent,textTransform:"none",marginLeft:6,fontWeight:400}}>
                (past event — shown when users click the card)
              </span>
            </label>
            {existingPhotos.length > 0 && (
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                {existingPhotos.map((p)=>(
                  <div key={p.id||p.photo_url} style={{position:"relative"}}>
                    <img src={`${API}${p.photo_url}`} alt=""
                      style={{width:80,height:64,objectFit:"cover",borderRadius:8,
                        border:`1.5px solid ${C.border}`,display:"block"}}/>
                    <button type="button" onClick={()=>deletePhoto(p.id)}
                      style={{position:"absolute",top:-6,right:-6,width:20,height:20,
                        borderRadius:"50%",background:"#dc2626",color:"#fff",
                        border:"2px solid #fff",cursor:"pointer",fontSize:".65rem",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontWeight:700,lineHeight:1}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {newPhotos.length > 0 && (
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                {newPhotos.map((f,i)=>(
                  <div key={i} style={{position:"relative"}}>
                    <img src={URL.createObjectURL(f)} alt=""
                      style={{width:80,height:64,objectFit:"cover",borderRadius:8,
                        border:`1.5px solid ${C.accent}`}}/>
                    <button type="button"
                      onClick={()=>setNewPhotos(newPhotos.filter((_,j)=>j!==i))}
                      style={{position:"absolute",top:-6,right:-6,width:18,height:18,
                        borderRadius:"50%",background:C.ink,color:"#fff",
                        border:"none",cursor:"pointer",fontSize:".6rem",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <input type="file" accept="image/*" multiple style={inp()}
              onChange={e=>setNewPhotos(prev=>[...prev,...Array.from(e.target.files)])}/>
            <p style={{fontSize:".74rem",color:C.muted,marginTop:-8,marginBottom:12}}>
              You can select multiple photos at once, or add more in batches.
            </p>
          </div>
        ) : (
          <div style={{gridColumn:"1/-1",background:C.surface2,borderRadius:10,
              padding:"10px 14px",marginBottom:12}}>
            <p style={{fontSize:".78rem",color:C.muted}}>
              📷 Gallery photo upload will be available once the event date has passed.
            </p>
          </div>
        )}
      </div>
      {error&&<p style={{color:"#dc2626",fontSize:".82rem",marginTop:8}}>{error}</p>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
        <button type="button" onClick={onCancel} style={pBtn("ghost")}>Cancel</button>
        <button type="submit" disabled={saving} style={pBtn("primary")}>
          {saving?"Saving…":isEdit?"Update Event":"Add Event"}
        </button>
      </div>
    </form>
  );
}

function GeneralEventsManager() {
  const [events,setEvents] = useState([]);
  const [showForm,setShowForm] = useState(false);
  const [editEv,setEditEv] = useState(null);
  const [toast,setToast] = useState(null);
  const today = new Date().toISOString().slice(0,10);

  const load = async () => {
    try { setEvents(await apiCall("/general-events")); }
    catch(e) { console.error(e); }
  };
  useEffect(()=>{ load(); },[]);

  const del = async id => {
    if (!confirm("Delete this event?")) return;
    await apiCall(`/general-events/${id}`,"DELETE");
    await load(); setToast({msg:"Event deleted",type:"success"});
  };

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.7rem",fontWeight:700,marginBottom:4}}>
            General Events
          </h2>
          <p style={{color:C.muted,fontSize:".86rem"}}>College-wide events not linked to any specific club.</p>
        </div>
        {!showForm&&!editEv&&(
          <button onClick={()=>{setShowForm(true);setEditEv(null);}} style={pBtn("accent",{padding:"11px 22px"})}>
            + Add Event
          </button>
        )}
      </div>
      {(showForm||editEv)&&(
        <div style={cardStyle({marginBottom:24,background:C.surface2,maxWidth:780})}>
          <h3 style={{fontWeight:700,marginBottom:16}}>{editEv?"Edit Event":"New General Event"}</h3>
          <EventForm
            event={editEv}
            onSaved={async()=>{setShowForm(false);setEditEv(null);await load();setToast({msg:"Event saved!",type:"success"});}}
            onCancel={()=>{setShowForm(false);setEditEv(null);}}
          />
        </div>
      )}
      {events.length===0?(
        <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
          <div style={{fontSize:"2.5rem",marginBottom:12}}>📅</div>
          No general events yet. Click "+ Add Event" to create one.
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
          {events.map(ev=>{
            const thumb = ev.thumbnail_url?`${API}${ev.thumbnail_url}`:null;
            return (
              <div key={ev.id} style={cardStyle()}>
                {thumb&&<img src={thumb} alt="" style={{width:"100%",height:120,objectFit:"cover",borderRadius:10,marginBottom:12}}/>}
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",fontWeight:700,marginBottom:4}}>{ev.title}</div>
                <div style={{fontSize:".76rem",color:C.muted,marginBottom:8}}>
                  📅 {ev.event_date}{ev.event_time&&` · ⏰ ${ev.event_time}`}
                  {ev.event_date<today
                    ?<span style={{marginLeft:8,background:C.surface2,color:C.muted,borderRadius:6,padding:"1px 7px",fontSize:".67rem",fontWeight:600}}>Past</span>
                    :<span style={{marginLeft:8,background:C.greenBg,color:C.green,borderRadius:6,padding:"1px 7px",fontSize:".67rem",fontWeight:600}}>Upcoming</span>
                  }
                </div>
                <p style={{fontSize:".8rem",color:C.muted,lineHeight:1.6,marginBottom:14}}>
                  {(ev.description||"").slice(0,80)}{(ev.description||"").length>80?"…":""}
                </p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setEditEv(ev);setShowForm(false);}} style={pBtn("ghost",{padding:"6px 14px",fontSize:".78rem"})}>✏️ Edit</button>
                  <button onClick={()=>del(ev.id)} style={pBtn("danger",{padding:"6px 14px",fontSize:".78rem"})}>🗑️ Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── User Manager ────────────────────────────────────────────────────────── */
function UserManager({ clubs, onUsersChanged }) {
  const [users,setUsers] = useState([]);
  const [loading,setLoading] = useState(true);
  const [toast,setToast] = useState(null);
  const [search,setSearch] = useState("");

  const load = async () => {
    try { setUsers(await apiCall("/admin/users")); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const deleteUser = async id => {
    if (!confirm("Delete this user permanently?")) return;
    try {
      await apiCall(`/admin/users/${id}`,"DELETE");
      setToast({msg:"User deleted",type:"success"});
      load(); onUsersChanged&&onUsersChanged();
    } catch(e) { setToast({msg:e.message,type:"error"}); }
  };

  const assignModerator = async u => {
    if (!confirm(`Make ${u.name} a moderator? They will be able to submit a club creation request.`)) return;
    try {
      await apiCall(`/admin/users/${u.id}/assign-moderator`,"POST");
      setToast({msg:`${u.name} is now a moderator`,type:"success"});
      load(); onUsersChanged&&onUsersChanged();
    } catch(e) { setToast({msg:e.message,type:"error"}); }
  };

  const removeModerator = async u => {
    if (!confirm(`Remove moderator role from ${u.name}?`)) return;
    try {
      await apiCall(`/admin/users/${u.id}/remove-moderator`,"POST");
      setToast({msg:"Moderator role removed",type:"success"});
      load(); onUsersChanged&&onUsersChanged();
    } catch(e) { setToast({msg:e.message,type:"error"}); }
  };

  const roleColors = {
    admin:    {bg:"#ede9fe",color:"#6d28d9",border:"#c4b5fd"},
    moderator:{bg:C.accentBg,color:C.accent,border:"#93c5fd"},
    student:  {bg:C.surface2,color:C.muted,border:C.border},
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{color:C.muted,padding:"40px 0",textAlign:"center"}}>Loading…</div>;

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      {/* Search bar */}
      <div style={{display:"flex",alignItems:"center",gap:10,background:C.surface,
          border:`1.5px solid ${C.border}`,borderRadius:12,padding:"10px 16px",marginBottom:20}}>
        <span style={{fontSize:"1rem",color:C.muted}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{flex:1,background:"transparent",border:"none",outline:"none",
            fontSize:".9rem",color:C.ink}}/>
        {search&&(
          <button onClick={()=>setSearch("")}
            style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:".8rem"}}>
            Clear
          </button>
        )}
      </div>

      {filtered.length===0&&search&&(
        <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>
          No users match "{search}"
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(u=>{
          const rc = roleColors[u.role] || roleColors.student;
          const assignedClub = u.assigned_club_id ? clubs.find(c=>c.id===u.assigned_club_id) : null;
          return (
            <div key={u.id} style={{background:C.surface,border:`1.5px solid ${C.border}`,
                borderRadius:12,padding:"14px 18px",display:"flex",
                alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:C.ink,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontWeight:700,fontSize:"1rem",flexShrink:0}}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:".9rem"}}>{u.name}</div>
                <div style={{fontSize:".76rem",color:C.muted}}>{u.email}</div>
                {assignedClub&&(
                  <div style={{fontSize:".74rem",color:C.accent,marginTop:2}}>
                    Manages: {assignedClub.name}
                  </div>
                )}
                {u.role==="moderator"&&!assignedClub&&u.club_request&&(
                  <div style={{fontSize:".74rem",marginTop:2,
                      color:u.club_request.status==="pending"?"#d97706":"#dc2626"}}>
                    {u.club_request.status==="pending"
                      ? `⏳ Pending request: "${u.club_request.name}"`
                      : `✗ Request rejected: "${u.club_request.name}"`}
                  </div>
                )}
                {u.role==="moderator"&&!assignedClub&&!u.club_request&&(
                  <div style={{fontSize:".74rem",color:C.muted,marginTop:2}}>No club request yet</div>
                )}
              </div>
              <span style={{background:rc.bg,color:rc.color,border:`1px solid ${rc.border}`,
                  borderRadius:20,padding:"3px 12px",fontSize:".72rem",fontWeight:700,
                  flexShrink:0,textTransform:"capitalize"}}>
                {u.role}
              </span>
              {u.role!=="admin"&&(
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  {u.role==="moderator"?(
                    <button onClick={()=>removeModerator(u)}
                      style={pBtn("ghost",{padding:"5px 12px",fontSize:".76rem"})}>
                      Remove Moderator
                    </button>
                  ):(
                    <button onClick={()=>assignModerator(u)}
                      style={pBtn("ghost",{padding:"5px 12px",fontSize:".76rem",
                        color:C.accent,borderColor:C.accent})}>
                      Make Moderator
                    </button>
                  )}
                  <button onClick={()=>deleteUser(u.id)}
                    style={pBtn("danger",{padding:"5px 12px",fontSize:".76rem"})}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Club Members Modal ──────────────────────────────────────────────────── */
function ClubMembersModal({ club, onClose }) {
  const [members,setMembers] = useState([]);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    apiCall(`/clubs/${club.id}`)
      .then(cl=>setMembers(cl.members||[]))
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[club.id]);

  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)",
        zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:C.surface,borderRadius:20,width:"min(540px,94vw)",
          maxHeight:"80vh",display:"flex",flexDirection:"column",
          boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",fontWeight:700}}>
              {club.name} — Members
            </div>
            <div style={{fontSize:".76rem",color:C.muted,marginTop:2}}>
              Visible to admin and moderator only
            </div>
          </div>
          <button onClick={onClose}
            style={{background:C.surface2,border:`1px solid ${C.border}`,
              width:32,height:32,borderRadius:8,cursor:"pointer",color:C.muted,fontSize:"1rem"}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:16}}>
          {loading?(
            <div style={{textAlign:"center",padding:"32px 0",color:C.muted}}>Loading…</div>
          ):members.length===0?(
            <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>
              <div style={{fontSize:"2rem",marginBottom:8}}>🧑‍🤝‍🧑</div>
              <p>No members added yet.</p>
            </div>
          ):members.map(m=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,
                padding:"12px 14px",borderRadius:12,border:`1.5px solid ${C.border}`,
                background:C.surface,marginBottom:10}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:C.accentBg,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontWeight:700,color:C.accent,fontSize:".9rem",flexShrink:0}}>
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:".9rem"}}>{m.name}</div>
                {m.role&&<div style={{fontSize:".76rem",color:C.accent,fontWeight:600}}>{m.role}</div>}
                <div style={{fontSize:".74rem",color:C.muted,marginTop:2}}>
                  {m.email}{m.phone&&` · ${m.phone}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Assign Moderator to Club Modal ─────────────────────────────────────── */
function AssignModeratorModal({ club, onClose, onAssigned }) {
  const [users,setUsers] = useState([]);
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState("");
  const [saving,setSaving] = useState(null);
  const [toast,setToast] = useState(null);

  useEffect(()=>{
    apiCall("/admin/users")
      .then(all=>setUsers(all.filter(u=>u.role!=="admin")))
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[]);

  const assign = async u => {
    if (!confirm(`Assign ${u.name} as moderator for "${club.name}"?`)) return;
    setSaving(u.id);
    try {
      await apiCall(`/admin/clubs/${club.id}/assign-moderator`,"POST",{user_id:u.id});
      onAssigned();
    } catch(e) { setToast({msg:e.message,type:"error"}); setSaving(null); }
  };

  const filtered = users.filter(u=>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)",
        zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <div onClick={e=>e.stopPropagation()}
        style={{background:C.surface,borderRadius:20,width:"min(520px,94vw)",
          maxHeight:"82vh",display:"flex",flexDirection:"column",
          boxShadow:"0 24px 64px rgba(0,0,0,.22)"}}>
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",fontWeight:700}}>
              Assign Moderator
            </div>
            <button onClick={onClose}
              style={{background:C.surface2,border:`1px solid ${C.border}`,
                width:32,height:32,borderRadius:8,cursor:"pointer",color:C.muted,fontSize:"1rem"}}>✕</button>
          </div>
          <div style={{fontSize:".78rem",color:C.muted,marginBottom:12}}>
            Choose a user to manage <strong style={{color:C.ink}}>{club.name}</strong>.
            They will be promoted to moderator if not already one.
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,background:C.surface2,
              border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 12px"}}>
            <span style={{color:C.muted,fontSize:".9rem"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{flex:1,background:"transparent",border:"none",outline:"none",
                fontSize:".86rem",color:C.ink}}/>
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"12px 16px",flex:1}}>
          {loading ? (
            <div style={{textAlign:"center",padding:"32px 0",color:C.muted}}>Loading…</div>
          ) : filtered.length===0 ? (
            <div style={{textAlign:"center",padding:"32px 0",color:C.muted}}>No users found</div>
          ) : filtered.map(u=>{
            const hasClub = !!u.assigned_club_id;
            const alreadyMod = u.role==="moderator";
            return (
              <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"12px 14px",borderRadius:12,border:`1.5px solid ${C.border}`,
                  background:C.surface,marginBottom:8}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:C.ink,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:"#fff",fontWeight:700,fontSize:".9rem",flexShrink:0}}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:".88rem"}}>{u.name}</div>
                  <div style={{fontSize:".74rem",color:C.muted}}>{u.email}</div>
                  {alreadyMod&&(
                    <div style={{fontSize:".72rem",marginTop:2,
                        color:hasClub?"#dc2626":C.green,fontWeight:500}}>
                      {hasClub?"⚠️ Already manages another club":"✓ Moderator — no club yet"}
                    </div>
                  )}
                </div>
                <span style={{background:alreadyMod?C.accentBg:C.surface2,
                    color:alreadyMod?C.accent:C.muted,
                    border:`1px solid ${alreadyMod?"#93c5fd":C.border}`,
                    borderRadius:20,padding:"2px 10px",fontSize:".68rem",
                    fontWeight:600,flexShrink:0,textTransform:"capitalize"}}>
                  {u.role}
                </span>
                <button disabled={!!saving||hasClub} onClick={()=>assign(u)}
                  style={pBtn("accent",{padding:"6px 14px",fontSize:".76rem",
                    opacity:(saving||hasClub)?0.5:1,
                    cursor:(saving||hasClub)?"not-allowed":"pointer"})}>
                  {saving===u.id?"…":"Assign"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard({ onBack, onEventClick, onClubClick, initialView="dashboard", onViewChange }) {
  const { logout } = useAuth();
  const [clubs,setClubs] = useState([]);
  const [loading,setLoading] = useState(true);
  const [view,setViewRaw] = useState(initialView);
  const [toast,setToast] = useState(null);
  const [weekEvents,setWeekEvents] = useState([]);
  const [membersClub,setMembersClub] = useState(null);
  const [pendingRequests,setPendingRequests] = useState([]);
  const [assignModal,setAssignModal] = useState(null);

  const setView = v => { setViewRaw(v); onViewChange&&onViewChange(v); };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cl,we,reqs] = await Promise.all([
        apiCall("/clubs"),
        apiCall("/admin/week-events"),
        apiCall("/admin/club-requests"),
      ]);
      setClubs(cl); setWeekEvents(we); setPendingRequests(reqs);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ loadAll(); },[]);

  const delClub = async id => {
    if (!confirm("Delete this club and ALL its data?")) return;
    try {
      await apiCall(`/clubs/${id}`,"DELETE");
      setToast({msg:"Club deleted",type:"success"}); loadAll();
    } catch(e) { setToast({msg:e.message,type:"error"}); }
  };

  const approveRequest = async id => {
    try {
      await apiCall(`/admin/club-requests/${id}/approve`,"POST");
      setToast({msg:"Club approved and created!",type:"success"}); loadAll();
    } catch(e) { setToast({msg:e.message,type:"error"}); }
  };

  const rejectRequest = async id => {
    if (!confirm("Reject this club request?")) return;
    try {
      await apiCall(`/admin/club-requests/${id}/reject`,"POST");
      setToast({msg:"Request rejected",type:"success"}); loadAll();
    } catch(e) { setToast({msg:e.message,type:"error"}); }
  };

  const navItems = [
    {key:"dashboard",    label:"Dashboard",      icon:"📊"},
    {key:"clubs",        label:"Clubs",           icon:"🏛️"},
    {key:"requests",     label:"Club Requests",   icon:"📋", badge:pendingRequests.length},
    {key:"users",        label:"Users & Roles",   icon:"👤"},
    {key:"generalEvents",label:"General Events",  icon:"📅"},
  ];

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      {membersClub&&<ClubMembersModal club={membersClub} onClose={()=>setMembersClub(null)}/>}
      {assignModal&&<AssignModeratorModal club={assignModal} onClose={()=>setAssignModal(null)} onAssigned={()=>{setAssignModal(null);loadAll();setToast({msg:"Moderator assigned!",type:"success"});}}/>}

      {/* Nav */}
      <nav style={{background:"rgba(248,247,244,.93)",backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${C.border}`,padding:"0 48px",height:64,display:"flex",
          alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.55rem",fontWeight:900,
            color:C.ink,display:"flex",alignItems:"center",gap:10}}>
          <span style={{opacity:.45,fontSize:"1rem",fontWeight:400}}>ClubVerse</span>
          <span style={{opacity:.3}}>/</span>
          <span style={{color:C.accent}}>Admin</span>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onBack}
            style={pBtn("ghost",{background:C.accentBg,color:C.accent,borderColor:C.accent})}>
            ⌂ Home
          </button>
          <button onClick={()=>{logout();onBack();}}
            style={pBtn("ghost",{background:C.accentBg,color:C.accent,borderColor:C.accent})}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{display:"flex",minHeight:"calc(100vh - 64px)"}}>

        {/* Sidebar */}
        <div style={{width:220,background:C.surface,borderRight:`1px solid ${C.border}`,
            padding:"24px 0",flexShrink:0,position:"sticky",top:64,
            height:"calc(100vh - 64px)",overflowY:"auto"}}>
          {navItems.map(n=>(
            <button key={n.key} onClick={()=>setView(n.key)}
              style={{width:"100%",textAlign:"left",
                background:view===n.key?C.accentBg:"none",
                border:"none",
                borderLeft:view===n.key?`3px solid ${C.accent}`:"3px solid transparent",
                color:view===n.key?C.accent:C.muted,
                padding:"11px 20px",cursor:"pointer",fontSize:".86rem",
                fontWeight:view===n.key?700:400,
                display:"flex",alignItems:"center",gap:10}}>
              <span>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.badge>0&&(
                <span style={{background:"#dc2626",color:"#fff",borderRadius:"50%",
                    minWidth:20,height:20,display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:".68rem",fontWeight:700}}>
                  {n.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{flex:1,padding:"36px 48px",overflowY:"auto"}}>

          {/* ── DASHBOARD ── */}
          {view==="dashboard"&&(
            <>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"2rem",fontWeight:700,marginBottom:4}}>
                Admin Dashboard
              </h1>
              <p style={{color:C.muted,fontSize:".88rem",marginBottom:28}}>
                Overview of ClubVerse activity.
              </p>

              {/* Stats */}
              {!loading&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:14,marginBottom:36}}>
                  {[
                    ["🏛️","Total Clubs",clubs.length],
                    ["📅","This Week",weekEvents.length],
                  ].map(([icon,label,val])=>(
                    <div key={label} style={cardStyle({textAlign:"center",padding:24})}>
                      <div style={{fontSize:"2rem",marginBottom:8}}>{icon}</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:"2rem",
                          fontWeight:900,lineHeight:1}}>{val}</div>
                      <div style={{fontSize:".78rem",color:C.muted,marginTop:6}}>{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* This week's events */}
              <div style={cardStyle()}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",
                    fontWeight:700,marginBottom:18}}>
                  📅 Events This Week
                </h2>
                {loading?(
                  <div style={{color:C.muted,padding:"24px 0",textAlign:"center"}}>Loading…</div>
                ):weekEvents.length===0?(
                  <div style={{textAlign:"center",padding:"32px 0",color:C.muted}}>
                    <div style={{fontSize:"2rem",marginBottom:8}}>🗓️</div>
                    No events scheduled this week.
                  </div>
                ):weekEvents.map(ev=>{
                  const d = new Date(ev.event_date);
                  const thumb = ev.thumbnail_url?`${API}${ev.thumbnail_url}`:null;
                  const isGeneral = !ev.club_id;
                  return (
                    <div key={`${isGeneral?"g":"c"}${ev.id}`}
                      style={{display:"flex",alignItems:"center",gap:14,
                        padding:"12px 0",borderBottom:`1px solid ${C.border}`,
                        cursor:"pointer"}}
                      onClick={()=>onEventClick&&onEventClick(ev)}>
                      {/* Date badge */}
                      <div style={{width:48,flexShrink:0,background:C.ink,borderRadius:10,
                          padding:"8px 0",textAlign:"center"}}>
                        <div style={{color:"#fff",fontFamily:"'Playfair Display',serif",
                            fontSize:"1.2rem",fontWeight:900,lineHeight:1}}>{d.getDate()}</div>
                        <div style={{color:"#aaa",fontSize:".58rem",letterSpacing:1}}>
                          {MON_S[d.getMonth()].toUpperCase()}
                        </div>
                      </div>
                      {thumb&&<img src={thumb} alt="" style={{width:44,height:44,
                        borderRadius:8,objectFit:"cover",flexShrink:0}}/>}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:".9rem",whiteSpace:"nowrap",
                            overflow:"hidden",textOverflow:"ellipsis"}}>{ev.title}</div>
                        <div style={{fontSize:".74rem",marginTop:2,display:"flex",
                            gap:8,alignItems:"center",flexWrap:"wrap"}}>
                          <span style={{color:C.accent,fontWeight:600}}>{ev.club_name}</span>
                          {ev.event_time&&<span style={{color:C.muted}}>⏰ {ev.event_time}</span>}
                          {ev.location&&<span style={{color:C.muted}}>📍 {ev.location}</span>}
                          {isGeneral&&(
                            <span style={{background:C.accentBg,color:C.accent,borderRadius:6,
                                padding:"1px 8px",fontSize:".67rem",fontWeight:600}}>
                              College Event
                            </span>
                          )}
                        </div>
                      </div>
                      {/* View Club button — only for club events */}
                      {!isGeneral&&ev.club_id&&(
                        <button
                          onClick={e=>{
                            e.stopPropagation();
                            onEventClick&&onEventClick({...ev,_openClub:true});
                          }}
                          style={pBtn("ghost",{padding:"5px 12px",fontSize:".76rem",
                            color:C.accent,borderColor:C.accent,flexShrink:0})}>
                          View Club →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── CLUBS ── */}
          {view==="clubs"&&(
            <>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.7rem",fontWeight:700,marginBottom:6}}>
                Clubs
              </h2>
              <p style={{color:C.muted,fontSize:".86rem",marginBottom:24}}>
                {clubs.length} club{clubs.length!==1?"s":""} registered.
              </p>
              {clubs.length===0?(
                <div style={{textAlign:"center",padding:"80px 0"}}>
                  <div style={{fontSize:"3rem",marginBottom:16}}>🏛️</div>
                  <h3 style={{color:C.muted,fontWeight:600}}>No clubs yet</h3>
                  <p style={{color:C.muted,fontSize:".86rem",marginTop:8}}>
                    Approve club requests from moderators to create clubs.
                  </p>
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
                  {clubs.map(cl=>{
                    const icon = cl.icon_url?`${API}${cl.icon_url}`:null;
                    return (
                      <div key={cl.id} style={{...cardStyle(),cursor:"pointer",transition:"all .2s"}}
                        onClick={()=>onClubClick&&onClubClick(cl.id)}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.boxShadow="0 6px 24px rgba(30,58,138,.12)";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                          {icon
                            ?<img src={icon} alt="" style={{width:48,height:48,borderRadius:12,objectFit:"cover"}}/>
                            :<div style={{width:48,height:48,borderRadius:12,background:C.surface2,
                                display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem"}}>🏛️</div>
                          }
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:700,fontSize:".96rem"}}>{cl.name}</div>
                            <div style={{fontSize:".74rem",color:C.muted}}>{cl.department}</div>
                          </div>
                          <span style={{fontSize:".72rem",color:C.accent,fontWeight:600,flexShrink:0}}>View →</span>
                        </div>
                        {/* Moderator info */}
                        {cl.moderator ? (
                          <div style={{background:C.accentBg,border:`1px solid rgba(30,58,138,.15)`,
                              borderRadius:10,padding:"8px 12px",marginBottom:12,
                              display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:".8rem"}}>👤</span>
                            <div>
                              <div style={{fontSize:".78rem",fontWeight:600,color:C.accent}}>
                                {cl.moderator.name}
                              </div>
                              <div style={{fontSize:".72rem",color:C.muted}}>{cl.moderator.email}</div>
                            </div>
                          </div>
                        ) : (
                          <div style={{background:"#fff7ed",border:"1px solid #fed7aa",
                              borderRadius:10,padding:"8px 12px",marginBottom:12,
                              display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                            <span style={{fontSize:".76rem",color:"#92400e",fontWeight:500}}>⚠️ No moderator assigned</span>
                            <button
                              onClick={e=>{e.stopPropagation();setAssignModal(cl);}}
                              style={pBtn("ghost",{padding:"4px 12px",fontSize:".72rem",
                                color:C.accent,borderColor:C.accent,background:C.accentBg})}>
                              Assign →
                            </button>
                          </div>
                        )}
                        <p style={{fontSize:".8rem",color:C.muted,lineHeight:1.6,marginBottom:16}}>
                          {(cl.description||"").slice(0,80)}{(cl.description||"").length>80?"…":""}
                        </p>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}
                          onClick={e=>e.stopPropagation()}>
                          <button onClick={e=>{e.stopPropagation();setMembersClub(cl);}}
                            style={pBtn("ghost",{padding:"6px 14px",fontSize:".78rem",
                              color:C.accent,borderColor:C.accent})}>
                            👥 View Members
                          </button>
                          <button onClick={e=>{e.stopPropagation();delClub(cl.id);}}
                            style={pBtn("danger",{padding:"6px 14px",fontSize:".78rem"})}>
                            🗑️ Delete Club
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── CLUB REQUESTS ── */}
          {view==="requests"&&(
            <>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.7rem",fontWeight:700,marginBottom:6}}>
                Club Requests
              </h2>
              <p style={{color:C.muted,fontSize:".86rem",marginBottom:24}}>
                Moderators submit these requests to create their club. Review and approve or reject.
              </p>
              {pendingRequests.length===0?(
                <div style={{textAlign:"center",padding:"80px 0",color:C.muted}}>
                  <div style={{fontSize:"3rem",marginBottom:12}}>📋</div>
                  <p>No pending club requests.</p>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  {pendingRequests.map(req=>{
                    const icon = req.icon_url?`${API}${req.icon_url}`:null;
                    return (
                      <div key={req.id} style={cardStyle()}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                          {/* Club preview */}
                          <div style={{display:"flex",gap:14,alignItems:"center",flex:1,minWidth:240}}>
                            {icon
                              ?<img src={icon} alt="" style={{width:56,height:56,borderRadius:12,objectFit:"cover",flexShrink:0}}/>
                              :<div style={{width:56,height:56,borderRadius:12,background:C.surface2,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  fontSize:"1.8rem",flexShrink:0}}>🏛️</div>
                            }
                            <div>
                              <div style={{fontWeight:700,fontSize:"1rem",marginBottom:2}}>{req.name}</div>
                              <div style={{fontSize:".76rem",color:C.muted,marginBottom:4}}>{req.department}</div>
                              {(req.tags||[]).length>0&&(
                                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                                  {req.tags.map(t=>(
                                    <span key={t} style={{background:C.surface2,color:C.muted,
                                        borderRadius:6,padding:"1px 8px",fontSize:".68rem"}}>{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Moderator info */}
                          <div style={{background:C.accentBg,borderRadius:12,padding:"12px 16px",minWidth:200}}>
                            <div style={{fontSize:".68rem",textTransform:"uppercase",letterSpacing:"1px",
                                color:C.accent,fontWeight:600,marginBottom:6}}>Requested by</div>
                            <div style={{fontWeight:700,fontSize:".9rem"}}>{req.moderator_name}</div>
                            <div style={{fontSize:".76rem",color:C.muted}}>{req.moderator_email}</div>
                            <div style={{fontSize:".72rem",color:C.muted,marginTop:4}}>
                              {new Date(req.created).toLocaleDateString("en-GB",
                                {day:"numeric",month:"short",year:"numeric"})}
                            </div>
                          </div>
                        </div>
                        {req.description&&(
                          <p style={{fontSize:".84rem",color:C.muted,lineHeight:1.6,
                              margin:"14px 0 0",paddingTop:14,borderTop:`1px solid ${C.border}`}}>
                            {req.description}
                          </p>
                        )}
                        <div style={{display:"flex",gap:10,marginTop:16,paddingTop:14,
                            borderTop:`1px solid ${C.border}`}}>
                          <button onClick={()=>approveRequest(req.id)}
                            style={pBtn("accent",{padding:"8px 22px"})}>
                            ✓ Approve & Create Club
                          </button>
                          <button onClick={()=>rejectRequest(req.id)}
                            style={pBtn("danger",{padding:"8px 22px"})}>
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── USERS & ROLES ── */}
          {view==="users"&&(
            <>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.7rem",fontWeight:700,marginBottom:6}}>
                Users & Roles
              </h2>
              <p style={{color:C.muted,fontSize:".86rem",marginBottom:24}}>
                Search users, assign moderator roles, and manage accounts.
              </p>
              <UserManager clubs={clubs} onUsersChanged={loadAll}/>
            </>
          )}

          {/* ── GENERAL EVENTS ── */}
          {view==="generalEvents"&&<GeneralEventsManager/>}
        </div>
      </div>
    </div>
  );
}
