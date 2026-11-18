/* Must live at the repo root next to index.html */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:"AIzaSyAL75CWEyafnVXAN0vUteqefAesmuJTpO4",
  authDomain:"templar-portal-database.firebaseapp.com",
  projectId:"templar-portal-database",
  messagingSenderId:"20032048574",
  appId:"1:20032048574:web:7ae106aa84d298c837fdef"
});
// Initializing messaging lets the browser display notifications that carry a "notification" payload.
firebase.messaging();

self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const url=(e.notification.data&&(e.notification.data.FCM_MSG?.fcmOptions?.link||e.notification.data.link))||self.registration.scope;
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){if(c.url.startsWith(self.registration.scope)&&"focus" in c){c.navigate(url);return c.focus()}}
    return clients.openWindow(url);
  }));
});
