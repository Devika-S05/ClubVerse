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

function EventForm({ clubId, event, onSaved, onCancel }) {
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
  const [coords,setCoords] = useState(event?.coordinators||[]);
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
      fd.append("coordinators",JSON.stringify(coords));
      if (thumb) fd.append("thumbnail",thumb);
      newPhotos.forEach(f => fd.append("photos",f));
      const token = localStorage.getItem("cv_token");
      const url = isEdit ? `${API}/api/events/${event.id}` : `${API}/api/clubs/${clubId}/events`;
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

        {/* ── Event Gallery Photos — only for past events ── */}
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
      <CoordFields coords={coords} onChange={setCoords}/>
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

function MembersManager({ clubId, members, onReload }) {
  const [showForm,setShowForm] = useState(false);
  const [editM,setEditM] = useState(null);
  const [form,setForm] = useState({name:"",role:"",email:"",phone:""});
  const [toast,setToast] = useState(null);

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      if (editM) await apiCall(`/club-members/${editM.id}`,"PUT",form);
      else await apiCall(`/clubs/${clubId}/members`,"POST",form);
      setShowForm(false); setEditM(null);
      setForm({name:"",role:"",email:"",phone:""});
      onReload();
      setToast({msg:"Saved!",type:"success"});
    } catch(e) { alert(e.message); }
  };

  const del = async id => {
    if (!confirm("Remove this member?")) return;
    await apiCall(`/club-members/${id}`,"DELETE");
    onReload(); setToast({msg:"Removed",type:"success"});
  };

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.25rem",fontWeight:700}}>Club Members</h3>
        <button onClick={()=>{setForm({name:"",role:"",email:"",phone:""});setEditM(null);setShowForm(true);}}
          style={pBtn("accent")}>+ Add Member</button>
      </div>
      <p style={{fontSize:".82rem",color:C.muted,marginBottom:16}}>
        These members are visible only to you and the main admin — not to students.
      </p>
      {showForm&&(
        <div style={cardStyle({marginBottom:16,background:C.surface2})}>
          <h4 style={{fontWeight:700,marginBottom:14}}>{editM?"Edit Member":"New Member"}</h4>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["name","Name *"],["role","Role / Position"],["email","Email"],["phone","Phone"]].map(([k,pl])=>(
              <input key={k} placeholder={pl} value={form[k]||""}
                onChange={e=>setForm({...form,[k]:e.target.value})} style={inp({marginBottom:0})}/>
            ))}
          </div>
          <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end"}}>
            <button onClick={()=>{setShowForm(false);setEditM(null);}} style={pBtn("ghost")}>Cancel</button>
            <button onClick={save} style={pBtn("primary")}>Save Member</button>
          </div>
        </div>
      )}
      {members.length===0
        ? <p style={{color:C.muted,fontSize:".86rem"}}>No members added yet.</p>
        : members.map(m=>(
          <div key={m.id} style={{background:C.surface,border:`1.5px solid ${C.border}`,
              borderRadius:12,padding:"12px 16px",display:"flex",
              alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <span style={{fontWeight:600}}>{m.name}</span>
              {m.role&&<span style={{color:C.accent,fontSize:".8rem",marginLeft:8}}>{m.role}</span>}
              {m.email&&<span style={{color:C.muted,fontSize:".76rem",marginLeft:8}}>{m.email}</span>}
              {m.phone&&<span style={{color:C.muted,fontSize:".76rem",marginLeft:8}}>{m.phone}</span>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setForm({name:m.name,role:m.role||"",email:m.email||"",phone:m.phone||""});
                setEditM(m);setShowForm(true);}} style={pBtn("ghost",{padding:"5px 10px"})}>Edit</button>
              <button onClick={()=>del(m.id)} style={pBtn("danger",{padding:"5px 10px"})}>✕</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

const DEPTS = ["General","Computer Science","Electronics","Mechanical","Civil","Arts & Humanities","Business"];

function NoClubState({ onBack, onSubmitted }) {
  const [request,setRequest] = useState(null); // existing request if any
  const [loadingReq,setLoadingReq] = useState(true);
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState({name:"",description:"",department:"General",tags:"",email:""});
  const [icon,setIcon] = useState(null);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");

  useEffect(()=>{
    apiCall("/moderator/my-request")
      .then(r=>{ setRequest(r); if(!r||r.status==="rejected") setShowForm(true); })
      .catch(()=>setShowForm(true))
      .finally(()=>setLoadingReq(false));
  },[]);

  const submit = async e => {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name",form.name);
      fd.append("description",form.description);
      fd.append("department",form.department);
      fd.append("tags",JSON.stringify(form.tags.split(",").map(t=>t.trim()).filter(Boolean)));
      fd.append("email",form.email);
      if (icon) fd.append("icon",icon);
      const token = localStorage.getItem("cv_token");
      const res = await fetch(`${API}/api/moderator/request-club`,{
        method:"POST", headers:{Authorization:`Bearer ${token}`}, body:fd
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      // Reload to show pending state
      onSubmitted();
    } catch(e) { setError(e.message||"Submission failed"); }
    finally { setSaving(false); }
  };

  if (loadingReq) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
        fontFamily:"'Plus Jakarta Sans',sans-serif",color:C.muted}}>Loading…</div>
  );

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {/* Nav */}
      <nav style={{background:"rgba(248,247,244,.93)",backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${C.border}`,padding:"0 48px",height:64,display:"flex",
          alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.4rem",fontWeight:900}}>
          <span style={{opacity:.45,fontSize:"1rem",fontWeight:400}}>ClubVerse</span>
          <span style={{opacity:.3}}> / </span>
          <span style={{color:C.accent}}>Moderator</span>
        </div>
        <button onClick={onBack}
          style={pBtn("ghost",{background:C.accentBg,color:C.accent,borderColor:C.accent})}>
          ⌂ Home
        </button>
      </nav>

      <div style={{maxWidth:640,margin:"60px auto",padding:"0 24px"}}>

        {/* Pending state */}
        {request&&request.status==="pending"&&!showForm&&(
          <div style={{textAlign:"center",padding:"48px 0"}}>
            <div style={{fontSize:"3rem",marginBottom:16}}>⏳</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.8rem",fontWeight:700,marginBottom:8}}>
              Request Pending
            </h2>
            <p style={{color:C.muted,fontSize:".94rem",lineHeight:1.7,marginBottom:24}}>
              Your request to create <strong style={{color:C.ink}}>"{request.name}"</strong> has been submitted
              and is awaiting approval from the main admin. You'll be able to manage your club once it's approved.
            </p>
            <div style={{background:C.accentBg,border:`1.5px solid rgba(30,58,138,.2)`,
                borderRadius:16,padding:"20px 24px",textAlign:"left"}}>
              <div style={{fontSize:".72rem",textTransform:"uppercase",letterSpacing:"1px",
                  color:C.accent,fontWeight:600,marginBottom:10}}>Your Request</div>
              <div style={{fontWeight:700,fontSize:"1.1rem",marginBottom:4}}>{request.name}</div>
              <div style={{fontSize:".8rem",color:C.muted,marginBottom:4}}>{request.department}</div>
              {request.description&&(
                <div style={{fontSize:".84rem",color:C.muted,lineHeight:1.6}}>{request.description}</div>
              )}
            </div>
          </div>
        )}

        {/* Rejected state — show form again */}
        {request&&request.status==="rejected"&&showForm&&(
          <div style={{background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:14,
              padding:"16px 20px",marginBottom:24,display:"flex",gap:12,alignItems:"flex-start"}}>
            <span style={{fontSize:"1.2rem"}}>✗</span>
            <div>
              <div style={{fontWeight:600,color:"#dc2626",marginBottom:4}}>Request Rejected</div>
              <div style={{fontSize:".84rem",color:"#7f1d1d"}}>
                Your previous request for <strong>"{request.name}"</strong> was rejected.
                You can submit a new request below.
              </div>
            </div>
          </div>
        )}

        {/* Club request form */}
        {showForm&&(!request||request.status==="rejected")&&(
          <>
            <div style={{marginBottom:32}}>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"2rem",fontWeight:700,marginBottom:8}}>
                Create Your Club
              </h1>
              <p style={{color:C.muted,fontSize:".94rem",lineHeight:1.7}}>
                Fill in the details below. Your request will be sent to the main admin for approval.
                Once approved, your club will go live on ClubVerse.
              </p>
            </div>
            <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,padding:28}}>
              <form onSubmit={submit}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={lbl()}>Club Name *</label>
                    <input required style={inp()} placeholder="e.g. Robotics Club"
                      value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
                  </div>
                  <div>
                    <label style={lbl()}>Department</label>
                    <select style={inp()} value={form.department}
                      onChange={e=>setForm({...form,department:e.target.value})}>
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
                    <input type="email" style={inp()} placeholder="club@college.ac.in"
                      value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={lbl()}>Description</label>
                    <textarea style={inp({height:90,resize:"vertical"})}
                      placeholder="What is this club about? What do members do?"
                      value={form.description}
                      onChange={e=>setForm({...form,description:e.target.value})}/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={lbl()}>Club Icon / Logo</label>
                    {icon&&(
                      <img src={URL.createObjectURL(icon)} alt=""
                        style={{width:64,height:64,objectFit:"cover",borderRadius:12,
                          marginBottom:8,display:"block"}}/>
                    )}
                    <input type="file" accept="image/*" style={inp()}
                      onChange={e=>setIcon(e.target.files[0]||null)}/>
                  </div>
                </div>
                {error&&<p style={{color:"#dc2626",fontSize:".82rem",marginBottom:12}}>{error}</p>}
                <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
                  <button type="button" onClick={onBack} style={pBtn("ghost")}>← Go Home</button>
                  <button type="submit" disabled={saving} style={pBtn("accent",{padding:"10px 24px"})}>
                    {saving?"Submitting…":"Submit Request →"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const DEPTS_EDIT = ["General","Computer Science","Electronics","Mechanical","Civil","Arts & Humanities","Business"];

function EditClubForm({ club, onSaved }) {
  const [form,setForm] = useState({
    name:club?.name||"",
    description:club?.description||"",
    department:club?.department||"General",
    tags:(club?.tags||[]).join(", "),
    email:club?.email||"",
    existing_icon_url:club?.icon_url||"",
  });
  const [icon,setIcon] = useState(null);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");

  const submit = async e => {
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
      const res = await fetch(`${API}/api/clubs/${club.id}`,{
        method:"PUT", headers:{Authorization:`Bearer ${token}`}, body:fd
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSaved();
    } catch(e) { setError(e.message||"Update failed"); }
    finally { setSaving(false); }
  };

  const previewSrc = icon ? URL.createObjectURL(icon) : form.existing_icon_url ? `${API}${form.existing_icon_url}` : null;

  return (
    <div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",fontWeight:700,marginBottom:6}}>
        Edit Club
      </h2>
      <p style={{color:C.muted,fontSize:".86rem",marginBottom:24}}>
        Update your club's details. Changes go live immediately.
      </p>
      <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,padding:28,maxWidth:740}}>
        <form onSubmit={submit}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl()}>Club Name *</label>
              <input required style={inp()} value={form.name}
                onChange={e=>setForm({...form,name:e.target.value})}/>
            </div>
            <div>
              <label style={lbl()}>Department</label>
              <select style={inp()} value={form.department}
                onChange={e=>setForm({...form,department:e.target.value})}>
                {DEPTS_EDIT.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl()}>Tags (comma-separated)</label>
              <input style={inp()} placeholder="e.g. robotics, IoT, hardware"
                value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/>
            </div>
            <div>
              <label style={lbl()}>Contact Email</label>
              <input type="email" style={inp()} placeholder="club@college.ac.in"
                value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl()}>Description</label>
              <textarea style={inp({height:100,resize:"vertical"})}
                placeholder="What is this club about?"
                value={form.description}
                onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl()}>Club Icon / Logo</label>
              {previewSrc&&(
                <img src={previewSrc} alt=""
                  style={{width:64,height:64,objectFit:"cover",borderRadius:12,
                    marginBottom:8,display:"block"}}/>
              )}
              <input type="file" accept="image/*" style={inp()}
                onChange={e=>setIcon(e.target.files[0]||null)}/>
            </div>
          </div>
          {error&&<p style={{color:"#dc2626",fontSize:".82rem",marginBottom:12}}>{error}</p>}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
            <button type="submit" disabled={saving} style={pBtn("accent",{padding:"10px 28px"})}>
              {saving?"Saving…":"Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ModeratorDashboard({ onBack, onEventClick }) {
  const { logout } = useAuth();
  const [club,setClub] = useState(null);
  const [loading,setLoading] = useState(true);
  const [view,setView] = useState("overview"); // overview | events | execom | members | enrollments
  const [showEF,setShowEF] = useState(false);
  const [editEv,setEditEv] = useState(null);
  const [toast,setToast] = useState(null);
  const today = new Date().toISOString().slice(0,10);

  const load = async () => {
    try {
      const cl = await apiCall("/moderator/my-club");
      setClub(cl);
    } catch(e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[]);

  const delEv = async id => {
    if (!confirm("Delete this event?")) return;
    await apiCall(`/events/${id}`,"DELETE");
    await load(); setToast({msg:"Event deleted",type:"success"});
  };

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
        fontFamily:"'Plus Jakarta Sans',sans-serif",color:C.muted}}>Loading…</div>
  );

  if (!club) return (
    <NoClubState onBack={onBack} onSubmitted={load}/>
  );

  const upcoming = (club.events||[]).filter(e=>e.event_date>=today)
                    .sort((a,b)=>a.event_date.localeCompare(b.event_date));
  const past     = (club.events||[]).filter(e=>e.event_date<today)
                    .sort((a,b)=>b.event_date.localeCompare(a.event_date));
  const icon     = club.icon_url ? `${API}${club.icon_url}` : null;

  const navItems = [
    {key:"overview",   label:"Overview",    icon:"📊"},
    {key:"editClub",   label:"Edit Club",   icon:"✏️"},
    {key:"events",     label:"Events",      icon:"📅"},
    {key:"execom",     label:"ExeCom",      icon:"👥"},
    {key:"members",    label:"Members",     icon:"🧑‍🤝‍🧑"},
    {key:"enrollments",label:"Enrollments", icon:"🎯"},
  ];

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      {/* Nav */}
      <nav style={{background:"rgba(248,247,244,.93)",backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${C.border}`,padding:"0 48px",height:64,display:"flex",
          alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.4rem",fontWeight:900,
            color:C.ink,display:"flex",alignItems:"center",gap:10}}>
          <span style={{opacity:.45,fontSize:"1rem",fontWeight:400}}>ClubVerse</span>
          <span style={{opacity:.3}}>/</span>
          <span style={{color:C.accent}}>{club.name}</span>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onBack} style={pBtn("ghost",{background:C.accentBg,color:C.accent,borderColor:C.accent})}>
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
            padding:"24px 0",flexShrink:0,position:"sticky",top:64,height:"calc(100vh - 64px)"}}>
          {/* Club identity */}
          <div style={{padding:"0 20px 20px",borderBottom:`1px solid ${C.border}`,marginBottom:8}}>
            {icon
              ? <img src={icon} alt="" style={{width:44,height:44,borderRadius:10,objectFit:"cover",marginBottom:8}}/>
              : <div style={{width:44,height:44,borderRadius:10,background:C.surface2,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",marginBottom:8}}>🏛️</div>
            }
            <div style={{fontWeight:700,fontSize:".9rem"}}>{club.name}</div>
            <div style={{fontSize:".74rem",color:C.muted}}>{club.department}</div>
            <div style={{fontSize:".72rem",color:C.accent,marginTop:4}}>Moderator</div>
          </div>
          {navItems.map(n=>(
            <button key={n.key} onClick={()=>setView(n.key)}
              style={{width:"100%",textAlign:"left",background:view===n.key?C.accentBg:"none",
                border:"none",borderLeft:view===n.key?`3px solid ${C.accent}`:"3px solid transparent",
                color:view===n.key?C.accent:C.muted,padding:"11px 20px",cursor:"pointer",
                fontSize:".86rem",fontWeight:view===n.key?700:400,
                display:"flex",alignItems:"center",gap:10}}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{flex:1,padding:"36px 48px",overflowY:"auto"}}>

          {/* ── OVERVIEW ── */}
          {view==="overview" && (
            <>
              {/* Hero banner */}
              <div style={{
                background:`linear-gradient(135deg, ${C.accent} 0%, #1e40af 100%)`,
                borderRadius:20, padding:"32px 36px", marginBottom:28,
                display:"flex", alignItems:"center", gap:24, flexWrap:"wrap",
                boxShadow:"0 8px 32px rgba(30,58,138,.25)"
              }}>
                {icon
                  ? <img src={icon} alt="" style={{width:80,height:80,borderRadius:18,
                      objectFit:"cover",border:"3px solid rgba(255,255,255,.3)",flexShrink:0}}/>
                  : <div style={{width:80,height:80,borderRadius:18,
                      background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:"2.4rem",flexShrink:0}}>🏛️</div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:".68rem",textTransform:"uppercase",letterSpacing:"2px",
                      color:"rgba(255,255,255,.65)",fontWeight:600,marginBottom:6}}>YOUR CLUB</div>
                  <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"2rem",fontWeight:900,
                      color:"#fff",marginBottom:8,lineHeight:1.1}}>{club.name}</h1>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                    <span style={{background:"rgba(255,255,255,.2)",color:"#fff",borderRadius:20,
                        padding:"3px 14px",fontSize:".72rem",fontWeight:600}}>
                      {club.department}
                    </span>
                    {(club.tags||[]).map(t=>(
                      <span key={t} style={{background:"rgba(255,255,255,.12)",
                          color:"rgba(255,255,255,.85)",borderRadius:20,
                          padding:"3px 10px",fontSize:".68rem"}}>#{t}</span>
                    ))}
                  </div>
                  {club.description&&(
                    <p style={{color:"rgba(255,255,255,.72)",fontSize:".85rem",
                        lineHeight:1.55,margin:0,
                        overflow:"hidden",display:"-webkit-box",
                        WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                      {club.description}
                    </p>
                  )}
                </div>
                <button onClick={()=>setView("editClub")}
                  style={{background:"rgba(255,255,255,.18)",color:"#fff",
                    border:"1.5px solid rgba(255,255,255,.4)",borderRadius:12,
                    padding:"10px 22px",cursor:"pointer",fontWeight:600,fontSize:".85rem",
                    flexShrink:0,whiteSpace:"nowrap"}}>
                  ✏️ Edit Club
                </button>
              </div>

              {/* Stat cards — no icons, clean numbers */}
              <div style={{display:"grid",
                  gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",
                  gap:14,marginBottom:28}}>
                {[
                  ["Events",       (club.events||[]).length,  "#3b82f6","#eff6ff","#dbeafe"],
                  ["Upcoming",     upcoming.length,            "#16a34a","#f0fdf4","#bbf7d0"],
                  ["Past",         past.length,               "#6b7280","#f9fafb","#e5e7eb"],
                  ["ExeCom",       (club.execom||[]).length,  "#7c3aed","#f5f3ff","#ede9fe"],
                  ["Members",      (club.members||[]).length, "#0891b2","#ecfeff","#cffafe"],
                  ["Enrollments",  (club.recruitments||[]).length,"#b45309","#fffbeb","#fde68a"],
                ].map(([label,val,accent,bg,border])=>(
                  <div key={label} style={{
                    background:bg,
                    border:`1.5px solid ${border}`,
                    borderRadius:16,
                    padding:"20px 16px",
                    textAlign:"center",
                    boxShadow:"0 1px 4px rgba(0,0,0,.04)"
                  }}>
                    <div style={{
                      fontFamily:"'Playfair Display',serif",
                      fontSize:"2.2rem",fontWeight:900,
                      lineHeight:1,color:accent,marginBottom:6
                    }}>{val}</div>
                    <div style={{fontSize:".72rem",color:"#64748b",
                        fontWeight:500,letterSpacing:".3px"}}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Upcoming events quick list */}
              {upcoming.length > 0 && (
                <div style={{background:C.surface,border:`1.5px solid ${C.border}`,
                    borderRadius:16,padding:24,marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",
                      justifyContent:"space-between",marginBottom:18}}>
                    <h3 style={{fontFamily:"'Playfair Display',serif",
                        fontSize:"1.1rem",fontWeight:700}}>Upcoming Events</h3>
                    <button onClick={()=>setView("events")}
                      style={pBtn("ghost",{padding:"5px 14px",fontSize:".78rem",
                        color:C.accent,borderColor:C.accent})}>
                      View all →
                    </button>
                  </div>
                  {upcoming.slice(0,3).map((ev,i)=>(
                    <div key={ev.id} style={{
                      display:"flex",alignItems:"center",gap:14,
                      padding:"12px 0",
                      borderBottom:i<Math.min(upcoming.length,3)-1
                        ?`1px solid ${C.border}`:"none"
                    }}>
                      <div style={{
                        width:48,height:48,borderRadius:12,flexShrink:0,
                        background:`linear-gradient(135deg,${C.accent} 0%,#1e40af 100%)`,
                        display:"flex",flexDirection:"column",
                        alignItems:"center",justifyContent:"center"
                      }}>
                        <span style={{color:"#fff",fontFamily:"'Playfair Display',serif",
                            fontSize:"1.05rem",fontWeight:900,lineHeight:1}}>
                          {new Date(ev.event_date).getDate()}
                        </span>
                        <span style={{color:"rgba(255,255,255,.7)",fontSize:".52rem",
                            letterSpacing:1,marginTop:1}}>
                          {["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][new Date(ev.event_date).getMonth()]}
                        </span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:".9rem",marginBottom:2,
                            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {ev.title}
                        </div>
                        <div style={{fontSize:".74rem",color:C.muted,display:"flex",gap:10}}>
                          {ev.event_time&&<span>⏰ {ev.event_time}</span>}
                          {ev.location&&<span>📍 {ev.location}</span>}
                        </div>
                      </div>
                      <span style={{background:C.greenBg,color:C.green,borderRadius:8,
                          padding:"3px 10px",fontSize:".68rem",fontWeight:600,flexShrink:0}}>
                        Upcoming
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick links strip */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
                {[
                  {key:"events",     label:"Manage Events",     desc:"Add or edit club events"},
                  {key:"execom",     label:"ExeCom Members",    desc:"Manage your committee"},
                  {key:"enrollments",label:"Open Enrollments",  desc:"Post recruitment drives"},
                ].map(q=>(
                  <button key={q.key} onClick={()=>setView(q.key)}
                    style={{background:C.accentBg,border:`1.5px solid rgba(30,58,138,.15)`,
                      borderRadius:14,padding:"14px 16px",cursor:"pointer",textAlign:"left",
                      transition:"all .18s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background="#c7d9f8";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(30,58,138,.15)";e.currentTarget.style.background=C.accentBg;}}>
                    <div style={{fontWeight:700,fontSize:".88rem",color:C.accent,marginBottom:3}}>{q.label}</div>
                    <div style={{fontSize:".75rem",color:C.muted}}>{q.desc}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── EDIT CLUB ── */}
          {view==="editClub" && (
            <EditClubForm club={club} onSaved={async()=>{ await load(); setToast({msg:"Club updated!",type:"success"}); setView("overview"); }}/>
          )}

          {/* ── EVENTS ── */}
          {view==="events" && (
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",fontWeight:700}}>Club Events</h2>
                {!showEF&&!editEv&&(
                  <button onClick={()=>{setShowEF(true);setEditEv(null);}} style={pBtn("accent",{padding:"10px 22px"})}>
                    + Add Event
                  </button>
                )}
              </div>
              {(showEF||editEv)&&(
                <div style={cardStyle({marginBottom:24,background:C.surface2,maxWidth:780})}>
                  <h4 style={{fontWeight:700,marginBottom:16}}>{editEv?"Edit Event":"New Event"}</h4>
                  <EventForm
                    clubId={club.id} event={editEv}
                    onSaved={async()=>{setShowEF(false);setEditEv(null);await load();setToast({msg:"Event saved!",type:"success"});}}
                    onCancel={()=>{setShowEF(false);setEditEv(null);}}
                  />
                </div>
              )}
              {(club.events||[]).length===0
                ? <p style={{color:C.muted}}>No events yet. Click + Add Event to create one.</p>
                : (club.events||[]).map(ev=>(
                  <div key={ev.id} style={{background:C.surface,border:`1.5px solid ${C.border}`,
                      borderRadius:14,padding:"14px 18px",display:"flex",
                      alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:12}}>
                    <div style={{display:"flex",gap:12,alignItems:"center",minWidth:0}}>
                      {ev.thumbnail_url&&(
                        <img src={`${API}${ev.thumbnail_url}`} alt=""
                          style={{width:40,height:40,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
                      )}
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:".9rem",whiteSpace:"nowrap",
                            overflow:"hidden",textOverflow:"ellipsis"}}>{ev.title}</div>
                        <div style={{fontSize:".74rem",color:C.muted}}>
                          {ev.event_date}{ev.event_time&&` · ${ev.event_time}`}
                          {ev.event_date<today
                            ?<span style={{marginLeft:8,background:C.surface2,color:C.muted,borderRadius:6,
                                padding:"1px 7px",fontSize:".67rem",fontWeight:600}}>Past</span>
                            :<span style={{marginLeft:8,background:C.greenBg,color:C.green,borderRadius:6,
                                padding:"1px 7px",fontSize:".67rem",fontWeight:600}}>Upcoming</span>
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
            </>
          )}

          {/* ── EXECOM ── */}
          {view==="execom" && (
            <ExecomSection clubId={club.id} execom={club.execom||[]} onReload={load}/>
          )}

          {/* ── MEMBERS ── */}
          {view==="members" && (
            <MembersManager clubId={club.id} members={club.members||[]} onReload={load}/>
          )}

          {/* ── ENROLLMENTS ── */}
          {view==="enrollments" && (
            <EnrollmentsSection clubId={club.id} recs={club.recruitments||[]} onReload={load}/>
          )}
        </div>
      </div>
    </div>
  );
}

function ExecomSection({ clubId, execom, onReload }) {
  const [showForm,setShowForm] = useState(false);
  const [editM,setEditM] = useState(null);
  const [form,setForm] = useState({name:"",position:"",email:"",phone:"",linkedin:""});
  const [toast,setToast] = useState(null);

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      if (editM) await apiCall(`/execom/${editM.id}`,"PUT",form);
      else await apiCall(`/clubs/${clubId}/execom`,"POST",form);
      setShowForm(false); setEditM(null); onReload();
      setToast({msg:"Saved!",type:"success"});
    } catch(e) { alert(e.message); }
  };

  const del = async id => {
    if (!confirm("Remove this member?")) return;
    await apiCall(`/execom/${id}`,"DELETE");
    onReload(); setToast({msg:"Removed",type:"success"});
  };

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",fontWeight:700}}>ExeCom Members</h2>
        <button onClick={()=>{setForm({name:"",position:"",email:"",phone:"",linkedin:""});
          setEditM(null);setShowForm(true);}} style={pBtn("accent")}>+ Add Member</button>
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
      {execom.length===0
        ? <p style={{color:C.muted,fontSize:".86rem"}}>No ExeCom members yet.</p>
        : execom.map(m=>(
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
              <button onClick={()=>{setForm({...m});setEditM(m);setShowForm(true);}}
                style={pBtn("ghost",{padding:"5px 10px"})}>Edit</button>
              <button onClick={()=>del(m.id)} style={pBtn("danger",{padding:"5px 10px"})}>✕</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

function EnrollmentsSection({ clubId, recs, onReload }) {
  const [showRF,setShowRF] = useState(false);
  const [editRec,setEditRec] = useState(null);
  const [recForm,setRecForm] = useState({title:"",description:"",last_date:"",venue:"",time:"",registration_link:""});
  const [toast,setToast] = useState(null);

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",fontWeight:700}}>Enrollments</h2>
        {!showRF&&!editRec&&(
          <button onClick={()=>{setShowRF(true);setEditRec(null);
            setRecForm({title:"",description:"",last_date:"",registration_link:"",venue:"",time:""}); }}
            style={pBtn("accent")}>+ Add Enrollment</button>
        )}
      </div>
      {(showRF||editRec)&&(
        <div style={cardStyle({marginBottom:20,background:C.surface2,maxWidth:780})}>
          <h4 style={{fontWeight:700,marginBottom:16}}>{editRec?"Edit Enrollment":"New Enrollment"}</h4>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl()}>Title *</label>
              <input required style={inp()} value={recForm.title}
                onChange={e=>setRecForm({...recForm,title:e.target.value})}/>
            </div>
            <div>
              <label style={lbl()}>Last Date to Apply *</label>
              <input type="date" required style={inp()} value={recForm.last_date}
                onChange={e=>setRecForm({...recForm,last_date:e.target.value})}/>
            </div>
            <div>
              <label style={lbl()}>Venue</label>
              <input style={inp()} placeholder="e.g. Seminar Hall, Block A"
                value={recForm.venue} onChange={e=>setRecForm({...recForm,venue:e.target.value})}/>
            </div>
            <div>
              <label style={lbl()}>Time</label>
              <input type="time" style={inp()} value={recForm.time}
                onChange={e=>setRecForm({...recForm,time:e.target.value})}/>
            </div>
            <div>
              <label style={lbl()}>Registration Link</label>
              <input style={inp()} placeholder="https://forms.google.com/..."
                value={recForm.registration_link}
                onChange={e=>setRecForm({...recForm,registration_link:e.target.value})}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl()}>Description</label>
              <textarea style={inp({height:80,resize:"vertical"})} placeholder="Who can apply, requirements…"
                value={recForm.description} onChange={e=>setRecForm({...recForm,description:e.target.value})}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
            <button onClick={()=>{setShowRF(false);setEditRec(null);}} style={pBtn("ghost")}>Cancel</button>
            <button onClick={async()=>{
              if(!recForm.title||!recForm.last_date){setToast({msg:"Title and last date required",type:"error"});return;}
              try {
                if(editRec) await apiCall(`/recruitments/${editRec.id}`,"PUT",recForm);
                else await apiCall(`/clubs/${clubId}/recruitments`,"POST",recForm);
                setShowRF(false);setEditRec(null);onReload();
                setToast({msg:editRec?"Enrollment updated!":"Enrollment added!",type:"success"});
              } catch(e){setToast({msg:e.message,type:"error"});}
            }} style={pBtn("primary")}>
              {editRec?"Update":"Save"}
            </button>
          </div>
        </div>
      )}
      {recs.length===0
        ? <p style={{color:C.muted,fontSize:".86rem"}}>No enrollments yet.</p>
        : recs.map(r=>(
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
                onReload();
              }} style={pBtn("ghost",{padding:"6px 12px",fontSize:".76rem"})}>
                {r.is_active?"Close":"Reopen"}
              </button>
              <button onClick={()=>{setEditRec(r);setShowRF(false);
                setRecForm({title:r.title,description:r.description||"",last_date:r.last_date,
                  venue:r.venue||"",time:r.time||"",registration_link:r.registration_link||""});}}
                style={pBtn("ghost",{padding:"6px 12px"})}>Edit</button>
              <button onClick={async()=>{
                if(!confirm("Delete this enrollment?"))return;
                await apiCall(`/recruitments/${r.id}`,"DELETE");
                onReload(); setToast({msg:"Deleted",type:"success"});
              }} style={pBtn("danger",{padding:"6px 12px"})}>Delete</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}
