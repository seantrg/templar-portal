import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,query,orderBy,limit,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";

const auth=getAuth(initializeApp(firebaseConfig)),db=getFirestore(auth.app);
const $=s=>document.querySelector(s),main=$("#main");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let me=null,email="",unsubs=[],G=[],D={};
const off=()=>me&&["officer","admin"].includes(me.role),adm=()=>me?.role==="admin";
const ms=x=>x?.at?.toMillis?.()??Date.now(),dstr=x=>new Date(ms(x)).toLocaleDateString();
const fdt=s=>s?new Date(s).toLocaleString([],{dateStyle:"medium",timeStyle:"short"}):"";
const nowL=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16);
const sum=a=>a.reduce((s,x)=>s+(+x.hours||0),0),cnames=()=>(D.committees||[]).map(c=>c.name);
const toast=m=>{const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,4500)};
const show=id=>{["login","deny","app"].forEach(x=>$("#"+x).hidden=x!==id)};

/* ---------- data helpers ---------- */
function watch(n,cb){const ex=n==="chat"?[orderBy("at","desc"),limit(150)]:[];
  return onSnapshot(query(collection(db,n),...ex),s=>{D[n]=s.docs.map(d=>({id:d.id,...d.data()}));cb()},e=>toast(e.message))}
function need(ns,paint){unsubs.forEach(u=>u());unsubs=ns.map(n=>watch(n,()=>ns.every(x=>D[x])&&paint()))}
const add=(c,o)=>addDoc(collection(db,c),{by:email,byName:me.name,at:serverTimestamp(),...o});

/* ---------- ui helpers ---------- */
const head=(t,s,act="")=>`<header class="ph"><div><h1>${t}</h1><p>${s}</p></div>${act}</header>`;
const card=h=>`<div class="card">${h}</div>`;
const stat=(l,v,s="")=>`<div class="stat"><small>${l}</small><b>${v}</b><span>${s}</span></div>`;
const empty=t=>`<p class="empty">${t}</p>`;
const btn=(a,l,c="ghost sm")=>`<button class="${c}" data-a="${a}">${l}</button>`;
const opts=a=>a.map(o=>`<option>${esc(o)}</option>`).join("");

function form(title,fields,save){
  const d=$("#dlg");
  d.innerHTML=`<form method="dialog"><h3>${title}</h3>${fields.map(f=>`<label>${f.l}${
    f.o?`<select name="${f.k}">${opts(f.o)}</select>`
    :f.t==="area"?`<textarea name="${f.k}" required></textarea>`
    :`<input name="${f.k}" type="${f.t||"text"}"${f.t==="number"?' step="0.25" min="0"':""}${f.r===false?"":" required"}>`}</label>`).join("")}
    <div class="row"><button value="x" formnovalidate class="ghost">Cancel</button><button value="ok" class="btn">Save</button></div></form>`;
  d.querySelector("form").onsubmit=async e=>{
    if(e.submitter.value!=="ok")return;
    try{await save(Object.fromEntries(new FormData(e.target)))}catch(x){toast(x.message)}};
  d.showModal();
}

/* ---------- attendance math ---------- */
function rate(emails){
  const past=D.events.filter(e=>e.start<=nowL()),ids=new Set(past.map(e=>e.id)),em=new Set(emails);
  const rec=D.attendance.filter(a=>em.has(a.email)&&ids.has(a.eventId));
  const ex=rec.filter(a=>a.status==="Excused").length,pr=rec.filter(a=>a.status==="Present").length;
  const den=past.length*emails.length-ex;return den>0?Math.round(100*pr/den):100;
}

/* ---------- views ---------- */
const V={};
const feed=(col,t,s,label,fields,row,can,pre=o=>o)=>()=>{
  main.innerHTML=head(t,s,can()?`<button class="btn" id="new">+ ${label}</button>`:"")+`<div id="l"></div>`;
  if(can())$("#new").onclick=()=>form(label,fields(),o=>add(col,pre(o)));
  need([col],()=>$("#l").innerHTML=D[col].sort((a,b)=>ms(b)-ms(a)).map(x=>card(row(x)+(off()||x.by===email?btn(`del|${col}|${x.id}`,"Delete"):""))).join("")||empty("Nothing here yet."));
};

