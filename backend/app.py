"""
ClubVerse Backend — Flask + SQLite
Default admin: admin@clubverse.edu / admin123
"""
import os, json, uuid, smtplib, secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3, jwt, bcrypt

BASE   = os.path.dirname(os.path.abspath(__file__))
DB     = os.path.join(BASE, "clubverse.db")
UPL    = os.path.join(BASE, "uploads")
SECRET = "clubverse-fixed-secret-2026-xK9mP2qL8nR5vT3wY7uA4jD6hF1cB0eG"

# ── Email config — fill these in ──────────────────────────────────────────
SMTP_EMAIL    = "club.versetoyou@gmail.com"       # your Gmail address
SMTP_PASSWORD = "oiefandbpnzbpszv"     # Gmail App Password (16 chars)
SMTP_HOST     = "smtp.gmail.com"
SMTP_PORT     = 587
FRONTEND_URL  = "http://localhost:5173"      # your frontend URL
# ─────────────────────────────────────────────────────────────────────────

os.makedirs(os.path.join(UPL,"clubs"),  exist_ok=True)
os.makedirs(os.path.join(UPL,"events"), exist_ok=True)

app = Flask(__name__)
CORS(app)

def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    return c

def rows(q): return [dict(r) for r in q]
def row(r):  return dict(r) if r else None

