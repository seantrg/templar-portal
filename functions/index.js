const {onDocumentCreated}=require("firebase-functions/v2/firestore");
const {defineString}=require("firebase-functions/params");
const admin=require("firebase-admin");
admin.initializeApp();
const db=admin.firestore();

// Asked once at deploy time, e.g. https://YOUR-USERNAME.github.io/REPO-NAME/
const SITE=defineString("SITE_URL");

async function push({title,body,page,who,skip}){
  const [roster,devs]=await Promise.all([
    db.collection("roster").where("status","==","active").get(),
    db.collection("devices").get()]);
  const ok=new Set();
  roster.forEach(r=>{if(r.id!==skip&&who(r.data(),r.id))ok.add(r.id)});
  const targets=devs.docs.filter(d=>ok.has(d.data().email));
  if(!targets.length)return;
  const base=SITE.value().replace(/\/?$/,"/");
  for(let i=0;i<targets.length;i+=500){
    const chunk=targets.slice(i,i+500);
    const res=await admin.messaging().sendEachForMulticast({
      tokens:chunk.map(d=>d.id),
      webpush:{
        notification:{title,body:String(body||"").slice(0,180),icon:base+"logo.png"},
        fcmOptions:{link:base+"#"+page}}});
    const dead=[];
    res.responses.forEach((r,j)=>{
      const c=r.error&&r.error.code;
      if(c==="messaging/registration-token-not-registered"||c==="messaging/invalid-registration-token")dead.push(chunk[j].ref.delete());
    });
    await Promise.all(dead);
  }
}

exports.pushAnnouncement=onDocumentCreated("announcements/{id}",e=>{
  const a=e.data.data();
  return push({
    title:(a.priority==="Urgent"?"URGENT: ":"")+a.title,body:a.body,page:"announcements",skip:a.by,
    who:r=>!a.committee||a.committee==="All"||r.committee===a.committee});
});

exports.pushEvent=onDocumentCreated("events/{id}",e=>{
  const v=e.data.data();
  return push({
    title:"New event: "+v.title,
    body:[v.start&&new Date(v.start).toISOString().slice(0,16).replace("T"," "),v.location].filter(Boolean).join(" • "),
    page:"calendar",skip:v.by,
    who:r=>!v.committee||v.committee==="All"||r.committee===v.committee});
});

exports.pushTask=onDocumentCreated("tasks/{id}",e=>{
  const t=e.data.data();
  if(!t.assignee)return;
  return push({title:"New task assigned",body:t.title+(t.due?" (due "+t.due+")":""),page:"tasks",skip:t.by,
    who:(r,id)=>id===t.assignee});
});

exports.pushPoll=onDocumentCreated("polls/{id}",e=>{
  const p=e.data.data();
  return push({title:"New vote open",body:p.question,page:"voting",skip:p.by,who:()=>true});
});
