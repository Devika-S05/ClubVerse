import { useState, useEffect } from "react";
import { apiCall, useAuth } from "../context/AuthContext";

const API = "http://localhost:8000";
const DEPTS = ["General","Computer Science","Electronics","Mechanical","Civil","Arts & Humanities","Business"];

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
  ...(v==="danger"&&{background:C.redBg,color:C.red,border:`1px solid ${C.red}`}),
  ...(v==="ghost"&&{background:"none",color:C.muted,border:`1px solid ${C.border}`}),
  ...ex
});
const cardStyle = (ex={}) => ({
  background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:24,...ex
});

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t=setTimeout(onDone,3000); return()=>clearTimeout(t); },[]);
  return (
    <div style={{position:"fixed",bottom:28,right:28,zIndex:999,
        background:type==="error"?C.redBg:C.greenBg,
        border:`1px solid ${type==="error"?C.red:C.green}`,
        color:type==="error"?C.red:C.green,
        borderRadius:12,padding:"14px 22px",fontWeight:600,fontSize:".88rem",
        boxShadow:"0 8px 32px rgba(0,0,0,.12)",maxWidth:340}}>
      {type==="error"?"⚠️ ":"✅ "}{msg}
    </div>
  );
}

function CoordFields({ coords, onChange }) {
  const add = () => onChange([...coords,{name:"",position:"",email:"",phone:""}]);
  const upd = (i,k,v) => { const a=[...coords]; a[i]={...a[i],[k]:v}; onChange(a); };
  const del = i => onChange(coords.filter((_,j)=>j!==i));
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <label style={lbl()}>Coordinators</label>
        <button type="button" onClick={add} style={pBtn("ghost",{padding:"4px 12px",fontSize:".76rem"})}>+ Add</button>
      </div>
      {coords.map((co,i)=>(
        <div key={i} style={{background:C.surface2,borderRadius:12,padding:14,marginBottom:10,position:"relative"}}>
          <button type="button" onClick={()=>del(i)}
            style={{position:"absolute",top:8,right:8,...pBtn("ghost",{padding:"2px 8px",fontSize:".7rem"})}}>✕</button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["name","Name *"],["position","Role"],["email","Email"],["phone","Phone"]].map(([k,pl])=>(
              <input key={k} placeholder={pl} value={co[k]||""} onChange={e=>upd(i,k,e.target.value)}
                style={inp({marginBottom:0})}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventForm({ clubId=null, event, onSaved, onCancel }) {
  const isEdit = !!event;
  const isGeneral = !clubId;
  const today = new Date().toISOString().slice(0,10);
  const [form,setForm] = useState({
    title:event?.title||"", description:event?.description||"",
    event_date:event?.event_date||"", event_time:event?.event_time||"",
    location:event?.location||"",
    registration_link:event?.registration_link||"",
    volunteer_link:event?.volunteer_link||"",
    existing_thumbnail_url:event?.thumbnail_url||"",
  });
  const [coords,setCoords] = useState(event?.coordinators||[]);
  const [thumb,setThumb] = useState(null);
  // Multi-photo state for past events
  const [newPhotos,setNewPhotos]      = useState([]);   // File[] staged to upload
  const [existingPhotos,setExistingPhotos] = useState( // {id, photo_url}[] from DB
    event?.photos?.length ? event.photos :
    event?.picture_url   ? [{id:null, photo_url:event.picture_url}] : []
  );

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
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const isPast = form.event_date && form.event_date < today;

  const submit = async e => {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v])=>{ if(v) fd.append(k,v); });
      if (!isGeneral) fd.append("coordinators",JSON.stringify(coords));
      if (thumb) fd.append("thumbnail",thumb);
      // Append each new gallery photo
      newPhotos.forEach(f => fd.append("photos",f));
      const token = localStorage.getItem("cv_token");
      let url;
      if (isGeneral) url = isEdit?`${API}/api/general-events/${event.id}`:`${API}/api/general-events`;
      else url = isEdit?`${API}/api/events/${event.id}`:`${API}/api/clubs/${clubId}/events`;
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
          <input type="url" style={inp({marginBottom:0})} placeholder="https://forms.google.com/volunteer-form…"
            value={form.volunteer_link} onChange={e=>setForm({...form,volunteer_link:e.target.value})}/>
        </div>

        {/* ── Thumbnail — always available ── */}
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl()}>Thumbnail / Icon</label>
          {form.existing_thumbnail_url&&!thumb&&(
            <img src={`${API}${form.existing_thumbnail_url}`} alt=""
              style={{width:64,height:64,objectFit:"cover",borderRadius:10,marginBottom:8,display:"block"}}/>
          )}
          <input type="file" accept="image/*" style={inp()} onChange={e=>setThumb(e.target.files[0]||null)}/>
        </div>

        {/* ── Event Gallery Photos — only for past events ── */}
        {isPast ? (
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl()}>
              Event Gallery Photos
              <span style={{color:C.accent,textTransform:"none",marginLeft:6,fontWeight:400}}>
                (past event — shown when users click the card)
              </span>
            </label>
            {/* Show existing saved photos with delete button */}
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
            {/* Preview newly staged photos */}
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
      {!isGeneral&&<CoordFields coords={coords} onChange={setCoords}/>}
      {error&&<p style={{color:C.red,fontSize:".82rem",marginTop:8}}>{error}</p>}
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

function ExecomManager({ clubId }) {
  const [members,setMembers] = useState([]);
  const [showForm,setShowForm] = useState(false);
  const [editM,setEditM] = useState(null);
  const [form,setForm] = useState({name:"",position:"",email:"",phone:"",linkedin:""});
  const [toast,setToast] = useState(null);

  const load = async () => {
    const cl = await apiCall(`/clubs/${clubId}`);
    setMembers(cl.execom||[]);
  };
  useEffect(()=>{ load(); },[clubId]);

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      if (editM) await apiCall(`/execom/${editM.id}`,"PUT",form);
      else await apiCall(`/clubs/${clubId}/execom`,"POST",form);
      setShowForm(false); setEditM(null); await load();
      setToast({msg:"Saved!",type:"success"});
    } catch(e) { alert(e.message); }
  };

  const del = async id => {
    if (!confirm("Remove this member?")) return;
    await apiCall(`/execom/${id}`,"DELETE");
    await load(); setToast({msg:"Removed",type:"success"});
  };

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.25rem",fontWeight:700}}>ExeCom Members</h3>
        <button onClick={()=>{setForm({name:"",position:"",email:"",phone:"",linkedin:""});setEditM(null);setShowForm(true);}} style={pBtn("accent")}>+ Add Member</button>
      </div>
      {showForm&&(
        <div style={cardStyle({marginBottom:16,background:C.surface2})}>
          <h4 style={{fontWeight:700,marginBottom:14}}>{editM?"Edit Member":"New Member"}</h4>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["name","Name *"],["position","Role"],["email","Email"],["phone","Phone"]].map(([k,pl])=>(
              <input key={k} placeholder={pl} value={form[k]||""}
                onChange={e=>setForm({...form,[k]:e.target.value})} style={inp({marginBottom:0})}/>
            ))}
           {/*
            <div style={{gridColumn:"1/-1"}}>
              <input placeholder="LinkedIn URL" value={form.linkedin||""}
                onChange={e=>setForm({...form,linkedin:e.target.value})} style={inp({marginBottom:0})}/>
            </div>*/}
          </div>
          <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end"}}>
            <button onClick={()=>{setShowForm(false);setEditM(null);}} style={pBtn("ghost")}>Cancel</button>
            <button onClick={save} style={pBtn("primary")}>Save Member</button>
          </div>
        </div>
      )}
      {members.length===0
        ?<p style={{color:C.muted,fontSize:".86rem"}}>No members yet.</p>
        :members.map(m=>(
          <div key={m.id} style={{background:C.surface,border:`1.5px solid ${C.border}`,
              borderRadius:12,padding:"12px 16px",display:"flex",
              alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <span style={{fontWeight:600}}>{m.name}</span>
              {m.position&&<span style={{color:C.accent,fontSize:".8rem",marginLeft:8}}>{m.position}</span>}
              {m.email&&<span style={{color:C.muted,fontSize:".76rem",marginLeft:8}}>{m.email}</span>}
              {m.phone&&<span style={{color:C.muted,fontSize:".76rem",marginLeft:8}}>{m.phone}</span>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setForm({...m});setEditM(m);setShowForm(true);}} style={pBtn("ghost",{padding:"5px 10px"})}>Edit</button>
              <button onClick={()=>del(m.id)} style={pBtn("danger",{padding:"5px 10px"})}>✕</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

function ClubForm({ club, onSaved, onCancel }) {
  const isEdit = !!club;
  const today = new Date().toISOString().slice(0,10);
  const [form,setForm] = useState({
    name:club?.name||"", description:club?.description||"",
    department:club?.department||"General",
    tags:(club?.tags||[]).join(", "),
    email:club?.email||"",
    existing_icon_url:club?.icon_url||"",
  });
  const [icon,setIcon] = useState(null);
  const [events,setEvents] = useState([]);
  const [showEF,setShowEF] = useState(false);
  const [editEv,setEditEv] = useState(null);
  const [recs,setRecs]         = useState([]);
  const [showRF,setShowRF]     = useState(false);
  const [recForm,setRecForm]   = useState({title:"",description:"",last_date:"",venue:"",time:"",registration_link:""});
  const [editRec,setEditRec]   = useState(null);
  const [savedId,setSavedId] = useState(club?.id||null);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [toast,setToast] = useState(null);

  useEffect(()=>{ if(savedId) loadEvs(); },[savedId]);

  const loadEvs = async () => {
    const cl = await apiCall(`/clubs/${savedId}`);
    setEvents(cl.events||[]);
    setRecs(cl.recruitments||[]);
  };

  const saveClub = async e => {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name",form.name);
      fd.append("description",form.description);
      fd.append("department",form.department);
      fd.append("tags",JSON.stringify(form.tags.split(",").map(t=>t.trim()).filter(Boolean)));
      fd.append("email",form.email);
      if (form.existing_icon_url) fd.append("existing_icon_url",form.existing_icon_url);
      if (icon) fd.append("icon",icon);
      const token = localStorage.getItem("cv_token");
      const url = isEdit?`${API}/api/clubs/${club.id}`:`${API}/api/clubs`;
      const res = await fetch(url,{method:isEdit?"PUT":"POST",
        headers:{Authorization:`Bearer ${token}`},body:fd});
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const id = isEdit?club.id:data.data.id;
      setSavedId(id);
      setToast({msg:isEdit?"Club updated!":"Club created! Add events below.",type:"success"});
    } catch(e) { setError(e.message||"Save failed"); }
    finally { setSaving(false); }
  };

  const delEv = async id => {
    if (!confirm("Delete this event?")) return;
    await apiCall(`/events/${id}`,"DELETE");
    await loadEvs();
    setToast({msg:"Event deleted",type:"success"});
  };

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <form onSubmit={saveClub}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl()}>Club Name *</label>
            <input required style={inp()} placeholder="e.g. Robotics Club"
              value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          </div>
          <div>
            <label style={lbl()}>Department</label>
            <select style={inp()} value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>
              {DEPTS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl()}>Tags (comma-separated)</label>
            <input style={inp()} placeholder="robotics, IoT, hardware"
              value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/>
          </div>
          <div>
            <label style={lbl()}>Contact Email</label>
            <input style={inp()} placeholder="club@gectcr.ac.in" type="email"
              value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl()}>Description</label>
            <textarea style={inp({height:88,resize:"vertical"})} placeholder="About this club…"
              value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
          </div>
          
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl()}>Club Icon / Logo</label>
            {form.existing_icon_url&&!icon&&(
              <img src={`${API}${form.existing_icon_url}`} alt="" style={{width:64,height:64,objectFit:"cover",borderRadius:12,marginBottom:8,display:"block"}}/>
            )}
            <input type="file" accept="image/*" style={inp()} onChange={e=>setIcon(e.target.files[0]||null)}/>
          </div>
        </div>
        {error&&<p style={{color:C.red,fontSize:".82rem"}}>{error}</p>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
          <button type="button" onClick={onCancel} style={pBtn("ghost")}>Cancel</button>
          <button type="submit" disabled={saving} style={pBtn("primary")}>
            {saving?"Saving…":isEdit?"Update Club":"Save & Continue →"}
          </button>
          {savedId&&<button type="button" onClick={onSaved} style={pBtn("ghost")}>← Back to List</button>}
        </div>
      </form>

      {savedId&&(
        <div style={{marginTop:36,paddingTop:28,borderTop:`1.5px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",fontWeight:700}}>Club Events</h3>
            {!showEF&&!editEv&&(
              <button onClick={()=>{setShowEF(true);setEditEv(null);}} style={pBtn("accent")}>+ Add Event</button>
            )}
          </div>
          {(showEF||editEv)&&(
            <div style={cardStyle({marginBottom:20,background:C.surface2})}>
              <h4 style={{fontWeight:700,marginBottom:16}}>{editEv?"Edit Event":"New Event"}</h4>
              <EventForm
                clubId={savedId} event={editEv}
                onSaved={async()=>{setShowEF(false);setEditEv(null);await loadEvs();setToast({msg:"Event saved!",type:"success"});}}
                onCancel={()=>{setShowEF(false);setEditEv(null);}}
              />
            </div>
          )}
          {events.length===0
            ?<p style={{color:C.muted,fontSize:".86rem"}}>No events yet.</p>
            :events.map(ev=>(
              <div key={ev.id} style={{background:C.surface,border:`1.5px solid ${C.border}`,
                  borderRadius:14,padding:"14px 18px",display:"flex",
                  alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:12}}>
                <div style={{display:"flex",gap:12,alignItems:"center",minWidth:0}}>
                  {ev.thumbnail_url&&(
                    <img src={`${API}${ev.thumbnail_url}`} alt="" style={{width:40,height:40,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
                  )}
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:".9rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ev.title}</div>
                    <div style={{fontSize:".74rem",color:C.muted}}>
                      {ev.event_date}{ev.event_time&&` · ${ev.event_time}`}
                      {ev.event_date<today
                        ?<span style={{marginLeft:8,background:C.surface2,color:C.muted,borderRadius:6,padding:"1px 7px",fontSize:".67rem",fontWeight:600}}>Past</span>
                        :<span style={{marginLeft:8,background:C.greenBg,color:C.green,borderRadius:6,padding:"1px 7px",fontSize:".67rem",fontWeight:600}}>Upcoming</span>
                      }
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button onClick={()=>{setEditEv(ev);setShowEF(false);}} style={pBtn("ghost",{padding:"6px 12px"})}>Edit</button>
                  <button onClick={()=>delEv(ev.id)} style={pBtn("danger",{padding:"6px 12px"})}>Delete</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── RECRUITMENTS ── */}
      {savedId&&(
        <div style={{marginTop:36,paddingTop:28,borderTop:`1.5px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",fontWeight:700}}>
              Enrollments
            </h3>
            {!showRF&&!editRec&&(
              <button onClick={()=>{setShowRF(true);setEditRec(null);
                setRecForm({title:"",description:"",last_date:"",registration_link:""}); }}
                style={pBtn("accent")}>+ Add Enrollment</button>
            )}
          </div>

          {(showRF||editRec)&&(
            <div style={cardStyle({marginBottom:20,background:C.surface2})}>
              <h4 style={{fontWeight:700,marginBottom:16}}>{editRec?"Edit Enrollment":"New Enrollment"}</h4>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl()}>Title *</label>
                  <input required style={inp()} 
                    value={recForm.title} onChange={e=>setRecForm({...recForm,title:e.target.value})}/>
                </div>
                <div>
                  <label style={lbl()}>Last Date to Apply *</label>
                  <input type="date" required style={inp()}
                    value={recForm.last_date} onChange={e=>setRecForm({...recForm,last_date:e.target.value})}/>
                </div>
                <div>
                  <label style={lbl()}>Venue</label>
                  <input style={inp()} placeholder="e.g. Seminar Hall, Block A"
                    value={recForm.venue} onChange={e=>setRecForm({...recForm,venue:e.target.value})}/>
                </div>
                <div>
                  <label style={lbl()}>Time</label>
                  <input type="time" style={inp()}
                    value={recForm.time} onChange={e=>setRecForm({...recForm,time:e.target.value})}/>
                </div>
                <div>
                  <label style={lbl()}>Registration Link</label>
                  <input style={inp()} placeholder="https://forms.google.com/..."
                    value={recForm.registration_link} onChange={e=>setRecForm({...recForm,registration_link:e.target.value})}/>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl()}>Description</label>
                  <textarea style={inp({height:80,resize:"vertical"})} 
                    value={recForm.description} onChange={e=>setRecForm({...recForm,description:e.target.value})}/>
                </div>
              </div>
              <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
                <button onClick={()=>{setShowRF(false);setEditRec(null);}} style={pBtn("ghost")}>Cancel</button>
                <button onClick={async()=>{
                  if(!recForm.title||!recForm.last_date){setToast({msg:"Title and last date required",type:"error"});return;}
                  try {
                    if(editRec) await apiCall(`/recruitments/${editRec.id}`,"PUT",recForm);
                    else await apiCall(`/clubs/${savedId}/recruitments`,"POST",recForm);
                    setShowRF(false);setEditRec(null);await loadEvs();
                    setToast({msg:editRec?"Enrollment updated!":"Enrollment added!",type:"success"});
                  } catch(e){setToast({msg:e.message,type:"error"});}
                }} style={pBtn("primary")}>
                  {editRec?"Update":"Save"}
                </button>
              </div>
            </div>
          )}

          {recs.length===0
            ?<p style={{color:C.muted,fontSize:".86rem"}}>No enrollments yet.</p>
            :recs.map(r=>(
              <div key={r.id} style={{background:C.surface,border:`1.5px solid ${C.border}`,
                  borderRadius:14,padding:"14px 18px",marginBottom:10,
                  display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                <div>
                  <div style={{fontWeight:600,fontSize:".9rem",marginBottom:4}}>{r.title}</div>
                  <div style={{fontSize:".74rem",color:C.muted}}>
                    📅 Last date: {new Date(r.last_date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                    {r.is_active
                      ?<span style={{marginLeft:8,background:C.greenBg,color:C.green,borderRadius:6,padding:"1px 7px",fontSize:".67rem",fontWeight:600}}>Active</span>
                      :<span style={{marginLeft:8,background:C.surface2,color:C.muted,borderRadius:6,padding:"1px 7px",fontSize:".67rem",fontWeight:600}}>Closed</span>
                    }
                  </div>
                  {r.description&&<div style={{fontSize:".78rem",color:C.muted,marginTop:4}}>{r.description.slice(0,100)}{r.description.length>100?"…":""}</div>}
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button onClick={async()=>{
                    await apiCall(`/recruitments/${r.id}`,"PUT",{...r,is_active:r.is_active?0:1});
                    await loadEvs();
                  }} style={pBtn("ghost",{padding:"6px 12px",fontSize:".76rem"})}>
                    {r.is_active?"Close":"Reopen"}
                  </button>
                  <button onClick={()=>{setEditRec(r);setShowRF(false);
                    setRecForm({title:r.title,description:r.description||"",last_date:r.last_date,venue:r.venue||"",time:r.time||"",registration_link:r.registration_link||""}); }}
                    style={pBtn("ghost",{padding:"6px 12px"})}>Edit</button>
                  <button onClick={async()=>{
                    if(!confirm("Delete this recruitment?"))return;
                    await apiCall(`/recruitments/${r.id}`,"DELETE");
                    await loadEvs();
                    setToast({msg:"Deleted",type:"success"});
                  }} style={pBtn("danger",{padding:"6px 12px"})}>Delete</button>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ onBack }) {
  const { logout } = useAuth();
  const [clubs,setClubs] = useState([]);
  const [loading,setLoading] = useState(true);
  const [view,setView] = useState("list");
  const [active,setActive] = useState(null);
  const [toast,setToast] = useState(null);

  const loadClubs = async () => {
    try { setClubs(await apiCall("/clubs")); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ loadClubs(); },[]);

  const delClub = async id => {
    if (!confirm("Delete this club and ALL its data?")) return;
    await apiCall(`/clubs/${id}`,"DELETE");
    setToast({msg:"Club deleted",type:"success"});
    loadClubs();
  };

  const goList = () => { setView("list"); setActive(null); loadClubs(); };

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

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
          {view!=="list"&&(
            <button onClick={goList} style={pBtn("ghost",{background:C.accentBg,color:C.accent,borderColor:C.accent})}>
              ← Back
            </button>
          )}
          <button onClick={onBack} style={pBtn("ghost",{background:C.accentBg,color:C.accent,borderColor:C.accent})}>
            ⌂ Home
          </button>
          <button onClick={()=>{logout();onBack();}}
            style={pBtn("ghost",{background:C.accentBg,color:C.accent,borderColor:C.accent})}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{padding:"40px 48px"}}>

        {view==="list"&&(
          <>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:32}}>
              <div>
                <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"2rem",fontWeight:700,marginBottom:4}}>
                  Admin Dashboard
                </h1>
                <p style={{color:C.muted,fontSize:".88rem"}}>Manage clubs, events and committee members.</p>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setView("generalEvents")}
                  style={pBtn("ghost",{padding:"11px 22px",fontSize:".9rem"})}>
                  📅 General Events
                </button>
                <button onClick={()=>setView("addClub")} style={pBtn("primary",{padding:"11px 22px",fontSize:".9rem"})}>
                  + New Club
                </button>
              </div>
            </div>

            {loading?(
              <div style={{textAlign:"center",padding:"80px 0",color:C.muted}}>Loading…</div>
            ):clubs.length===0?(
              <div style={{textAlign:"center",padding:"80px 0"}}>
                <div style={{fontSize:"3rem",marginBottom:16}}>🏛️</div>
                <h3 style={{color:C.muted,marginBottom:12,fontWeight:600}}>No clubs yet</h3>
                <button onClick={()=>setView("addClub")} style={pBtn("primary")}>Create your first club</button>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
                {clubs.map(cl=>{
                  const icon = cl.icon_url?`${API}${cl.icon_url}`:null;
                  return (
                    <div key={cl.id} style={cardStyle()}>
                      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                        {icon
                          ?<img src={icon} alt="" style={{width:48,height:48,borderRadius:12,objectFit:"cover"}}/>
                          :<div style={{width:48,height:48,borderRadius:12,background:C.surface2,
                              display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem"}}>🏛️</div>
                        }
                        <div>
                          <div style={{fontWeight:700,fontSize:".96rem"}}>{cl.name}</div>
                          <div style={{fontSize:".74rem",color:C.muted}}>{cl.department}</div>
                        </div>
                      </div>
                      <p style={{fontSize:".8rem",color:C.muted,lineHeight:1.6,marginBottom:16}}>
                        {(cl.description||"").slice(0,80)}{(cl.description||"").length>80?"…":""}
                      </p>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <button onClick={()=>{setActive(cl);setView("editClub");}}
                          style={pBtn("ghost",{padding:"6px 14px",fontSize:".78rem"})}>✏️ Edit & Events</button>
                        <button onClick={()=>{setActive(cl);setView("execom");}}
                          style={pBtn("ghost",{padding:"6px 14px",fontSize:".78rem"})}>👥 ExeCom</button>
                        <button onClick={()=>delClub(cl.id)}
                          style={pBtn("danger",{padding:"6px 14px",fontSize:".78rem"})}>🗑️ Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {view==="generalEvents"&&<GeneralEventsManager/>}

        {view==="addClub"&&(
          <>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.7rem",fontWeight:700,marginBottom:6}}>Add New Club</h2>
            <p style={{color:C.muted,fontSize:".86rem",marginBottom:28}}>Fill in details, save, then add events.</p>
            <div style={cardStyle({maxWidth:780})}>
              <ClubForm onSaved={()=>{goList();setToast({msg:"Club saved!",type:"success"});}} onCancel={goList}/>
            </div>
          </>
        )}

        {view==="editClub"&&active&&(
          <>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.7rem",fontWeight:700,marginBottom:6}}>Edit: {active.name}</h2>
            <p style={{color:C.muted,fontSize:".86rem",marginBottom:28}}>Update club info and manage events.</p>
            <div style={cardStyle({maxWidth:780})}>
              <ClubForm club={active} onSaved={()=>{loadClubs();setToast({msg:"Changes saved!",type:"success"});}} onCancel={goList}/>
            </div>
          </>
        )}

        {view==="execom"&&active&&(
          <>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.7rem",fontWeight:700,marginBottom:6}}>{active.name} — ExeCom</h2>
            <p style={{color:C.muted,fontSize:".86rem",marginBottom:28}}>Manage committee members.</p>
            <div style={cardStyle({maxWidth:780})}>
              <ExecomManager clubId={active.id}/>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

