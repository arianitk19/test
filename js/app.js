/* app.js v3 — Bootstrap */
(function(global){
'use strict';
const APP_VERSION='4.0.0';
function hideSplash(){const s=document.getElementById('splash');const a=document.getElementById('app');if(s)s.classList.add('hide');if(a)a.style.display='';setTimeout(function(){if(s)s.remove()},600)}
function setVersion(){const e=document.getElementById('appVersion');if(e)e.textContent=APP_VERSION}
function handleSWMessages(){if(!('serviceWorker' in navigator))return;navigator.serviceWorker.addEventListener('message',function(ev){const d=ev.data||{};if(d.type==='PRAYER_FIRED'){if(global.XR_UI)global.XR_UI.refreshPrayerData()}else if(d.type==='CACHE_UPDATED'){if(global.XR_UI)global.XR_UI.toast('Permbajtja u rifreskua.','info',1500)}})}
function preventDoubleTabZoom(){
  let last=0;
  document.addEventListener('touchend',function(ev){const now=Date.now();if(now-last<350)ev.preventDefault();last=now},{passive:false});
}
async function start(){
  setVersion();
  preventDoubleTabZoom();
  try{await global.XR_UI.boot()}catch(e){console.error('UI boot failed',e)}
  requestAnimationFrame(function(){requestAnimationFrame(hideSplash)});
  try{await global.XR_Notifications.init()}catch(e){console.warn('Notif init failed',e)}
  handleSWMessages();
  try{await global.XR_Storage.purgeOldPrayers(14)}catch(e){}
  try{await global.XR_Storage.purgeFiredNotifications()}catch(e){}
  // Keep nav fixed: prevent iOS rubber-band from showing white below nav
  if('overscrollBehavior' in document.documentElement.style){
    document.documentElement.style.overscrollBehavior='none';
  }
  global.addEventListener('unhandledrejection',function(ev){console.warn('unhandled',ev.reason)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();
setTimeout(function(){const s=document.getElementById('splash');if(s&&!s.classList.contains('hide'))hideSplash()},6000);
})(window);