V.dashboard=()=>{
  main.innerHTML=head("Chapter Dashboard",`Welcome back, ${esc(me.name.split(" ")[0])}.`,`<button class="ghost" id="rf">⟳ Refresh Dashboard</button>`)+`<div class="stats" id="st"></div><div id="dg"></div>`;
  $("#rf").onclick=V.dashboard;
  need(["announcements","events","tasks","hours","attendance","polls","committees"],()=>{
    const mt=D.tasks.filter(t=>t.assignee===email&&t.status!=="Completed");
    const sec=(t,l,go,b)=>card(`<div class="split"><h3>${t}</h3><a href="#${go}">${l}</a></div><hr>${b}`);
    $("#st").innerHTML=stat("Service Hours",sum(D.hours.filter(h=>h.email===email&&h.status==="Approved")).toFixed(1),"Approved Total")
      +stat("Attendance Rate",rate([email])+"%","Chapter Standing")+stat("Open Tasks",mt.length,"Assigned to You")
      +stat("Active Votes",D.polls.filter(p=>p.status==="Open").length,"Ballots Open");
    const up=D.events.filter(e=>e.start>=nowL()).sort((a,b)=>a.start>b.start?1:-1).slice(0,5);
    $("#dg").innerHTML=
      sec("Announcements Feed","View All Announcements","announcements",D.announcements.sort((a,b)=>ms(b)-ms(a)).slice(0,3).map(a=>`<div class="mini"><b>${esc(a.title)}</b> <span class="pill">${esc(a.priority)}</span><p>${esc(a.body)}</p></div>`).join("")||empty("No announcements."))
      +sec("Upcoming Events (Next 5)","View Calendar","calendar",up.map(e=>`<div class="mini"><b>${esc(e.title)}</b><p>${fdt(e.start)} ${e.location?"• "+esc(e.location):""}</p></div>`).join("")||empty("No upcoming events."))
      +sec("My Tasks","View Tasks","tasks",mt.map(t=>`<div class="mini"><b>${esc(t.title)}</b><p>${esc(t.status)} • due ${esc(t.due||"—")}</p></div>`).join("")||empty("No pending tasks assigned."))
      +sec("Committee Updates","All Committees","committees",D.committees.map(c=>`<div class="mini"><b>${esc(c.name)}</b><p>Chair: ${esc(c.chair)}</p></div>`).join("")||empty("No committees yet."));
  });
};

V.announcements=()=>{
  main.innerHTML=head("Announcements","Official chapter directives, pinned notices, and committee alerts.",off()?`<button class="btn" id="new">+ Post</button>`:"")
    +`<div class="bar"><input id="q" placeholder="Search announcements…"><select id="cf"><option value="">All Committees</option>${opts(cnames())}</select></div><div id="l"></div>`;
  const paint=()=>{const q=$("#q").value.toLowerCase(),c=$("#cf").value;
    $("#l").innerHTML=D.announcements.filter(a=>(!c||a.committee===c)&&(a.title+a.body).toLowerCase().includes(q)).sort((a,b)=>ms(b)-ms(a))
      .map(a=>card(`<div class="split"><div><h3>${esc(a.title)}</h3><small>By ${esc(a.byName)} • ${esc(a.committee||"All")} • ${dstr(a)}</small></div><span class="pill ${a.priority==="Urgent"?"hot":""}">${esc(a.priority)}</span></div><hr><p>${esc(a.body)}</p>${off()?btn(`del|announcements|${a.id}`,"Delete"):""}`)).join("")||empty("No announcements yet.")};
  $("#q").oninput=$("#cf").onchange=paint;
  if(off())$("#new").onclick=()=>form("New announcement",[{k:"title",l:"Title"},{k:"body",l:"Message",t:"area"},{k:"committee",l:"Audience",o:["All",...cnames()]},{k:"priority",l:"Priority",o:["Normal","Important","Urgent"]}],o=>add("announcements",o));
  need(["announcements"],paint);
};

