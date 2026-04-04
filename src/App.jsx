import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth, apiCall } from "./context/AuthContext";
import ClubPage           from "./pages/ClubPage";
import ProfilePage        from "./pages/ProfilePage";
import AdminDashboard     from "./pages/AdminDashboard";
import EventPage          from "./pages/EventPage";
import ModeratorDashboard from "./pages/ModeratorDashboard";

const API_BASE = "http://localhost:8000";

/* ── Fonts & global CSS ─────────────────────────────────────────────────── */
if (!document.getElementById("cv-gf")) {
  const l = document.createElement("link");
  l.id="cv-gf"; l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap";
  document.head.appendChild(l);
  const s = document.createElement("style");
  s.textContent=`
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{background:#f8f7f4;font-family:'Plus Jakarta Sans',sans-serif;color:#17150f;overflow-x:hidden}
    ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d1ccc4;border-radius:4px}
    input,button,textarea,select{font-family:inherit}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes popIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
    @keyframes dropIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  `;
  document.head.appendChild(s);
}

/* ── Palette ────────────────────────────────────────────────────────────── */
const C = {
  bg:"#f8fafc", surface:"#fff", surface2:"#e5e7eb",
  border:"#d1d5db", ink:"#111827", muted:"#6b7280",
  accent:"#1e3a8a", accentBg:"#dbeafe",
  green:"#16a34a", greenBg:"#f0fdf4",
};

const MON_L = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MON_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DEPTS = ["All","General","Computer Science","Electronics","Mechanical","Civil","Production","Elecrtical","Architecture"];

function scoreClub(club, raw) {
  if (!raw.trim()) return 0;
  const words = raw.toLowerCase().split(/[\s,]+/).filter(Boolean);
  const hay   = [...(club.tags||[]), club.name, club.department, club.description].join(" ").toLowerCase();
  return words.reduce((a,w) => a + (hay.includes(w)?1:0), 0);
}

