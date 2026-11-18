import {getMessaging,getToken,deleteToken,onMessage,isSupported} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import {doc,setDoc,deleteDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";

const KEY="kht_push";
let listening=false;

export const pushSupported=async()=>{
  try{return "Notification" in window&&"serviceWorker" in navigator&&await isSupported()}catch(e){return false}
};
export const pushOn=()=>!!localStorage.getItem(KEY)&&"Notification" in window&&Notification.permission==="granted";

async function getTok(app){
  const reg=await navigator.serviceWorker.register("firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  return getToken(getMessaging(app),{vapidKey:firebaseConfig.vapidKey,serviceWorkerRegistration:reg});
}
async function save(db,email,t){
  await setDoc(doc(db,"devices",t),{email,at:serverTimestamp()});
  const old=localStorage.getItem(KEY);
  if(old&&old!==t)try{await deleteDoc(doc(db,"devices",old))}catch(e){}
  localStorage.setItem(KEY,t);
}

export async function enablePush(app,db,email){
  if(!firebaseConfig.vapidKey||/PASTE/.test(firebaseConfig.vapidKey))throw new Error("Add vapidKey to firebase-config.js first.");
  if(await Notification.requestPermission()!=="granted")throw new Error("Notifications are blocked. Allow them in your browser's site settings.");
  const t=await getTok(app);
  if(!t)throw new Error("Could not get a notification token.");
  await save(db,email,t);
}
export async function disablePush(app,db){
  const t=localStorage.getItem(KEY);
  if(t)try{await deleteDoc(doc(db,"devices",t))}catch(e){}
  localStorage.removeItem(KEY);
  try{await deleteToken(getMessaging(app))}catch(e){}
}
/* call on sign-in: keeps the token fresh and tied to the signed-in account */
export async function refreshPush(app,db,email){
  if(!pushOn())return;
  try{await save(db,email,await getTok(app))}catch(e){}
}
/* call BEFORE signOut: stops this device receiving the account's notifications */
export async function detach(db){
  const t=localStorage.getItem(KEY);
  if(t)try{await deleteDoc(doc(db,"devices",t))}catch(e){}
  localStorage.removeItem(KEY);
}
/* shows a message while the site is open (background ones are shown by the browser) */
export function listen(app,cb){
  if(listening)return;listening=true;
  try{onMessage(getMessaging(app),p=>cb((p.notification?.title||"")+": "+(p.notification?.body||"")))}catch(e){}
}