def init_db():
    with conn() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
            interests TEXT DEFAULT '[]',
            is_verified INTEGER DEFAULT 0,
            otp TEXT,
            otp_expiry TEXT,
            created TEXT DEFAULT(datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS clubs(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, description TEXT,
            department TEXT DEFAULT 'General',
            icon_url TEXT, tags TEXT DEFAULT '[]',
            email TEXT DEFAULT '',
            created TEXT DEFAULT(datetime('now')),
            updated TEXT DEFAULT(datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS execom_members(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            club_id INTEGER NOT NULL,
            name TEXT NOT NULL, position TEXT,
            email TEXT, phone TEXT, linkedin TEXT,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY(club_id) REFERENCES clubs(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS events(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            club_id INTEGER NOT NULL,
            title TEXT NOT NULL, description TEXT,
            event_date TEXT NOT NULL, event_time TEXT,
            location TEXT,
            registration_link TEXT,
            thumbnail_url TEXT, picture_url TEXT,
            is_past INTEGER DEFAULT 0,
            created TEXT DEFAULT(datetime('now')),
            FOREIGN KEY(club_id) REFERENCES clubs(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS event_coordinators(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            name TEXT NOT NULL, position TEXT,
            email TEXT, phone TEXT,
            FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS general_events(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL, description TEXT,
            event_date TEXT NOT NULL, event_time TEXT,
            location TEXT,
            registration_link TEXT,
            thumbnail_url TEXT, picture_url TEXT,
            is_past INTEGER DEFAULT 0,
            created TEXT DEFAULT(datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS recruitments(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            club_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            last_date TEXT NOT NULL,
            venue TEXT,
            time TEXT,
            registration_link TEXT,
            is_active INTEGER DEFAULT 1,
            created TEXT DEFAULT(datetime('now')),
            FOREIGN KEY(club_id) REFERENCES clubs(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS subscriptions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            club_id INTEGER NOT NULL,
            created TEXT DEFAULT(datetime('now')),
            UNIQUE(user_id, club_id),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(club_id) REFERENCES clubs(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS notifications(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            club_name TEXT,
            event_title TEXT,
            event_date TEXT,
            event_time TEXT,
            is_read INTEGER DEFAULT 0,
            created TEXT DEFAULT(datetime('now')),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        # Migrate: add verification columns to users if missing
        ucols = [r[1] for r in c.execute("PRAGMA table_info(users)").fetchall()]
        if "is_verified" not in ucols:
            c.execute("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0")
            c.commit()
        if "otp" not in ucols:
            c.execute("ALTER TABLE users ADD COLUMN otp TEXT")
            c.commit()
        if "otp_expiry" not in ucols:
            c.execute("ALTER TABLE users ADD COLUMN otp_expiry TEXT")
            c.commit()
        # Migrate: add location to events if missing
        ev_cols = [r[1] for r in c.execute("PRAGMA table_info(events)").fetchall()]
        if "location" not in ev_cols:
            c.execute("ALTER TABLE events ADD COLUMN location TEXT")
            c.commit()
        gen_cols = [r[1] for r in c.execute("PRAGMA table_info(general_events)").fetchall()]
        if "location" not in gen_cols:
            c.execute("ALTER TABLE general_events ADD COLUMN location TEXT")
            c.commit()
        # Migrate: add recruitments table if missing
        c.execute("""CREATE TABLE IF NOT EXISTS recruitments(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            club_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            last_date TEXT NOT NULL,
            registration_link TEXT,
            is_active INTEGER DEFAULT 1,
            created TEXT DEFAULT(datetime('now')),
            FOREIGN KEY(club_id) REFERENCES clubs(id) ON DELETE CASCADE
        )""")
        c.commit()
        # Migrate: add venue and time to recruitments if missing
        rec_cols = [r[1] for r in c.execute("PRAGMA table_info(recruitments)").fetchall()]
        if "venue" not in rec_cols:
            c.execute("ALTER TABLE recruitments ADD COLUMN venue TEXT")
            c.commit()
        if "time" not in rec_cols:
            c.execute("ALTER TABLE recruitments ADD COLUMN time TEXT")
            c.commit()
        # Migrate: add location to events if missing
        ev_cols = [r[1] for r in c.execute("PRAGMA table_info(events)").fetchall()]
        if "location" not in ev_cols:
            c.execute("ALTER TABLE events ADD COLUMN location TEXT")
            c.commit()
        gev_cols = [r[1] for r in c.execute("PRAGMA table_info(general_events)").fetchall()]
        if "location" not in gev_cols:
            c.execute("ALTER TABLE general_events ADD COLUMN location TEXT")
            c.commit()
        # Migrate: add event_time to notifications if missing
        cols = [r[1] for r in c.execute("PRAGMA table_info(notifications)").fetchall()]
        if "event_time" not in cols:
            c.execute("ALTER TABLE notifications ADD COLUMN event_time TEXT")
            c.commit()
        # Migrate: add email to clubs if missing
        club_cols = [r[1] for r in c.execute("PRAGMA table_info(clubs)").fetchall()]
        if "email" not in club_cols:
            c.execute("ALTER TABLE clubs ADD COLUMN email TEXT DEFAULT ''")
            c.commit()
        existing_admin = c.execute("SELECT id FROM users WHERE email=?",("admin@clubverse.edu",)).fetchone()
        h = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
        if not existing_admin:
            c.execute("INSERT INTO users(name,email,password,role,is_verified) VALUES(?,?,?,?,1)",
                      ("Admin","admin@clubverse.edu",h,"admin"))
        else:
            c.execute("UPDATE users SET password=?,role='admin',is_verified=1 WHERE email=?",
                      (h,"admin@clubverse.edu"))
        c.commit()
    print("DB ready — admin@clubverse.edu / admin123")

def mark_past():
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")
    now_time = now.strftime("%H:%M")
    with conn() as c:
        c.execute(
            "UPDATE events SET is_past=1 WHERE is_past=0 AND ("
            "event_date<? OR (event_date=? AND event_time IS NOT NULL AND event_time<=?)"
            " OR (event_date=? AND event_time IS NULL))",
            (today, today, now_time, today))
        c.execute(
            "UPDATE general_events SET is_past=1 WHERE is_past=0 AND ("
            "event_date<? OR (event_date=? AND event_time IS NOT NULL AND event_time<=?)"
            " OR (event_date=? AND event_time IS NULL))",
            (today, today, now_time, today))
        c.commit()

def make_token(uid, role):
    payload = {"sub": str(uid), "role": role, "exp": datetime.utcnow() + timedelta(hours=24)}
    return jwt.encode(payload, SECRET, algorithm="HS256")

def decode_token(t):
    return jwt.decode(t, SECRET, algorithms=["HS256"], options={"verify_exp": False})

def auth_required(f):
    @wraps(f)
    def wrap(*a, **kw):
        t = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
        if not t:
            return jsonify({"success": False, "error": "Token missing"}), 401
        try:
            p = decode_token(t)
        except Exception as e:
            return jsonify({"success": False, "error": "Invalid token"}), 401
        request.uid = int(p["sub"])
        request.role = p["role"]
        return f(*a, **kw)
    return wrap

def admin_required(f):
    @wraps(f)
    def wrap(*a, **kw):
        t = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
        if not t:
            return jsonify({"success": False, "error": "Token missing"}), 401
        try:
            p = decode_token(t)
        except Exception as e:
            return jsonify({"success": False, "error": "Invalid token"}), 401
        request.uid = int(p["sub"])
        request.role = p["role"]
        if request.role != "admin":
            return jsonify({"success": False, "error": "Admin only"}), 403
        return f(*a, **kw)
    return wrap

ok  = lambda d,s=200: (jsonify({"success":True,"data":d}),s)
err = lambda m,s=400: (jsonify({"success":False,"error":m}),s)

def save_file(f,sub):
    ext  = os.path.splitext(f.filename or "img.jpg")[1].lower() or ".jpg"
    name = uuid.uuid4().hex+ext
    f.save(os.path.join(UPL,sub,name))
    return f"/api/uploads/{sub}/{name}"

def notify_subscribers(club_id, club_name, event_title, event_date, event_time=None):
    with conn() as c:
        subs = rows(c.execute("SELECT user_id FROM subscriptions WHERE club_id=?",(club_id,)).fetchall())
        for s in subs:
            c.execute("INSERT INTO notifications(user_id,message,club_name,event_title,event_date,event_time) VALUES(?,?,?,?,?,?)",
                      (s["user_id"], f"{club_name} has a new event: {event_title}", club_name, event_title, event_date, event_time))
        c.commit()

def send_otp_email(email, name, otp):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your ClubVerse verification code"
        msg["From"]    = SMTP_EMAIL
        msg["To"]      = email
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#b84a1e;font-size:1.6rem;margin-bottom:8px">Welcome to ClubVerse, {name}!</h2>
          <p style="color:#555;margin-bottom:24px">Use the code below to verify your email address.</p>
          <div style="background:#fdf0eb;border:2px solid #b84a1e;border-radius:12px;
               padding:24px;text-align:center;margin-bottom:24px">
            <span style="font-size:2.4rem;font-weight:900;letter-spacing:8px;color:#b84a1e">{otp}</span>
          </div>
          <p style="color:#aaa;font-size:.82rem">This code expires in 10 minutes.</p>
          <p style="color:#aaa;font-size:.78rem;margin-top:8px">If you didn't register, ignore this email.</p>
        </div>"""
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_EMAIL, SMTP_PASSWORD)
            s.sendmail(SMTP_EMAIL, email, msg.as_string())
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

@app.route("/api/uploads/<sub>/<fname>")
def serve(sub,fname): return send_from_directory(os.path.join(UPL,sub),fname)

@app.route("/api/health")
def health(): return ok({"status":"ok"})

# AUTH
# Step 1: Send OTP to email (no account created yet)
@app.route("/api/auth/send-otp",methods=["POST"])
def send_otp():
    b=request.get_json() or {}
    name=(b.get("name") or "").strip()
    email=(b.get("email") or "").strip().lower()
    if not name or not email: return err("Name and email required")
    # Check if already a verified user
    with conn() as c:
        existing = c.execute("SELECT id,is_verified FROM users WHERE email=?",(email,)).fetchone()
    if existing and existing["is_verified"]:
        return err("Email already registered. Please login.")
    otp = str(secrets.randbelow(900000) + 100000)
    expiry = (datetime.utcnow() + timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S")
    with conn() as c:
        if existing:
            # Update OTP for unverified user
            c.execute("UPDATE users SET name=?,otp=?,otp_expiry=? WHERE email=?",(name,otp,expiry,email))
        else:
            # Create placeholder account (no password yet)
            c.execute("INSERT INTO users(name,email,password,otp,otp_expiry) VALUES(?,?,?,?,?)",
                      (name,email,"__unset__",otp,expiry))
        c.commit()
    sent = send_otp_email(email, name, otp)
    if not sent: return err("Failed to send email. Check server config.")
    return ok({"sent":True})

# Step 2: Verify OTP
@app.route("/api/auth/verify-otp",methods=["POST"])
def verify_otp():
    b=request.get_json() or {}
    email=(b.get("email") or "").strip().lower()
    otp=(b.get("otp") or "").strip()
    if not email or not otp: return err("Email and OTP required")
    with conn() as c:
        u=c.execute("SELECT id,otp,otp_expiry,is_verified FROM users WHERE email=?",(email,)).fetchone()
    if not u: return err("Email not found",404)
    if not u["otp"] or u["otp"]!=otp: return err("Invalid code",400)
    if datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S") > (u["otp_expiry"] or ""):
        return err("Code expired. Please request a new one.",400)
    # Mark email as verified, clear OTP
    with conn() as c:
        c.execute("UPDATE users SET is_verified=1,otp=NULL,otp_expiry=NULL WHERE id=?",(u["id"],))
        c.commit()
    return ok({"verified":True,"uid":u["id"]})

# Step 3: Set password and complete registration
@app.route("/api/auth/set-password",methods=["POST"])
def set_password():
    b=request.get_json() or {}
    email=(b.get("email") or "").strip().lower()
    pwd=(b.get("password") or "")
    if not email or not pwd: return err("Email and password required")
    if len(pwd)<6: return err("Password must be at least 6 characters")
    with conn() as c:
        u=c.execute("SELECT id,name,role,is_verified FROM users WHERE email=?",(email,)).fetchone()
    if not u: return err("Email not found",404)
    if not u["is_verified"]: return err("Email not verified",403)
    h=bcrypt.hashpw(pwd.encode(),bcrypt.gensalt()).decode()
    with conn() as c:
        c.execute("UPDATE users SET password=? WHERE id=?",(h,u["id"]))
        c.commit()
    return ok({"token":make_token(u["id"],u["role"]),
               "user":{"id":u["id"],"name":u["name"],"email":email,
                       "role":u["role"],"interests":[],"is_verified":1}},201)

# Resend OTP
@app.route("/api/auth/resend-otp",methods=["POST"])
def resend_otp():
    b=request.get_json() or {}
    email=(b.get("email") or "").strip().lower()
    if not email: return err("Email required")
    with conn() as c:
        u=c.execute("SELECT name,is_verified FROM users WHERE email=?",(email,)).fetchone()
    if not u: return err("Email not found",404)
    if u["is_verified"]: return err("Already verified")
    otp = str(secrets.randbelow(900000) + 100000)
    expiry = (datetime.utcnow() + timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S")
    with conn() as c:
        c.execute("UPDATE users SET otp=?,otp_expiry=? WHERE email=?",(otp,expiry,email))
        c.commit()
    send_otp_email(email, u["name"], otp)
    return ok({"sent":True})

@app.route("/api/auth/login",methods=["POST"])
def login():
    b=request.get_json() or {}
    email=(b.get("email") or "").strip().lower()
    pwd=(b.get("password") or "")
    with conn() as c:
        u=c.execute("SELECT * FROM users WHERE email=?",(email,)).fetchone()
    if not u: return err("Invalid email or password",401)
    if not u["is_verified"]: return err("Please verify your email before logging in",403)
    if u["password"]=="__unset__" or not bcrypt.checkpw(pwd.encode(),u["password"].encode()):
        return err("Invalid email or password",401)
    interests = json.loads(u["interests"] or "[]")
    return ok({"token":make_token(u["id"],u["role"]),
               "user":{"id":u["id"],"name":u["name"],"email":u["email"],"role":u["role"],
                       "interests":interests,"is_verified":u["is_verified"]}})

@app.route("/api/auth/me")
@auth_required
def me():
    with conn() as c:
        u=c.execute("SELECT id,name,email,role,interests,is_verified FROM users WHERE id=?",(request.uid,)).fetchone()
    if not u: return err("Not found",404)
    d=dict(u)
    d["interests"]=json.loads(d.get("interests") or "[]")
    d["is_verified"]=d.get("is_verified",0)
    return ok(d)

@app.route("/api/auth/interests",methods=["PUT"])
@auth_required
def update_interests():
    b=request.get_json() or {}
    interests=b.get("interests",[])
    with conn() as c:
        c.execute("UPDATE users SET interests=? WHERE id=?",(json.dumps(interests),request.uid))
        c.commit()
    return ok({"interests":interests})

# CLUBS
@app.route("/api/clubs")
def list_clubs():
    mark_past()
    with conn() as c:
        cl=rows(c.execute("SELECT * FROM clubs ORDER BY name").fetchall())
    for x in cl: x["tags"]=json.loads(x.get("tags") or "[]")
    return ok(cl)

@app.route("/api/clubs/<int:cid>")
def get_club(cid):
    mark_past()
    with conn() as c:
        cl=row(c.execute("SELECT * FROM clubs WHERE id=?",(cid,)).fetchone())
        if not cl: return err("Not found",404)
        cl["tags"]=json.loads(cl.get("tags") or "[]")
        cl["execom"]=rows(c.execute(
            "SELECT * FROM execom_members WHERE club_id=? ORDER BY sort_order,id",(cid,)).fetchall())
        evs=rows(c.execute("SELECT * FROM events WHERE club_id=? ORDER BY event_date",(cid,)).fetchall())
        for ev in evs:
            ev["coordinators"]=rows(c.execute(
                "SELECT * FROM event_coordinators WHERE event_id=?",(ev["id"],)).fetchall())
        cl["events"]=evs
        cl["recruitments"]=rows(c.execute(
            "SELECT * FROM recruitments WHERE club_id=? ORDER BY created DESC",(cid,)).fetchall())
    return ok(cl)

@app.route("/api/clubs",methods=["POST"])
@admin_required
def create_club():
    name=(request.form.get("name") or "").strip()
    if not name: return err("name required")
    desc=request.form.get("description","")
    dept=request.form.get("department","General")
    try: tags=json.loads(request.form.get("tags","[]"))
    except: tags=[t.strip() for t in request.form.get("tags","").split(",") if t.strip()]
    email=request.form.get("email","")
    icon=save_file(request.files["icon"],"clubs") if "icon" in request.files else None
    with conn() as c:
        cur=c.execute("INSERT INTO clubs(name,description,department,icon_url,tags,email) VALUES(?,?,?,?,?,?)",
                      (name,desc,dept,icon,json.dumps(tags),email))
        cid=cur.lastrowid; c.commit()
    return ok({"id":cid,"name":name},201)

@app.route("/api/clubs/<int:cid>",methods=["PUT"])
@admin_required
def update_club(cid):
    name=(request.form.get("name") or "").strip()
    desc=request.form.get("description","")
    dept=request.form.get("department","General")
    try: tags=json.loads(request.form.get("tags","[]"))
    except: tags=[t.strip() for t in request.form.get("tags","").split(",") if t.strip()]
    email=request.form.get("email","")
    icon=request.form.get("existing_icon_url") or None
    if "icon" in request.files: icon=save_file(request.files["icon"],"clubs")
    with conn() as c:
        c.execute("UPDATE clubs SET name=?,description=?,department=?,icon_url=?,tags=?,email=?,"
                  "updated=datetime('now') WHERE id=?",(name,desc,dept,icon,json.dumps(tags),email,cid))
        c.commit()
    return ok({"id":cid})

@app.route("/api/clubs/<int:cid>",methods=["DELETE"])
@admin_required
def delete_club(cid):
    with conn() as c:
        c.execute("DELETE FROM clubs WHERE id=?",(cid,)); c.commit()
    return ok({"deleted":cid})

# EXECOM
@app.route("/api/clubs/<int:cid>/execom",methods=["POST"])
@admin_required
def add_execom(cid):
    b=request.get_json() or {}
    name=(b.get("name") or "").strip()
    if not name: return err("name required")
    with conn() as c:
        cur=c.execute("INSERT INTO execom_members(club_id,name,position,email,phone,linkedin,sort_order)"
                      " VALUES(?,?,?,?,?,?,?)",
                      (cid,name,b.get("position",""),b.get("email",""),
                       b.get("phone",""),b.get("linkedin",""),b.get("sort_order",0)))
        mid=cur.lastrowid; c.commit()
    return ok({"id":mid},201)

@app.route("/api/execom/<int:mid>",methods=["PUT"])
@admin_required
def update_execom(mid):
    b=request.get_json() or {}
    with conn() as c:
        c.execute("UPDATE execom_members SET name=?,position=?,email=?,phone=?,linkedin=?,sort_order=? WHERE id=?",
                  (b.get("name",""),b.get("position",""),b.get("email",""),
                   b.get("phone",""),b.get("linkedin",""),b.get("sort_order",0),mid))
        c.commit()
    return ok({"id":mid})

@app.route("/api/execom/<int:mid>",methods=["DELETE"])
@admin_required
def delete_execom(mid):
    with conn() as c:
        c.execute("DELETE FROM execom_members WHERE id=?",(mid,)); c.commit()
    return ok({"deleted":mid})

# CLUB EVENTS
@app.route("/api/events")
def list_events():
    mark_past()
    upcoming=request.args.get("upcoming")=="1"
    with conn() as c:
        base="SELECT e.*,c.name as club_name,c.icon_url as club_icon FROM events e JOIN clubs c ON e.club_id=c.id "
        if upcoming:
            evs=rows(c.execute(base+"WHERE e.is_past=0 ORDER BY e.event_date").fetchall())
        else:
            evs=rows(c.execute(base+"ORDER BY e.event_date").fetchall())
        for ev in evs:
            ev["coordinators"]=rows(c.execute(
                "SELECT * FROM event_coordinators WHERE event_id=?",(ev["id"],)).fetchall())
    return ok(evs)

@app.route("/api/clubs/<int:cid>/events",methods=["POST"])
@admin_required
def create_event(cid):
    title=(request.form.get("title") or "").strip()
    date=(request.form.get("event_date") or "").strip()
    if not title or not date: return err("title and event_date required")
    desc=request.form.get("description","")
    time_=request.form.get("event_time","")
    loc=request.form.get("location","")
    reg=request.form.get("registration_link","")
    today=datetime.utcnow().strftime("%Y-%m-%d")
    past=1 if date<today else 0
    try: coords=json.loads(request.form.get("coordinators","[]"))
    except: coords=[]
    thumb=save_file(request.files["thumbnail"],"events") if "thumbnail" in request.files else None
    pic=save_file(request.files["picture"],"events") if ("picture" in request.files and past) else None
    with conn() as c:
        cur=c.execute("INSERT INTO events(club_id,title,description,event_date,event_time,"
                      "location,registration_link,thumbnail_url,picture_url,is_past) VALUES(?,?,?,?,?,?,?,?,?,?)",
                      (cid,title,desc,date,time_,loc,reg,thumb,pic,past))
        eid=cur.lastrowid
        for co in coords:
            c.execute("INSERT INTO event_coordinators(event_id,name,position,email,phone) VALUES(?,?,?,?,?)",
                      (eid,co.get("name",""),co.get("position",""),co.get("email",""),co.get("phone","")))
        cl=c.execute("SELECT name FROM clubs WHERE id=?",(cid,)).fetchone()
        c.commit()
    if cl and not past:
        notify_subscribers(cid, cl["name"], title, date, time_)
    return ok({"id":eid,"title":title},201)

@app.route("/api/events/<int:eid>",methods=["PUT"])
@admin_required
def update_event(eid):
    title=(request.form.get("title") or "").strip()
    date=(request.form.get("event_date") or "").strip()
    desc=request.form.get("description","")
    time_=request.form.get("event_time","")
    loc=request.form.get("location","")
    reg=request.form.get("registration_link","")
    today=datetime.utcnow().strftime("%Y-%m-%d")
    past=1 if date<today else 0
    try: coords=json.loads(request.form.get("coordinators","[]"))
    except: coords=[]
    thumb=request.form.get("existing_thumbnail_url") or None
    if "thumbnail" in request.files: thumb=save_file(request.files["thumbnail"],"events")
    pic=request.form.get("existing_picture_url") or None
    if "picture" in request.files: pic=save_file(request.files["picture"],"events")
    with conn() as c:
        c.execute("UPDATE events SET title=?,description=?,event_date=?,event_time=?,"
                  "location=?,registration_link=?,thumbnail_url=?,picture_url=?,is_past=? WHERE id=?",
                  (title,desc,date,time_,loc,reg,thumb,pic,past,eid))
        c.execute("DELETE FROM event_coordinators WHERE event_id=?",(eid,))
        for co in coords:
            c.execute("INSERT INTO event_coordinators(event_id,name,position,email,phone) VALUES(?,?,?,?,?)",
                      (eid,co.get("name",""),co.get("position",""),co.get("email",""),co.get("phone","")))
        c.commit()
    return ok({"id":eid})

@app.route("/api/events/<int:eid>",methods=["DELETE"])
@admin_required
def delete_event(eid):
    with conn() as c:
        c.execute("DELETE FROM events WHERE id=?",(eid,)); c.commit()
    return ok({"deleted":eid})

# GENERAL EVENTS
@app.route("/api/general-events", methods=["GET"])
def list_general_events():
    mark_past()
    upcoming=request.args.get("upcoming")=="1"
    with conn() as c:
        if upcoming:
            today=datetime.utcnow().strftime("%Y-%m-%d")
            evs=rows(c.execute("SELECT * FROM general_events WHERE event_date>=? ORDER BY event_date",(today,)).fetchall())
        else:
            evs=rows(c.execute("SELECT * FROM general_events ORDER BY event_date").fetchall())
    return ok(evs)

@app.route("/api/general-events", methods=["POST"])
@admin_required
def create_general_event():
    title=(request.form.get("title") or "").strip()
    date=(request.form.get("event_date") or "").strip()
    if not title or not date: return err("title and event_date required")
    desc=request.form.get("description","")
    time_=request.form.get("event_time","")
    loc=request.form.get("location","")
    reg=request.form.get("registration_link","")
    today=datetime.utcnow().strftime("%Y-%m-%d")
    past=1 if date<today else 0
    thumb=save_file(request.files["thumbnail"],"events") if "thumbnail" in request.files else None
    pic=save_file(request.files["picture"],"events") if ("picture" in request.files and past) else None
    with conn() as c:
        cur=c.execute("INSERT INTO general_events(title,description,event_date,event_time,"
                      "location,registration_link,thumbnail_url,picture_url,is_past) VALUES(?,?,?,?,?,?,?,?,?)",
                      (title,desc,date,time_,loc,reg,thumb,pic,past))
        eid=cur.lastrowid; c.commit()
    # Notify all users about general (college-wide) events
    if not past:
        with conn() as c:
            all_users = rows(c.execute("SELECT id FROM users").fetchall())
            for u in all_users:
                c.execute("INSERT INTO notifications(user_id,message,club_name,event_title,event_date) VALUES(?,?,?,?,?)",
                          (u["id"], f"College Event: {title}", "College Event", title, date))
            c.commit()
    return ok({"id":eid,"title":title},201)

@app.route("/api/general-events/<int:eid>", methods=["PUT"])
@admin_required
def update_general_event(eid):
    title=(request.form.get("title") or "").strip()
    date=(request.form.get("event_date") or "").strip()
    desc=request.form.get("description","")
    time_=request.form.get("event_time","")
    loc=request.form.get("location","")
    reg=request.form.get("registration_link","")
    today=datetime.utcnow().strftime("%Y-%m-%d")
    past=1 if date<today else 0
    thumb=request.form.get("existing_thumbnail_url") or None
    if "thumbnail" in request.files: thumb=save_file(request.files["thumbnail"],"events")
    pic=request.form.get("existing_picture_url") or None
    if "picture" in request.files: pic=save_file(request.files["picture"],"events")
    with conn() as c:
        c.execute("UPDATE general_events SET title=?,description=?,event_date=?,event_time=?,"
                  "location=?,registration_link=?,thumbnail_url=?,picture_url=?,is_past=? WHERE id=?",
                  (title,desc,date,time_,loc,reg,thumb,pic,past,eid))
        c.commit()
    return ok({"id":eid})

@app.route("/api/general-events/<int:eid>", methods=["DELETE"])
@admin_required
def delete_general_event(eid):
    with conn() as c:
        c.execute("DELETE FROM general_events WHERE id=?",(eid,)); c.commit()
    return ok({"deleted":eid})

# RECRUITMENTS
@app.route("/api/clubs/<int:cid>/recruitments", methods=["GET"])
def list_recruitments(cid):
    with conn() as c:
        recs = rows(c.execute(
            "SELECT * FROM recruitments WHERE club_id=? ORDER BY created DESC",(cid,)).fetchall())
    return ok(recs)

@app.route("/api/clubs/<int:cid>/recruitments", methods=["POST"])
@admin_required
def create_recruitment(cid):
    b = request.get_json() or {}
    title = (b.get("title") or "").strip()
    last_date = (b.get("last_date") or "").strip()
    if not title or not last_date: return err("title and last_date required")
    desc = b.get("description","")
    link = b.get("registration_link","")
    venue = b.get("venue","")
    time_ = b.get("time","")
    with conn() as c:
        cur = c.execute(
            "INSERT INTO recruitments(club_id,title,description,last_date,venue,time,registration_link) VALUES(?,?,?,?,?,?,?)",
            (cid,title,desc,last_date,venue,time_,link))
        rid = cur.lastrowid; c.commit()
    return ok({"id":rid,"title":title},201)

@app.route("/api/recruitments/<int:rid>", methods=["PUT"])
@admin_required
def update_recruitment(rid):
    b = request.get_json() or {}
    title = (b.get("title") or "").strip()
    last_date = (b.get("last_date") or "").strip()
    desc = b.get("description","")
    link = b.get("registration_link","")
    venue = b.get("venue","")
    time_ = b.get("time","")
    is_active = 1 if b.get("is_active",True) else 0
    with conn() as c:
        c.execute("UPDATE recruitments SET title=?,description=?,last_date=?,venue=?,time=?,registration_link=?,is_active=? WHERE id=?",
                  (title,desc,last_date,venue,time_,link,is_active,rid))
        c.commit()
    return ok({"id":rid})

@app.route("/api/recruitments/<int:rid>", methods=["DELETE"])
@admin_required
def delete_recruitment(rid):
    with conn() as c:
        c.execute("DELETE FROM recruitments WHERE id=?",(rid,)); c.commit()
    return ok({"deleted":rid})

@app.route("/api/recruitments")
def all_recruitments():
    with conn() as c:
        recs = rows(c.execute(
            "SELECT r.*,cl.name as club_name,cl.icon_url as club_icon FROM recruitments r "
            "JOIN clubs cl ON r.club_id=cl.id WHERE r.is_active=1 ORDER BY r.last_date").fetchall())
    return ok(recs)

# SUBSCRIPTIONS
def send_club_notifications(user_id, cid):
    """Insert notifications for all upcoming events of a club for a user, skip duplicates."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    with conn() as c:
        club = row(c.execute("SELECT name FROM clubs WHERE id=?",(cid,)).fetchone())
        if not club: return
        # Find last clear time for this user
        last_clear = c.execute(
            "SELECT event_date FROM notifications WHERE user_id=? AND message='__cleared__' ORDER BY event_date DESC LIMIT 1",
            (user_id,)).fetchone()
        upcoming = rows(c.execute(
            "SELECT title,event_date,event_time FROM events WHERE club_id=? AND event_date>=? ORDER BY event_date",
            (cid,today)).fetchall())
        for ev in upcoming:
            exists = c.execute(
                "SELECT id FROM notifications WHERE user_id=? AND event_title=? AND club_name=? AND message!='__cleared__'",
                (user_id, ev["title"], club["name"])).fetchone()
            if not exists:
                # Don't re-add if user cleared after this event was notified
                if last_clear and ev["event_date"] <= last_clear["event_date"]:
                    continue
                c.execute("INSERT INTO notifications(user_id,message,club_name,event_title,event_date,event_time) VALUES(?,?,?,?,?,?)",
                          (user_id, f"{club['name']} has an upcoming event: {ev['title']}",
                           club["name"], ev["title"], ev["event_date"], ev.get("event_time")))
        c.commit()

@app.route("/api/clubs/<int:cid>/subscribe", methods=["POST"])
@auth_required
def subscribe(cid):
    with conn() as c:
        u = c.execute("SELECT is_verified FROM users WHERE id=?",(request.uid,)).fetchone()
    if not u or not u["is_verified"]:
        return err("Please verify your email before subscribing",403)
    try:
        with conn() as c:
            c.execute("INSERT INTO subscriptions(user_id,club_id) VALUES(?,?)",(request.uid,cid))
            c.commit()
    except sqlite3.IntegrityError: pass
    send_club_notifications(request.uid, cid)
    return ok({"subscribed":True})

@app.route("/api/notifications/sync", methods=["POST"])
@auth_required
def sync_notifications():
    """Backfill notifications for all clubs the user is subscribed to."""
    with conn() as c:
        subs = rows(c.execute("SELECT club_id FROM subscriptions WHERE user_id=?",(request.uid,)).fetchall())
    for s in subs:
        send_club_notifications(request.uid, s["club_id"])
    return ok({"synced": len(subs)})

@app.route("/api/clubs/<int:cid>/subscribe", methods=["DELETE"])
@auth_required
def unsubscribe(cid):
    with conn() as c:
        c.execute("DELETE FROM subscriptions WHERE user_id=? AND club_id=?",(request.uid,cid))
        c.commit()
    return ok({"subscribed":False})

@app.route("/api/subscriptions")
@auth_required
def my_subscriptions():
    with conn() as c:
        subs=rows(c.execute(
            "SELECT c.* FROM clubs c JOIN subscriptions s ON c.id=s.club_id WHERE s.user_id=? ORDER BY c.name",
            (request.uid,)).fetchall())
    for s in subs: s["tags"]=json.loads(s.get("tags") or "[]")
    return ok(subs)

@app.route("/api/subscriptions/check/<int:cid>")
@auth_required
def check_subscription(cid):
    with conn() as c:
        sub=c.execute("SELECT id FROM subscriptions WHERE user_id=? AND club_id=?",(request.uid,cid)).fetchone()
    return ok({"subscribed": sub is not None})

# NOTIFICATIONS
@app.route("/api/notifications")
@auth_required
def get_notifications():
    with conn() as c:
        notifs=rows(c.execute(
            "SELECT * FROM notifications WHERE user_id=? AND message!='__cleared__' ORDER BY created DESC LIMIT 50",
            (request.uid,)).fetchall())
    return ok(notifs)

@app.route("/api/notifications/read", methods=["POST"])
@auth_required
def mark_read():
    with conn() as c:
        c.execute("UPDATE notifications SET is_read=1 WHERE user_id=?",(request.uid,))
        c.commit()
    return ok({"marked":True})

@app.route("/api/notifications/clear", methods=["DELETE"])
@auth_required
def clear_notifications():
    with conn() as c:
        c.execute("DELETE FROM notifications WHERE user_id=?",(request.uid,))
        # Record the clear time so sync won't re-insert old notifications
        c.execute("UPDATE users SET interests=interests WHERE id=?",(request.uid,))  # touch
        # Store cleared_at in a simple way: insert a sentinel notification
        c.execute("INSERT INTO notifications(user_id,message,club_name,is_read,event_date) VALUES(?,?,?,1,?)",
                  (request.uid, "__cleared__", "__system__",
                   datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")))
        c.commit()
    return ok({"cleared":True})

@app.route("/api/notifications/unread-count")
@auth_required
def unread_count():
    with conn() as c:
        count=c.execute("SELECT COUNT(*) as n FROM notifications WHERE user_id=? AND is_read=0",(request.uid,)).fetchone()
    return ok({"count":count["n"]})

if __name__=="__main__":
    init_db()
    print("ClubVerse backend -> http://localhost:8000")
    app.run(debug=True, port=8000, host="0.0.0.0")