V.chat=()=>{
  main.innerHTML=head("General Chat","Chapter-wide brotherhood communication.",`<input id="q" placeholder="Search messages…" style="width:220px">`)
    +`<div class="chat"><div id="msgs"></div><form id="f"><input id="m" placeholder="Message the chapter…" autocomplete="off" required><button class="btn">Send</button></form></div>`;
  const paint=()=>{const q=$("#q").value.toLowerCase(),el=$("#msgs");
    el.innerHTML=D.chat.filter(m=>m.text.toLowerCase().includes(q)).sort((a,b)=>ms(a)-ms(b))
      .map(m=>`<div class="msg ${m.by===email?"me":""}"><small>${esc(m.byName)} • ${new Date(ms(m)).toLocaleTimeString([],{timeStyle:"short"})}${off()?btn(`del|chat|${m.id}`,"×","x"):""}</small><p>${esc(m.text)}</p></div>`).join("")||empty("No messages yet. Say hello.");
    el.scrollTop=el.scrollHeight};
  $("#q").oninput=paint;
  $("#f").onsubmit=async e=>{e.preventDefault();const i=$("#m"),t=i.value.trim();if(!t)return;i.value="";try{await add("chat",{text:t})}catch(x){toast(x.message)}};
  need(["chat"],paint);
};

let cm=new Date(),cmode="month";
V.calendar=()=>{
  main.innerHTML=head("Chapter Calendar","Meetings, service projects, deadlines, and brotherhood events.",`<div class="seg">${["month","week","agenda"].map(m=>`<button class="${m===cmode?"on":""}" data-m="${m}">${m[0].toUpperCase()+m.slice(1)}</button>`).join("")}</div>`)
    +(off()?`<p><button class="btn" id="new">+ Add event</button></p>`:"")
    +`<div class="card"><div class="split nav"><button class="ghost" id="pv" aria-label="Previous">‹</button><h2 id="ml"></h2><button class="ghost" id="nx" aria-label="Next">›</button></div><div id="cal"></div></div>`;
  document.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{cmode=b.dataset.m;V.calendar()});
  const step=n=>{cmode==="week"?cm.setDate(cm.getDate()+7*n):cm.setMonth(cm.getMonth()+n,1);V.calendar()};
  $("#pv").onclick=()=>step(-1);$("#nx").onclick=()=>step(1);
  if(off())$("#new").onclick=()=>form("Add event",[{k:"title",l:"Title"},{k:"start",l:"Starts",t:"datetime-local"},{k:"location",l:"Location",r:false},{k:"committee",l:"Committee",o:["All",...cnames()]}],o=>add("events",o));
  const line=e=>`<div class="ev"><b>${esc(e.title)}</b><small>${fdt(e.start)}${e.location?" • "+esc(e.location):""}${e.committee&&e.committee!=="All"?" • "+esc(e.committee):""}</small>${off()?btn(`del|events|${e.id}`,"Delete"):""}</div>`;
  need(["events"],()=>{
    const ev=D.events.slice().sort((a,b)=>a.start>b.start?1:-1),y=cm.getFullYear(),m=cm.getMonth(),today=new Date().toLocaleDateString("sv");
    if(cmode==="month"){
      $("#ml").textContent=cm.toLocaleString([],{month:"long",year:"numeric"});
      let h=`<div class="grid">${[..."SMTWTFS"].map(d=>`<b>${d}</b>`).join("")}`+"<i></i>".repeat(new Date(y,m,1).getDay());
      for(let d=1;d<=new Date(y,m+1,0).getDate();d++){
        const k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        h+=`<div class="day${k===today?" today":""}"><span>${d}</span>${ev.filter(e=>e.start?.startsWith(k)).map(e=>`<em title="${esc(e.title)}">${esc(e.title)}</em>`).join("")}</div>`}
      $("#cal").innerHTML=h+"</div>";
    }else{
      let list=ev;
      if(cmode==="week"){const s=new Date(cm);s.setDate(s.getDate()-s.getDay());const e=new Date(s);e.setDate(e.getDate()+7);
        const a=s.toLocaleDateString("sv"),b=e.toLocaleDateString("sv");list=ev.filter(x=>x.start.slice(0,10)>=a&&x.start.slice(0,10)<b);
        $("#ml").textContent="Week of "+s.toLocaleDateString([],{month:"short",day:"numeric"})}
      else{list=ev.filter(x=>x.start>=nowL());$("#ml").textContent="Upcoming";$("#pv").style.visibility=$("#nx").style.visibility="hidden"}
      $("#cal").innerHTML=list.map(line).join("")||empty("No events.");
    }
  });
};