/* ── Auth Modal ─────────────────────────────────────────────────────────── */
function AuthModal({ onClose }) {
  const { login } = useAuth();
  const [tab,   setTab]  = useState("login");
  // Register steps: "details" -> "otp" -> "password"
  // Forgot steps: "forgot" -> "forgot-otp" -> "forgot-reset"
  const [step,  setStep] = useState("details");
  const [form,  setForm] = useState({name:"", email:"", otp:"", password:"", confirm:""});
  const [err,   setErr]  = useState("");
  const [busy,  setBusy] = useState(false);
  const [resent,setResent] = useState(false);

  const handleLogin = async () => {
    setErr(""); setBusy(true);
    try {
      await login(form.email, form.password);
      onClose();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const handleSendOTP = async () => {
    if (!form.name.trim()) { setErr("Name is required"); return; }
    if (!form.email.trim()) { setErr("Email is required"); return; }
    setErr(""); setBusy(true);
    try {
      await apiCall("/auth/send-otp","POST",{name:form.name,email:form.email});
      setStep("otp");
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const handleVerifyOTP = async () => {
    if (form.otp.length!==6) { setErr("Enter the 6-digit code"); return; }
    setErr(""); setBusy(true);
    try {
      await apiCall("/auth/verify-otp","POST",{email:form.email,otp:form.otp});
      setStep("password");
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const handleSetPassword = async () => {
    if (form.password.length<6) { setErr("Password must be at least 6 characters"); return; }
    if (form.password!==form.confirm) { setErr("Passwords do not match"); return; }
    setErr(""); setBusy(true);
    try {
      const d = await apiCall("/auth/set-password","POST",{email:form.email,password:form.password});
      localStorage.setItem("cv_token", d.token);
      window.location.reload();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const handleResend = async () => {
    try {
      await apiCall("/auth/resend-otp","POST",{email:form.email});
      setResent(true); setTimeout(()=>setResent(false),3000);
    } catch(e) { setErr(e.message); }
  };

  // ── Forgot password handlers ──
  const handleForgotSendOTP = async () => {
    if (!form.email.trim()) { setErr("Please enter your email address"); return; }
    setErr(""); setBusy(true);
    try {
      await apiCall("/auth/forgot-password","POST",{email:form.email});
      setStep("forgot-otp");
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const handleForgotVerifyOTP = async () => {
    if (form.otp.length!==6) { setErr("Enter the 6-digit code"); return; }
    setErr(""); setBusy(true);
    try {
      await apiCall("/auth/forgot-verify-otp","POST",{email:form.email,otp:form.otp});
      setStep("forgot-reset");
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const handleForgotResend = async () => {
    try {
      await apiCall("/auth/forgot-password","POST",{email:form.email});
      setResent(true); setTimeout(()=>setResent(false),3000);
    } catch(e) { setErr(e.message); }
  };

  const handleResetPassword = async () => {
    if (form.password.length<6) { setErr("Password must be at least 6 characters"); return; }
    if (form.password!==form.confirm) { setErr("Passwords do not match"); return; }
    setErr(""); setBusy(true);
    try {
      const d = await apiCall("/auth/reset-password","POST",{email:form.email,password:form.password});
      localStorage.setItem("cv_token", d.token);
      window.location.reload();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const goBackToLogin = () => { setTab("login"); setStep("details"); setErr(""); setForm({name:"",email:"",otp:"",password:"",confirm:""}); };

  const isForgotFlow = step==="forgot"||step==="forgot-otp"||step==="forgot-reset";

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(23,21,15,.48)",
        backdropFilter:"blur(6px)",zIndex:600,display:"flex",alignItems:"center",
        justifyContent:"center",animation:"fadeIn .2s"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:22,
          padding:"40px 36px",width:400,maxWidth:"92vw",
          boxShadow:"0 24px 64px rgba(0,0,0,.18)",position:"relative",animation:"popIn .22s"}}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:C.surface2,
            border:`1px solid ${C.border}`,width:32,height:32,borderRadius:8,
            cursor:"pointer",color:C.muted,fontSize:"1rem"}}>✕</button>

        {/* Tab switcher — only on first step, not in forgot flow */}
        {!isForgotFlow && (tab==="login" || step==="details") && (
          <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:28}}>
            {[["login","Sign In"],["register","Create Account"]].map(([t,lbl])=>(
              <button key={t} onClick={()=>{setTab(t);setStep("details");setErr("");}}
                style={{flex:1,padding:"10px 0",background:"none",border:"none",cursor:"pointer",
                  fontWeight:600,fontSize:".9rem",transition:"all .2s",color:tab===t?C.accent:C.muted,
                  borderBottom:tab===t?`2px solid ${C.accent}`:"2px solid transparent"}}>
                {lbl}
              </button>
            ))}
          </div>
        )}

        {/* ── LOGIN ── */}
        {tab==="login" && !isForgotFlow && (<>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.8rem",fontWeight:700,marginBottom:6}}>
            Welcome back
          </h2>
          <p style={{color:C.muted,fontSize:".86rem",marginBottom:22}}>Sign in to your account.</p>
          <input type="email" placeholder="Email address" value={form.email}
            onChange={e=>setForm({...form,email:e.target.value})}
            onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={iStyle()}/>
          <input type="password" placeholder="Password" value={form.password}
            onChange={e=>setForm({...form,password:e.target.value})}
            onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={iStyle()}/>
          {err && <p style={{color:"#dc2626",fontSize:".82rem",marginBottom:10}}>{err}</p>}
          <button onClick={handleLogin} disabled={busy}
            style={{width:"100%",background:busy?C.muted:C.ink,color:"#fff",border:"none",
              borderRadius:10,padding:13,fontWeight:600,fontSize:".94rem",cursor:"pointer",marginBottom:12}}>
            {busy?"Please wait…":"Sign In"}
          </button>
          <p style={{textAlign:"center",fontSize:".82rem",color:C.muted}}>
            <span onClick={()=>{setStep("forgot");setErr("");setForm(f=>({...f,password:"",confirm:"",otp:""}));}}
              style={{color:C.accent,cursor:"pointer",fontWeight:600}}>
              Forgot password?
            </span>
          </p>
        </>)}

        {/* ── REGISTER STEP 1: Name + Email ── */}
        {tab==="register" && step==="details" && (<>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.8rem",fontWeight:700,marginBottom:6}}>
            Join ClubVerse
          </h2>
          <p style={{color:C.muted,fontSize:".86rem",marginBottom:22}}>Enter your details to get started.</p>
          <input placeholder="Full Name" value={form.name}
            onChange={e=>setForm({...form,name:e.target.value})} style={iStyle()}/>
          <input type="email" placeholder="Email address" value={form.email}
            onChange={e=>setForm({...form,email:e.target.value})}
            onKeyDown={e=>e.key==="Enter"&&handleSendOTP()} style={iStyle()}/>
          {err && <p style={{color:"#dc2626",fontSize:".82rem",marginBottom:10}}>{err}</p>}
          <button onClick={handleSendOTP} disabled={busy}
            style={{width:"100%",background:busy?C.muted:C.ink,color:"#fff",border:"none",
              borderRadius:10,padding:13,fontWeight:600,fontSize:".94rem",cursor:"pointer"}}>
            {busy?"Sending code…":"Send Verification Code"}
          </button>
        </>)}

        {/* ── REGISTER STEP 2: OTP ── */}
        {tab==="register" && step==="otp" && (<>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:C.accentBg,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"1.6rem",margin:"0 auto 14px"}}>📧</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",fontWeight:700,marginBottom:8}}>
              Check your email
            </h2>
            <p style={{color:C.muted,fontSize:".84rem",lineHeight:1.6}}>
              We sent a 6-digit code to<br/>
              <strong style={{color:C.ink}}>{form.email}</strong>
            </p>
          </div>

          {/* OTP digit boxes — clicking any box focuses the hidden input */}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20,cursor:"text"}}
            onClick={()=>document.getElementById("otp-hidden-input").focus()}>
            {Array.from({length:6},(_,i)=>(
              <div key={i} style={{
                width:44,height:52,borderRadius:12,
                background:form.otp[i]?C.accentBg:C.surface2,
                border:`2px solid ${i===form.otp.length&&form.otp.length<6?C.accent:form.otp[i]?C.accent:C.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",fontWeight:900,
                color:C.accent,transition:"all .15s",
                boxShadow:i===form.otp.length&&form.otp.length<6?`0 0 0 3px rgba(184,74,30,.15)`:"none"}}>
                {form.otp[i] || ""}
              </div>
            ))}
          </div>

          {/* Hidden input — auto-focused, captures all keystrokes */}
          <input
            id="otp-hidden-input"
            value={form.otp}
            onChange={e=>setForm({...form,otp:e.target.value.replace(/[^0-9]/g,"").slice(0,6)})}
            onKeyDown={e=>e.key==="Enter"&&handleVerifyOTP()}
            maxLength={6}
            autoFocus
            style={{position:"absolute",opacity:0,width:0,height:0,pointerEvents:"none"}}
          />

          {err && <p style={{color:"#dc2626",fontSize:".82rem",marginBottom:12,textAlign:"center"}}>{err}</p>}
          <button onClick={handleVerifyOTP} disabled={busy||form.otp.length!==6}
            style={{width:"100%",background:busy||form.otp.length!==6?C.muted:C.ink,
              color:"#fff",border:"none",borderRadius:10,padding:13,fontWeight:600,
              fontSize:".94rem",cursor:form.otp.length===6?"pointer":"default",marginBottom:12,
              transition:"all .2s"}}>
            {busy?"Verifying…":"Verify Code"}
          </button>
          <p style={{textAlign:"center",fontSize:".82rem",color:C.muted}}>
            Didn't get it?{" "}
            <span onClick={handleResend} style={{color:C.accent,cursor:"pointer",fontWeight:600}}>
              {resent?"✓ Sent!":"Resend code"}
            </span>
          </p>
        </>)}

        {/* ── REGISTER STEP 3: Set Password ── */}
        {tab==="register" && step==="password" && (<>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:"2.4rem",marginBottom:10}}>🔒</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",fontWeight:700,marginBottom:6}}>
              Set your password
            </h2>
            <p style={{color:C.muted,fontSize:".86rem"}}>Almost done! Choose a secure password.</p>
          </div>
          <input type="password" placeholder="Password (min 6 characters)" value={form.password}
            onChange={e=>setForm({...form,password:e.target.value})} style={iStyle()}/>
          <input type="password" placeholder="Confirm password" value={form.confirm}
            onChange={e=>setForm({...form,confirm:e.target.value})}
            onKeyDown={e=>e.key==="Enter"&&handleSetPassword()} style={iStyle()}/>
          {err && <p style={{color:"#dc2626",fontSize:".82rem",marginBottom:10}}>{err}</p>}
          <button onClick={handleSetPassword} disabled={busy}
            style={{width:"100%",background:busy?C.muted:C.ink,color:"#fff",border:"none",
              borderRadius:10,padding:13,fontWeight:600,fontSize:".94rem",cursor:"pointer"}}>
            {busy?"Creating account…":"Create Account"}
          </button>
        </>)}

        {/* ── FORGOT STEP 1: Enter email ── */}
        {step==="forgot" && (<>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:C.accentBg,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"1.6rem",margin:"0 auto 14px"}}>🔑</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",fontWeight:700,marginBottom:8}}>
              Forgot Password
            </h2>
            <p style={{color:C.muted,fontSize:".84rem",lineHeight:1.6}}>
              Enter your registered email address.<br/>We'll send you a reset code.
            </p>
          </div>
          <input type="email" placeholder="Email address" value={form.email}
            onChange={e=>setForm({...form,email:e.target.value})}
            onKeyDown={e=>e.key==="Enter"&&handleForgotSendOTP()} style={iStyle()}/>
          {err && <p style={{color:"#dc2626",fontSize:".82rem",marginBottom:10}}>{err}</p>}
          <button onClick={handleForgotSendOTP} disabled={busy}
            style={{width:"100%",background:busy?C.muted:C.ink,color:"#fff",border:"none",
              borderRadius:10,padding:13,fontWeight:600,fontSize:".94rem",cursor:"pointer",marginBottom:12}}>
            {busy?"Sending code…":"Send Reset Code"}
          </button>
          <p style={{textAlign:"center",fontSize:".82rem",color:C.muted}}>
            <span onClick={goBackToLogin} style={{color:C.accent,cursor:"pointer",fontWeight:600}}>
              ← Back to Sign In
            </span>
          </p>
        </>)}

        {/* ── FORGOT STEP 2: OTP ── */}
        {step==="forgot-otp" && (<>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:C.accentBg,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"1.6rem",margin:"0 auto 14px"}}>📧</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",fontWeight:700,marginBottom:8}}>
              Check your email
            </h2>
            <p style={{color:C.muted,fontSize:".84rem",lineHeight:1.6}}>
              We sent a 6-digit reset code to<br/>
              <strong style={{color:C.ink}}>{form.email}</strong>
            </p>
          </div>
          {/* OTP boxes — reuse same id-free approach */}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20,cursor:"text"}}
            onClick={()=>document.getElementById("fp-otp-input").focus()}>
            {Array.from({length:6},(_,i)=>(
              <div key={i} style={{
                width:44,height:52,borderRadius:12,
                background:form.otp[i]?C.accentBg:C.surface2,
                border:`2px solid ${i===form.otp.length&&form.otp.length<6?C.accent:form.otp[i]?C.accent:C.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",fontWeight:900,
                color:C.accent,transition:"all .15s"}}>
                {form.otp[i] || ""}
              </div>
            ))}
          </div>
          <input id="fp-otp-input" value={form.otp}
            onChange={e=>setForm({...form,otp:e.target.value.replace(/[^0-9]/g,"").slice(0,6)})}
            onKeyDown={e=>e.key==="Enter"&&handleForgotVerifyOTP()}
            maxLength={6} autoFocus
            style={{position:"absolute",opacity:0,width:0,height:0,pointerEvents:"none"}}/>
          {err && <p style={{color:"#dc2626",fontSize:".82rem",marginBottom:12,textAlign:"center"}}>{err}</p>}
          <button onClick={handleForgotVerifyOTP} disabled={busy||form.otp.length!==6}
            style={{width:"100%",background:busy||form.otp.length!==6?C.muted:C.ink,
              color:"#fff",border:"none",borderRadius:10,padding:13,fontWeight:600,
              fontSize:".94rem",cursor:form.otp.length===6?"pointer":"default",marginBottom:12,transition:"all .2s"}}>
            {busy?"Verifying…":"Verify Code"}
          </button>
          <p style={{textAlign:"center",fontSize:".82rem",color:C.muted}}>
            Didn't get it?{" "}
            <span onClick={handleForgotResend} style={{color:C.accent,cursor:"pointer",fontWeight:600}}>
              {resent?"✓ Sent!":"Resend code"}
            </span>
          </p>
        </>)}

        {/* ── FORGOT STEP 3: New Password ── */}
        {step==="forgot-reset" && (<>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:"2.4rem",marginBottom:10}}>🔒</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",fontWeight:700,marginBottom:6}}>
              Set New Password
            </h2>
            <p style={{color:C.muted,fontSize:".86rem"}}>Choose a new secure password for your account.</p>
          </div>
          <input type="password" placeholder="New password (min 6 characters)" value={form.password}
            onChange={e=>setForm({...form,password:e.target.value})} style={iStyle()}/>
          <input type="password" placeholder="Confirm new password" value={form.confirm}
            onChange={e=>setForm({...form,confirm:e.target.value})}
            onKeyDown={e=>e.key==="Enter"&&handleResetPassword()} style={iStyle()}/>
          {err && <p style={{color:"#dc2626",fontSize:".82rem",marginBottom:10}}>{err}</p>}
          <button onClick={handleResetPassword} disabled={busy}
            style={{width:"100%",background:busy?C.muted:C.ink,color:"#fff",border:"none",
              borderRadius:10,padding:13,fontWeight:600,fontSize:".94rem",cursor:"pointer"}}>
            {busy?"Resetting…":"Reset Password"}
          </button>
        </>)}

      </div>
    </div>
  );
}

const iStyle = (ex={}) => ({
  width:"100%",background:C.surface2,border:`1.5px solid ${C.border}`,borderRadius:10,
  padding:"11px 14px",marginBottom:11,display:"block",fontSize:".9rem",
  color:C.ink,outline:"none",...ex
});

/* ── Calendar Panel ─────────────────────────────────────────────────────── */
function CalendarPanel({ events=[] }) {
  const today = new Date();
  const [cal, setCal] = useState(new Date(today.getFullYear(), today.getMonth()));
  const y=cal.getFullYear(), m=cal.getMonth();
  const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate();

  const evDays = new Map();
  events.forEach(ev => {
    const d = new Date(ev.event_date);
    if (d.getFullYear()===y && d.getMonth()===m) {
      const day=d.getDate();
      if (!evDays.has(day)) evDays.set(day,[]);
      evDays.get(day).push(ev);
    }
  });
  const monthEvs = events
    .filter(ev=>{const d=new Date(ev.event_date);return d.getFullYear()===y&&d.getMonth()===m;})
    .sort((a,b)=>a.event_date.localeCompare(b.event_date));

  return (
    <div style={{position:"absolute",top:"calc(100% + 10px)",right:0,background:C.surface,
        border:`1px solid ${C.border}`,borderRadius:18,padding:22,width:316,
        boxShadow:"0 12px 48px rgba(0,0,0,.14)",zIndex:300,animation:"dropIn .2s"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1.05rem",fontWeight:700}}>
          {MON_L[m]} {y}
        </span>
        <div style={{display:"flex",gap:4}}>
          {["‹","›"].map((ch,i)=>(
            <button key={i} onClick={()=>setCal(new Date(y,m+(i?1:-1)))} style={{
                background:C.surface2,border:`1px solid ${C.border}`,width:26,height:26,
                borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {ch}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
        {["S","M","T","W","T","F","S"].map((d,i)=>(
          <span key={i} style={{textAlign:"center",fontSize:".65rem",color:"#aaa",fontWeight:600,padding:"3px 0"}}>{d}</span>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {Array(first).fill(null).map((_,i)=><div key={"e"+i}/>)}
        {Array.from({length:days},(_,i)=>i+1).map(day=>{
          const isToday=today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===day;
          const hasEv=evDays.has(day);
          return (
            <div key={day} title={hasEv?evDays.get(day).map(e=>e.title).join(", "):""}
              style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:".74rem",borderRadius:7,position:"relative",cursor:hasEv?"pointer":"default",
                background:isToday?C.ink:"transparent",
                color:isToday?"#fff":hasEv?C.ink:"#ccc",fontWeight:isToday||hasEv?700:400}}>
              {day}
              {hasEv&&!isToday&&(
                <span style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",
                  width:4,height:4,background:C.accent,borderRadius:"50%"}}/>
              )}
            </div>
          );
        })}
      </div>

      {monthEvs.length>0&&(
        <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:14}}>
          <p style={{fontSize:".67rem",textTransform:"uppercase",letterSpacing:"1.2px",
              color:"#aaa",fontWeight:600,marginBottom:10}}>Events this month</p>
          {monthEvs.map(ev=>(
            <div key={ev.id} style={{display:"flex",gap:10,marginBottom:10}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:C.accent,marginTop:4,flexShrink:0}}/>
              <div>
                <strong style={{fontSize:".78rem",display:"block",lineHeight:1.3}}>{ev.title}</strong>
                <span style={{fontSize:".7rem",color:"#aaa"}}>{ev.club_name}{ev.event_time ? " · ⏰ " + ev.event_time : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Club Card ──────────────────────────────────────────────────────────── */
function ClubCard({ club, score=0, onClick }) {
  const [hov,setHov]=useState(false);
  const icon = club.icon_url ? `${API_BASE}${club.icon_url}` : null;
  return (
    <div style={{background:C.surface,border:`1.5px solid ${hov?"transparent":C.border}`,borderRadius:18,
        padding:24,cursor:"pointer",transition:"all .25s",flex:"1 1 0",minWidth:210,
        transform:hov?"translateY(-5px)":"none",boxShadow:hov?"0 12px 40px rgba(0,0,0,.12)":"none",
        position:"relative",overflow:"hidden"}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onClick(club.id)}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:C.accent,
          opacity:hov?1:0,transition:"opacity .25s"}}/>
      {score>0&&(
        <div style={{display:"inline-flex",alignItems:"center",gap:4,background:C.accentBg,
            color:C.accent,border:"1px solid rgba(184,74,30,.2)",borderRadius:10,
            padding:"2px 9px",fontSize:".68rem",fontWeight:600,marginBottom:8}}>
          ✦ {score} match{score>1?"es":""}
        </div>
      )}
      {icon
        ? <img src={icon} alt="" style={{width:48,height:48,borderRadius:12,objectFit:"cover",marginBottom:12}}/>
        : <span style={{fontSize:"2.2rem",display:"block",marginBottom:12}}>🏛️</span>
      }
      <div style={{fontSize:".65rem",textTransform:"uppercase",letterSpacing:"1.2px",
          color:"#aaa",fontWeight:600,marginBottom:5}}>{club.department||"General"}</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.15rem",fontWeight:700,
          marginBottom:8,lineHeight:1.2}}>{club.name}</div>
      <div style={{fontSize:".8rem",color:C.muted,lineHeight:1.65,marginBottom:14}}>
        {(club.description||"").slice(0,100)}{(club.description||"").length>100?"…":""}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
        {(club.tags||[]).slice(0,3).map(t=>(
          <span key={t} style={{background:C.surface2,color:C.muted,border:`1px solid ${C.border}`,
            padding:"2px 9px",borderRadius:8,fontSize:".68rem"}}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Upcoming Event Card ────────────────────────────────────────────────── */
function EventCard({ ev, onClick }) {
  const [hov,setHov]=useState(false);
  const d = new Date(ev.event_date);
  const isToday = ev.event_date === new Date().toISOString().slice(0,10);
  return (
    <div onClick={() => onClick(ev)}
      style={{background:C.surface,
          border:`1.5px solid ${isToday?"#16a34a":hov?C.accent:C.border}`,
          borderRadius:16,padding:"18px 20px",display:"flex",alignItems:"flex-start",
          gap:16,cursor:"pointer",transition:"all .2s",
          transform:hov?"translateY(-2px)":"none",
          boxShadow:hov?"0 6px 24px rgba(0,0,0,.08)":"none"}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>

      {/* Date badge — green when today */}
      <div style={{flexShrink:0,background:isToday?"#16a34a":C.ink,
          color:"#fff",borderRadius:12,width:56,padding:"10px 0",textAlign:"center"}}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",
            fontWeight:900,lineHeight:1,display:"block"}}>{d.getDate()}</span>
        <span style={{fontSize:".58rem",textTransform:"uppercase",
            letterSpacing:"1px",opacity:.75,display:"block",marginTop:2}}>
          {MON_S[d.getMonth()]}
        </span>
      </div>

      {/* Content */}
      <div style={{flex:1,minWidth:0}}>
        {isToday && (
          <div style={{display:"inline-flex",alignItems:"center",gap:5,
              background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0",
              borderRadius:20,padding:"2px 10px",fontSize:".68rem",fontWeight:700,
              marginBottom:6,letterSpacing:".3px"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#16a34a",
                display:"inline-block",animation:"pulse 1.5s infinite"}}/>
            Happening Today
          </div>
        )}
        <div style={{fontWeight:700,fontSize:".95rem",lineHeight:1.3,marginBottom:3}}>
          {ev.title}
        </div>
        <div style={{fontSize:".76rem",fontWeight:600,color:C.accent,marginBottom:5}}>
          {ev.club_name}
        </div>
        {ev.event_time && (
          <div style={{fontSize:".74rem",color:C.muted,marginBottom:2}}>
            ⏰ {ev.event_time}
          </div>
        )}
        {ev.location && (
          <div style={{fontSize:".74rem",color:C.muted,marginBottom:2}}>
            📍 {ev.location}
          </div>
        )}
        {ev.description && (
          <div style={{fontSize:".78rem",color:C.muted,marginTop:4,lineHeight:1.5,
              overflow:"hidden",textOverflow:"ellipsis",
              display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
            {ev.description}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Home Page ──────────────────────────────────────────────────────────── */
function HomePage({ onClubClick, onProfile, onEventClick }) {
  const { user, logout } = useAuth();
  const [clubs,   setClubs]   = useState([]);
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [dept,    setDept]    = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [showAuth,setShowAuth]= useState(false);
  const [query,   setQuery]   = useState("");
  const [applied, setApplied] = useState("");
  const [saHov,   setSaHov]   = useState(false);
  const [recruits,setRecruits]= useState([]);
  const allRef = useRef(null);
  const [unread,   setUnread]   = useState(0);
  const [notifs,   setNotifs]   = useState([]);
  const [showBell, setShowBell] = useState(false);

  useEffect(() => {
    if (user) {
      apiCall("/notifications/unread-count").then(d=>setUnread(d.count)).catch(()=>{});
      apiCall("/notifications").then(setNotifs).catch(()=>{});
    }
  }, [user]);

  const markRead = async () => {
    await apiCall("/notifications/read","POST").catch(()=>{});
    setNotifs(n=>n.map(x=>({...x,is_read:1})));
    setUnread(0);
  };

  const clearNotifs = async () => {
    if (!confirm("Clear all notifications?")) return;
    await apiCall("/notifications/clear","DELETE").catch(()=>{});
    setNotifs([]); setUnread(0);
  };

  useEffect(() => {
    Promise.all([apiCall("/clubs"), apiCall("/events?upcoming=1"), apiCall("/recruitments")])
      .then(([cl,ev,rec]) => { setClubs(cl); setEvents(ev); setRecruits(rec); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Close calendar and bell on outside click
  useEffect(() => {
    const fn = e => {
      if (!e.target.closest("[data-cal]")) setShowCal(false);
      if (!e.target.closest("[data-bell]")) setShowBell(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const deptClubs   = dept==="All" ? clubs : clubs.filter(c=>c.department===dept);
  const featured    = deptClubs.slice(0,3);
  const allScored   = deptClubs.map(c=>({...c, sc:scoreClub(c,applied)}));
  const allFiltered = applied ? allScored.filter(c=>c.sc>0).sort((a,b)=>b.sc-a.sc) : allScored;
  const todayStr    = new Date().toISOString().slice(0,10);
  const upcoming    = events.filter(e => e.event_date >= todayStr);

  const handleSeeAll = () => {
    const n=!showAll; setShowAll(n);
    if (n) setTimeout(()=>allRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),60);
    else  { setApplied(""); setQuery(""); }
  };
  const handleSearch = () => {
    setApplied(query);
    if (!showAll) setShowAll(true);
    setTimeout(()=>allRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),60);
  };

  return (
    <div style={{background:C.bg,minHeight:"100vh"}}>
      {/* ── NAV ── */}
      <nav style={{position:"sticky",top:0,zIndex:200,background:"rgba(248,247,244,.93)",
          backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",height:66}}>
        <div onClick={()=>{setShowAll(false);setApplied("");setQuery("");setDept("All");}}
          style={{fontFamily:"'Playfair Display',serif",fontSize:"1.8rem",fontWeight:900,
            letterSpacing:"-1px",cursor:"pointer",userSelect:"none"}}>
          Club<em style={{color:C.accent,fontStyle:"italic"}}>Verse</em>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:12,position:"relative"}}>
          {/* Calendar */}
          <div data-cal style={{position:"relative"}}>
            <button data-cal onClick={()=>setShowCal(v=>!v)} style={{
                display:"flex",alignItems:"center",gap:7,background:showCal?C.accent:C.surface2,
                border:`1px solid ${showCal?C.accent:C.border}`,borderRadius:10,padding:"8px 18px",
                cursor:"pointer",fontSize:".84rem",fontWeight:500,
                color:showCal?"#fff":C.muted,transition:"all .2s"}}>
              📅 Calendar
            </button>
            {showCal && <div data-cal><CalendarPanel events={upcoming}/></div>}
          </div>

          {/* Auth */}
          {user ? (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {user.role!=="admin" && (<>
                {/* Bell dropdown */}
                <div data-bell style={{position:"relative"}}>
                  <button onClick={()=>{setShowBell(v=>!v);if(!showBell)markRead();}}
                    style={{position:"relative",background:showBell?C.ink:C.surface2,
                      border:`1px solid ${showBell?C.ink:C.border}`,borderRadius:8,padding:"7px 10px",
                      cursor:"pointer",fontSize:"1rem",color:showBell?"#fff":"inherit"}}>
                    🔔
                    {unread>0 && (
                      <span style={{position:"absolute",top:-4,right:-4,background:C.accent,
                          color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:".6rem",
                          fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {unread}
                      </span>
                    )}
                  </button>
                  {showBell && (
                    <div style={{position:"absolute",top:"calc(100% + 10px)",right:0,
                        background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,
                        width:340,maxHeight:420,display:"flex",flexDirection:"column",
                        boxShadow:"0 12px 48px rgba(0,0,0,.14)",zIndex:300,animation:"dropIn .2s"}}>
                      <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.border}`,
                          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontWeight:700,fontSize:".92rem"}}>Notifications</span>
                        {notifs.length>0 && (
                          <button onClick={clearNotifs}
                            style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,
                              borderRadius:7,padding:"3px 10px",cursor:"pointer",fontSize:".72rem"}}>
                            🗑 Clear all
                          </button>
                        )}
                      </div>
                      <div style={{overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:8}}>
                        {notifs.length===0 ? (
                          <div style={{textAlign:"center",padding:"32px 0",color:C.muted}}>
                            <div style={{fontSize:"2rem",marginBottom:8}}>🔔</div>
                            <p style={{fontSize:".84rem"}}>No notifications yet.</p>
                          </div>
                        ) : notifs.map(n=>(
                          <div key={n.id} style={{background:n.is_read?C.surface:C.accentBg,
                              border:`1px solid ${n.is_read?C.border:"rgba(30,58,138,.15)"}`,
                              borderRadius:10,padding:"10px 12px",display:"flex",gap:10,alignItems:"flex-start"}}>
                            <div style={{width:7,height:7,borderRadius:"50%",marginTop:5,flexShrink:0,
                                background:n.is_read?"#ccc":C.accent}}/>
                            <div>
                              <p style={{fontSize:".82rem",fontWeight:n.is_read?400:600,marginBottom:3}}>{n.message}</p>
                              {n.event_date && (
                                <p style={{fontSize:".72rem",color:C.muted}}>
                                  📅 {new Date(n.event_date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                                  {n.event_time && ` · ⏰ ${n.event_time}`}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={onProfile} style={{background:C.surface2,border:`1px solid ${C.border}`,
                    borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:".8rem",color:C.ink,fontWeight:600}}>
                  👤 {user.name.split(" ")[0]}
                </button>
              </>)}
              {(user.role==="admin" || user.role==="moderator") && (
                <button onClick={()=>window.dispatchEvent(new CustomEvent("cv:nav",{detail:user.role==="admin"?"admin":"moderator"}))}
                  style={{background:C.accentBg,color:C.accent,border:`1px solid ${C.accent}`,
                    borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:".8rem",fontWeight:600}}>
                  {user.role==="admin"?"Admin ↗":"My Club ↗"}
                </button>
              )}
            </div>
          ) : (
            <button onClick={()=>setShowAuth(true)} style={{background:C.ink,color:"#fff",border:"none",
                borderRadius:10,padding:"9px 24px",cursor:"pointer",fontWeight:600,fontSize:".88rem"}}>
              Login
            </button>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{padding:"72px 48px 56px",
          background:"linear-gradient(155deg,#f8f7f4 0%,#ede9e0 100%)",
          borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.accentBg,
            border:"1px solid rgba(184,74,30,.2)",color:C.accent,borderRadius:20,padding:"4px 14px",
            fontSize:".73rem",fontWeight:600,letterSpacing:".6px",textTransform:"uppercase",marginBottom:18}}>
          ✦ Your College Hub
        </div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(2.2rem,5vw,3.8rem)",
            fontWeight:900,lineHeight:1.1,letterSpacing:"-2px",marginBottom:14}}>
          Find Your<br/><em style={{color:C.accent,fontStyle:"italic"}}>Club & Community</em>
        </h1>
        <p style={{color:C.muted,fontSize:"1rem",maxWidth:480,lineHeight:1.8,marginBottom:36}}>
          Explore every club across departments, discover your passion, and stay ahead of campus events.
        </p>
        <div style={{display:"flex",gap:48,flexWrap:"wrap"}}>
          {[[clubs.length,"Clubs"],[DEPTS.length-1,"Departments"],[upcoming.length,"Upcoming Events"]].map(([n,lbl])=>(
            <div key={lbl}>
              <strong style={{fontFamily:"'Playfair Display',serif",fontSize:"2.2rem",fontWeight:900,lineHeight:1,display:"block"}}>{n}</strong>
              <span style={{fontSize:".78rem",color:"#aaa",fontWeight:500}}>{lbl}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEPT TABS ── */}
      <section style={{padding:"28px 48px 0"}}>
        <p style={{fontSize:".68rem",textTransform:"uppercase",letterSpacing:"1.5px",color:"#aaa",fontWeight:600,marginBottom:10}}>
          Browse by Department
        </p>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          {DEPTS.map(d=>(
            <button key={d} onClick={()=>{setDept(d);setShowAll(false);setApplied("");setQuery("");}}
              style={{background:dept===d?C.ink:C.surface2,border:`1.5px solid ${dept===d?C.ink:C.border}`,
                color:dept===d?"#fff":C.muted,padding:"6px 18px",borderRadius:20,cursor:"pointer",
                fontSize:".82rem",fontWeight:500,transition:"all .2s"}}>
              {d}
            </button>
          ))}
        </div>
      </section>

      {/* ── FEATURED 3 — always single row ── */}
      <section style={{padding:"32px 48px 0"}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:20}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1.55rem",fontWeight:700}}>
            {dept==="All"?"Featured Clubs":`${dept} Clubs`}
          </span>
          <span style={{fontSize:".8rem",color:"#aaa"}}>{deptClubs.length} clubs</span>
        </div>

        {loading ? (
          <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>⏳ Loading clubs…</div>
        ) : deptClubs.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
            <div style={{fontSize:"2.5rem",marginBottom:12}}>🏛️</div>
            No clubs yet.{user?.role==="admin"?" Add some from the Admin panel.":""}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"row",gap:18,width:"100%",overflowX:"auto",paddingBottom:4}}>
            {featured.map(club=><ClubCard key={club.id} club={club} onClick={onClubClick}/>)}
          </div>
        )}
      </section>

      {/* ── SEE ALL ARROW ── */}
      {deptClubs.length>3 && (
        <div style={{padding:"22px 48px",display:"flex",alignItems:"center",gap:14}}>
          <div style={{flex:1,height:1,background:C.border}}/>
          <button onClick={handleSeeAll}
            onMouseEnter={()=>setSaHov(true)} onMouseLeave={()=>setSaHov(false)}
            style={{display:"flex",alignItems:"center",gap:9,
              background:saHov?C.ink:C.surface,border:`1.5px solid ${saHov?C.ink:C.border}`,
              borderRadius:40,padding:"9px 22px",cursor:"pointer",fontSize:".86rem",fontWeight:600,
              color:saHov?"#fff":C.ink,transition:"all .2s",whiteSpace:"nowrap"}}>
            <span>{showAll?"Show less":`See all ${deptClubs.length} clubs`}</span>
            <span style={{fontSize:"1.1rem"}}>{showAll?"↑":"→"}</span>
          </button>
          <div style={{flex:1,height:1,background:C.border}}/>
        </div>
      )}

      {/* ── ALL CLUBS + INTEREST SEARCH ── */}
      {showAll && (
        <section style={{padding:"0 48px 56px"}} ref={allRef}>
          {/* Interest search */}
          <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,
              padding:"16px 20px",marginBottom:20,display:"flex",gap:10,alignItems:"center",
              boxShadow:"0 2px 14px rgba(0,0,0,.05)"}}>
            <span style={{fontSize:"1.1rem"}}>🔍</span>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSearch()}
              placeholder="Type your interests — e.g. coding, photography, robotics, music…"
              style={{flex:1,background:"transparent",border:"none",outline:"none",
                fontSize:".9rem",color:C.ink}}/>
            {applied && (
              <button onClick={()=>{setApplied("");setQuery("");}}
                style={{background:"none",border:`1px solid ${C.border}`,color:"#aaa",
                  borderRadius:9,padding:"8px 14px",cursor:"pointer",fontSize:".78rem"}}>Clear</button>
            )}
            <button onClick={handleSearch}
              style={{background:C.ink,color:"#fff",border:"none",borderRadius:9,
                padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:".8rem"}}>
              Find Clubs
            </button>
          </div>

          {applied && (
            <p style={{fontSize:".8rem",color:"#aaa",marginBottom:16}}>
              Showing clubs matching <strong style={{color:C.ink}}>"{applied}"</strong>
              {" "}— {allFiltered.length} result{allFiltered.length!==1?"s":""}
            </p>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
            {allFiltered.length===0 ? (
              <div style={{textAlign:"center",padding:"56px 0",color:"#aaa",gridColumn:"1/-1"}}>
                <div style={{fontSize:"2.4rem",marginBottom:12}}>🔎</div>
                No clubs matched. Try different keywords!
              </div>
            ) : allFiltered.map(club=>(
              <ClubCard key={club.id} club={club} score={applied?club.sc:0} onClick={onClubClick}/>
            ))}
          </div>
        </section>
      )}

      {/* ── ACTIVE RECRUITMENTS ── */}
      {recruits.length>0 && (
        <section style={{padding:"0 48px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:20}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1.55rem",fontWeight:700}}>
              🎯 Open Enrollments
            </span>
            <span style={{fontSize:".8rem",color:"#aaa"}}>{recruits.length} open</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14,marginBottom:48}}>
            {recruits.map(r=>{
              const icon = r.club_icon?`${API_BASE}${r.club_icon}`:null;
              return (
                <div key={r.id} style={{background:C.surface,border:`2px solid ${C.accent}`,
                    borderRadius:16,padding:22,display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {icon
                      ?<img src={icon} alt="" style={{width:36,height:36,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
                      :<div style={{width:36,height:36,borderRadius:8,background:C.accentBg,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0}}>🏛️</div>
                    }
                    <div>
                      <div style={{fontWeight:700,fontSize:".88rem",color:C.ink}}>{r.club_name}</div>
                      <div style={{fontSize:".72rem",color:C.accent,fontWeight:600}}>{r.title}</div>
                    </div>
                    <span style={{marginLeft:"auto",background:C.accentBg,color:C.accent,
                        borderRadius:20,padding:"2px 10px",fontSize:".68rem",fontWeight:700,flexShrink:0}}>
                      Open
                    </span>
                  </div>
                  {r.description&&<p style={{fontSize:".8rem",color:C.muted,lineHeight:1.6}}>{r.description}</p>}
                  <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
                    <span style={{fontSize:".76rem",color:C.muted,fontWeight:600}}>
                      📅 Last date: <span style={{color:C.accent}}>
                        {new Date(r.last_date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                      </span>
                    </span>
                    {r.venue&&<span style={{fontSize:".76rem",color:C.muted,fontWeight:600}}>📍 <span style={{color:C.accent}}>{r.venue}</span></span>}
                    {r.time&&<span style={{fontSize:".76rem",color:C.muted,fontWeight:600}}>⏰ <span style={{color:C.accent}}>{r.time}</span></span>}
                  </div>
                  {r.registration_link&&(
                    <a href={r.registration_link} target="_blank" rel="noreferrer"
                      style={{background:C.accent,color:"#fff",padding:"8px 18px",borderRadius:9,
                        fontSize:".82rem",fontWeight:700,textDecoration:"none",
                        display:"inline-flex",alignItems:"center",gap:6,alignSelf:"flex-start",marginTop:4}}>
                      Apply Now →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── UPCOMING EVENTS ── */}
      <section style={{padding:"0 48px 80px"}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:20}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1.55rem",fontWeight:700}}>Upcoming Events</span>
          <span style={{fontSize:".8rem",color:"#aaa"}}>{upcoming.length} events</span>
        </div>
        {upcoming.length===0 ? (
          <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>No upcoming events yet.</div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
            {upcoming.map(ev=><EventCard key={ev.id} ev={ev} onClick={onEventClick}/>)}
          </div>
        )}
      </section>

      {showAuth && <AuthModal onClose={()=>setShowAuth(false)}/>}
    </div>
  );
}

/* ── Root app with simple event-based routing ───────────────────────────── */
function AppInner() {
  const { user, loading } = useAuth();
  const [page,      setPage]      = useState("home");
  const [clubId,    setClubId]    = useState(null);
  const [eventId,   setEventId]   = useState(null);
  const [eventType, setEventType] = useState("club");
  const [adminView, setAdminView] = useState("dashboard"); // track admin internal view
  const [verifyMsg, setVerifyMsg] = useState("");
  // History stack — each entry: {page, clubId, eventId, eventType, adminView}
  const [navHistory, setNavHistory] = useState([]);

  const pushNav = () => {
    setNavHistory(h => [...h, { page, clubId, eventId, eventType, adminView }]);
  };

  const goBack = () => {
    setNavHistory(h => {
      if (h.length === 0) {
        setPage("home"); setClubId(null); setEventId(null);
        return h;
      }
      const prev = h[h.length - 1];
      setPage(prev.page);
      setClubId(prev.clubId);
      setEventId(prev.eventId);
      setEventType(prev.eventType);
      setAdminView(prev.adminView || "dashboard");
      return h.slice(0, -1);
    });
  };

  useEffect(() => {
    const fn = e => { pushNav(); setPage(e.detail); };
    window.addEventListener("cv:nav", fn);
    return () => window.removeEventListener("cv:nav", fn);
  }, [page, clubId, eventId, eventType, adminView]);

  const goHome    = () => { setPage("home"); setClubId(null); setEventId(null); setNavHistory([]); };
  const goProfile = () => { pushNav(); setPage("profile"); };
  const goClub    = id  => { pushNav(); setClubId(id); setPage("club"); };
  const goEvent   = ev  => {
    // ev can be an event object (from EventCard) or just {id, eventType}
    const type = ev.club_id ? "club" : "general";
    pushNav();
    setEventId(ev.id);
    setEventType(type);
    setPage("event");
  };

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
        fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#7a7265"}}>Loading…</div>
  );

  if (page==="admin") {
    if (!user || user.role!=="admin") return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          height:"100vh",gap:16,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
        <div style={{fontSize:"2.4rem"}}>🔒</div>
        <h2>Admin access required</h2>
        <p style={{color:"#7a7265",fontSize:".9rem"}}>Please log in with an admin account.</p>
        <button onClick={goHome} style={{background:"#17150f",color:"#fff",border:"none",borderRadius:10,
            padding:"10px 24px",cursor:"pointer",fontWeight:600,marginTop:8}}>← Go Home</button>
      </div>
    );
    return (
      <AdminDashboard
        initialView={adminView}
        onViewChange={v => setAdminView(v)}
        onBack={goBack}
        onClubClick={id => { pushNav(); setClubId(id); setPage("club"); }}
        onEventClick={ev => {
          if (ev._openClub && ev.club_id) { pushNav(); setClubId(ev.club_id); setPage("club"); return; }
          goEvent(ev);
        }}
      />
    );
  }

  if (page==="moderator") {
    if (!user || user.role!=="moderator") return null;
    return (
      <ModeratorDashboard
        onBack={goBack}
        onEventClick={goEvent}
      />
    );
  }

  if (page==="profile" && user?.role!=="admin") return <ProfilePage onClubClick={goClub} onBack={goBack}/>;

  if (page==="club" && clubId) return <ClubPage clubId={clubId} onBack={goBack} onEventClick={goEvent}/>;

  if (page==="event" && eventId) return (
    <EventPage
      eventId={eventId}
      eventType={eventType}
      onBack={goBack}
      onClubClick={goClub}
    />
  );

  return <HomePage onClubClick={goClub} onProfile={goProfile} onEventClick={goEvent}/>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner/>
    </AuthProvider>
  );
}