let tf="All";
V.tasks=()=>{
  const S=["Not Started","In Progress","Blocked","Completed"];
  main.innerHTML=head("Tasks & Action Items","Track chapter assignments, committee deliverables, and due dates.",off()?`<button class="btn" id="new">+ New task</button>`:"")
    +`<div class="chips">${["All",...S].map(s=>`<button class="${s===tf?"on":""}" data-f="${s}">${s}</button>`).join("")}</div><div id="l"></div>`;
  document.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{tf=b.dataset.f;V.tasks()});
  if(off())$("#new").onclick=()=>form("New task",[{k:"title",l:"Task"},{k:"assignee",l:"Assignee email",t:"email"},{k:"due",l:"Due date",t:"date"},{k:"status",l:"Status",o:S}],o=>add("tasks",{...o,assignee:o.assignee.toLowerCase()}));
  need(["tasks"],()=>$("#l").innerHTML=D.tasks.filter(t=>tf==="All"||t.status===tf).sort((a,b)=>(a.due||"9")>(b.due||"9")?1:-1)
    .map(t=>card(`<div class="split"><div><h3>${esc(t.title)}</h3><small>${esc(t.assignee)} • due ${esc(t.due||"—")}</small></div>${off()||t.assignee===email?`<select style="width:auto" data-a="set|tasks|${t.id}|status">${S.map(s=>`<option${s===t.status?" selected":""}>${s}</option>`).join("")}</select>`:`<span class="pill">${esc(t.status)}</span>`}</div>${off()?btn(`del|tasks|${t.id}`,"Delete"):""}`)).join("")||empty("No tasks here."));
};

V.committees=feed("committees","Committees","Service, Social, Recruitment, and operational committees.","Add Committee",
  ()=>[{k:"name",l:"Name"},{k:"chair",l:"Chair (email)",t:"email"},{k:"desc",l:"Description",t:"area"}],
  x=>`<h3>${esc(x.name)}</h3><small>Chair: ${esc(x.chair)}</small><p>${esc(x.desc)}</p>`,off);

V.prayers=feed("prayers","Prayer Requests","Lift up brothers, families, and intentions in faith.","Submit Request",
  ()=>[{k:"text",l:"Request",t:"area"},{k:"who",l:"Share as",o:["My name","Anonymous"]}],
  x=>`<p>${esc(x.text)}</p><small>${esc(x.byName)} • ${dstr(x)}</small>`,()=>true,
  o=>({text:o.text,byName:o.who==="Anonymous"?"Anonymous":me.name}));

V.hours=()=>{
  main.innerHTML=head("Service Hours","Log community service and verify chapter impact.",`<button class="btn" id="new">+ Log Hours</button>`)
    +`<div class="stats" id="st"></div><div class="card tw"><table><thead><tr><th>Date</th><th>Member</th><th>Project</th><th>Hours</th><th>Status</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>`;
  $("#new").onclick=()=>form("Log hours",[{k:"project",l:"Project"},{k:"hours",l:"Hours",t:"number"}],o=>add("hours",{project:o.project,hours:+o.hours,committee:me.committee||"",email,status:"Pending"}));
  need(["hours"],()=>{
    const a=D.hours.filter(h=>h.status==="Approved");
    $("#st").innerHTML=stat("Personal Hours",sum(a.filter(h=>h.email===email)).toFixed(1))+stat("Committee Hours",sum(a.filter(h=>me.committee&&h.committee===me.committee)).toFixed(1))+stat("Organization Total",sum(a).toFixed(1));
    $("#tb").innerHTML=D.hours.sort((x,y)=>ms(y)-ms(x)).map(h=>`<tr><td>${dstr(h)}</td><td>${esc(h.byName)}</td><td>${esc(h.project)}</td><td>${esc(h.hours)}</td><td><span class="pill">${esc(h.status)}</span></td><td>${off()&&h.status==="Pending"?btn(`set|hours|${h.id}|status|Approved`,"Approve")+btn(`set|hours|${h.id}|status|Rejected`,"Reject"):""}</td></tr>`).join("")||`<tr><td colspan="6">${empty("No hours logged yet.")}</td></tr>`;
  });
};

V.attendance=()=>{
  main.innerHTML=head("Attendance","Event check-in, excused absences, and participation percentages.",`<button class="btn" id="new">Check In</button>`)
    +`<div class="stats" id="st"></div><div class="card tw"><table><thead><tr><th>Event</th><th>Date</th><th>Member</th><th>Status</th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const lab=e=>`${e.title} (${e.start.slice(0,10)})`;
  $("#new").onclick=()=>{
    if(!D.events.length)return toast("No events to check in to yet.");
    form("Check in",[{k:"ev",l:"Event",o:D.events.map(lab)},{k:"status",l:"Status",o:["Present","Excused"]}],async o=>{
      const e=D.events.find(x=>lab(x)===o.ev);
      await setDoc(doc(db,"attendance",`${e.id}_${email}`),{eventId:e.id,eventTitle:e.title,eventDate:e.start,email,name:me.name,status:o.status,by:email,at:serverTimestamp()});
    })};
  need(["attendance","events","roster"],()=>{
    const act=D.roster.filter(r=>r.status==="active");
    $("#st").innerHTML=stat("Personal %",rate([email])+"%")+stat("Committee %",rate(act.filter(r=>me.committee&&r.committee===me.committee).map(r=>r.id))+"%")+stat("Chapter %",rate(act.map(r=>r.id))+"%");
    $("#tb").innerHTML=D.attendance.sort((a,b)=>a.eventDate<b.eventDate?1:-1).map(a=>`<tr><td>${esc(a.eventTitle)}</td><td>${esc((a.eventDate||"").slice(0,10))}</td><td>${esc(a.name)}</td><td><span class="pill">${esc(a.status)}</span></td></tr>`).join("")||`<tr><td colspan="4">${empty("No check-ins yet.")}</td></tr>`;
  });
};

async function fill(p){
  const el=$("#p-"+p?.id);if(!p||!el)return;
  let all=[],mine=null;
  try{
    if(off()){all=(await getDocs(collection(db,"polls",p.id,"ballots"))).docs.map(d=>d.data());mine=all.find(b=>b.email===email)}
    else{const s=await getDoc(doc(db,"polls",p.id,"ballots",email));mine=s.exists()?s.data():null}
  }catch(x){toast(x.message)}
  el.innerHTML=p.options.map((o,i)=>{const n=all.filter(b=>b.choice===i).length;
    return `<div class="opt">${p.status==="Open"&&!mine?btn(`vote|${p.id}|${i}`,esc(o),"ghost"):`<span>${esc(o)}${mine?.choice===i?" ✓":""}</span>`}${off()?`<small>${n} vote${n===1?"":"s"}</small>`:""}</div>`}).join("")
    +(mine?`<small>Your vote is recorded.</small>`:"");
}
V.voting=()=>{
  main.innerHTML=head("Voting Center","Officer elections, constitutional amendments, and chapter polls.",off()?`<button class="btn" id="new">+ New poll</button>`:"")+`<div id="l"></div>`;
  if(off())$("#new").onclick=()=>form("New poll",[{k:"question",l:"Question"},{k:"options",l:"Options (comma separated)"}],o=>add("polls",{question:o.question,options:o.options.split(",").map(s=>s.trim()).filter(Boolean),status:"Open"}));
  need(["polls"],()=>{
    const ps=D.polls.sort((a,b)=>ms(b)-ms(a));
    $("#l").innerHTML=ps.map(p=>card(`<div class="split"><h3>${esc(p.question)}</h3><span class="pill">${esc(p.status)}</span></div><hr><div id="p-${p.id}"></div>${off()?(p.status==="Open"?btn(`set|polls|${p.id}|status|Closed`,"Close poll"):"")+btn(`del|polls|${p.id}`,"Delete"):""}`)).join("")||empty("No ballots yet.");
    ps.forEach(fill);
  });
};

V.recognition=feed("recognition","Recognition Wall","Celebrating Brother of the Month, service milestones, and leadership.","Add Recognition",
  ()=>[{k:"title",l:"Award"},{k:"name",l:"Brother"},{k:"note",l:"Why",t:"area"}],
  x=>`<h3>${esc(x.title)}</h3><b>${esc(x.name)}</b><p>${esc(x.note)}</p>`,off);

V.directory=()=>{
  main.innerHTML=head("Member Directory","Searchable roster of active brothers, officers, and committees.",adm()?`<button class="btn" id="new">+ Add member</button>`:"")
    +`<div class="bar"><input id="q" placeholder="Search by name…"><select id="cf"><option value="">All Committees</option>${opts(cnames())}</select><select id="rf"><option value="">All Roles</option>${opts(["member","officer","admin"])}</select><input id="gy" placeholder="Grad Year" inputmode="numeric"><select id="sf">${opts(["active","inactive"])}</select></div><div id="l"></div><div id="rq"></div>`;
  const paint=()=>{const q=$("#q").value.toLowerCase(),c=$("#cf").value,r=$("#rf").value,g=$("#gy").value.trim(),s=$("#sf").value;
    $("#l").innerHTML=D.roster.filter(m=>(m.name||"").toLowerCase().includes(q)&&(!c||m.committee===c)&&(!r||m.role===r)&&(!g||String(m.gradYear)===g)&&m.status===s)
      .sort((a,b)=>(a.name||"")>(b.name||"")?1:-1)
      .map(m=>card(`<div class="split"><div><h3>${esc(m.name)}</h3><small>${esc(m.id)}${m.committee?" • "+esc(m.committee):""}${m.gradYear?" • Class of "+esc(m.gradYear):""}</small></div><span class="pill">${esc(m.role)}</span></div>`)).join("")||empty("No members match.");
    if(adm())$("#rq").innerHTML=(D.accessRequests||[]).length?`<h2>Access requests</h2>`+D.accessRequests.map(q=>card(`<div class="split"><div><h3>${esc(q.name)}</h3><small>${esc(q.id)}</small></div>${btn(`approve|${q.id}|`,"Approve","btn sm-btn")}${btn(`del|accessRequests|${q.id}`,"Deny")}</div>`)).join(""):""};
  ["#q","#gy"].forEach(s=>$(s).oninput=paint);["#cf","#rf","#sf"].forEach(s=>$(s).onchange=paint);
  if(adm())$("#new").onclick=()=>form("Add or update member",[{k:"email",l:"Google email",t:"email"},{k:"name",l:"Name"},{k:"role",l:"Role",o:["member","officer","admin"]},{k:"committee",l:"Committee",o:["",...cnames()]},{k:"gradYear",l:"Grad year",r:false},{k:"status",l:"Status",o:["active","inactive"]}],
    o=>setDoc(doc(db,"roster",o.email.toLowerCase()),{name:o.name,role:o.role,committee:o.committee,gradYear:o.gradYear,status:o.status}));
  need(adm()?["roster","accessRequests"]:["roster"],paint);
};

/* ---------- actions (delegated) ---------- */
async function act(b){
  const [a,c,i,f,v]=b.dataset.a.split("|"),val=b.tagName==="SELECT"?b.value:v;
  try{
    
