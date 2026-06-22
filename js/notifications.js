/* notifications.js v3 — STRICT mode
 *
 * Multi-redundant scheduling so notifications fire reliably:
 *  1. SW.showNotification with TimestampTrigger (Chrome 80+ where supported)
 *  2. In-page setTimeout (fires while page is open or SW alive)
 *  3. Service-Worker registered schedule persisted in IndexedDB
 *  4. Re-verified on every visibilitychange, focus, online, prefs:changed
 *  5. Periodic 30s heartbeat to recover missed fires
 *
 * Tone-only Adhan (no MP3) via Web Audio API.
 */
(function(global){
'use strict';
const _rt={timers:new Map(),ctx:null,initialized:false,lastTick:0,wakeLock:null,heartbeatInterval:null};
const HEARTBEAT_MS=10000; // 10s for higher reliability
const PRE_WAKE_MS=120000; // request wake lock 2 min before a prayer

function getPermission(){if(!('Notification' in global))return'unsupported';return Notification.permission}
async function requestPermission(){
  if(!('Notification' in global))return'unsupported';
  if(Notification.permission==='granted')return'granted';
  if(Notification.permission==='denied')return'denied';
  try{return await Notification.requestPermission()}catch(e){return'denied'}
}
function vibrate(p){try{if(navigator.vibrate)navigator.vibrate(p)}catch(e){}}

function supportsTrigger(){
  try{return 'TimestampTrigger' in window && 'showTrigger' in Notification.prototype}catch(e){return false}
}

function playAdhan(){
  try{
    const C=global.AudioContext||global.webkitAudioContext;
    if(!C)return false;
    const ctx=_rt.ctx||new C();
    _rt.ctx=ctx;
    if(ctx.state==='suspended')ctx.resume();
    const now=ctx.currentTime;
    const notes=[
      {f:392.00,t:0.0,d:1.2},{f:523.25,t:1.3,d:1.0},{f:587.33,t:2.4,d:1.0},
      {f:523.25,t:3.5,d:1.0},{f:440.00,t:4.6,d:1.4},{f:392.00,t:6.0,d:2.0}
    ];
    const master=ctx.createGain();
    master.gain.value=0.0001;
    master.connect(ctx.destination);
    master.gain.exponentialRampToValueAtTime(0.22,now+0.05);
    master.gain.exponentialRampToValueAtTime(0.0001,now+9);
    notes.forEach(function(n){
      const osc=ctx.createOscillator();const g=ctx.createGain();
      osc.type='sine';osc.frequency.value=n.f;
      g.gain.value=0.0001;
      g.gain.exponentialRampToValueAtTime(0.5,now+n.t+0.05);
      g.gain.exponentialRampToValueAtTime(0.0001,now+n.t+n.d);
      osc.connect(g).connect(master);
      osc.start(now+n.t);osc.stop(now+n.t+n.d+0.05);
    });
    return true;
  }catch(e){return false}
}
function stopAdhan(){try{if(_rt.ctx){_rt.ctx.close();_rt.ctx=null}}catch(e){}}

async function _showNotification(title,body,tag,data,triggerAt){
  const p={body:body,icon:'assets/icons/icon.svg',badge:'assets/icons/icon.svg',tag:tag,data:data,vibrate:[200,80,200,80,200],requireInteraction:true,lang:'sq',renotify:true};
  if(triggerAt && supportsTrigger()){
    try{p.showTrigger=new TimestampTrigger(triggerAt)}catch(e){}
  }
  if('serviceWorker' in navigator){
    try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,p);return true}catch(e){}
  }
  try{
    if('Notification' in global && Notification.permission==='granted'){
      const n=new Notification(title,p);
      n.onclick=function(){try{global.focus();n.close()}catch(e){}};
      return true;
    }
  }catch(e){}
  return false;
}

function _id(d,p,k){return d+':'+p+':'+k}
function _offset(k){if(k==='pre10')return-10*60000;if(k==='pre5')return-5*60000;return 0}
function _msg(p,k){
  const L=(global.XR_Prayer&&global.XR_Prayer.PRAYER_LABELS[p])||p;
  if(k==='pre10')return{title:L+' — pas 10 min',body:'Koha e '+L.toLowerCase()+' afrohet.'};
  if(k==='pre5')return{title:L+' — pas 5 min',body:'Edhe 5 minuta deri ne kohen e '+L.toLowerCase()+'.'};
  return{title:'Hyri koha e '+L.toLowerCase(),body:'Allahu Ekber! Eja per namaz.'};
}

function _clearTimers(){for(const id of _rt.timers.keys())clearTimeout(_rt.timers.get(id));_rt.timers.clear()}

async function _scheduleOne(rec,prefs){
  const delay=rec.fireAt-Date.now();
  if(delay<-60000)return; // > 1 min in past, give up
  if(delay>86460000)return; // > 24h, will reschedule tomorrow
  // Try TimestampTrigger first (most reliable, works even if browser closed)
  if(supportsTrigger() && delay>0){
    const m=_msg(rec.prayer,rec.kind);
    await _showNotification(m.title,m.body,rec.id,{prayer:rec.prayer,kind:rec.kind,fireAt:rec.fireAt},rec.fireAt);
  }
  // Always also set a setTimeout for in-page redundancy
  const tid=setTimeout(async function(){
    try{
      // Idempotency: if already fired (e.g. via trigger), skip
      const stored=await global.XR_Storage.getPendingNotifications();
      const stillPending=stored.find(function(n){return n.id===rec.id});
      if(!stillPending)return;
      const m=_msg(rec.prayer,rec.kind);
      await _showNotification(m.title,m.body,rec.id,{prayer:rec.prayer,kind:rec.kind});
      vibrate(rec.kind==='onTime'?[300,100,300,100,300]:[150,80,150]);
      if(rec.kind==='onTime'&&prefs.adhanEnabled)playAdhan();
      await global.XR_Storage.markNotificationFired(rec.id);
      document.dispatchEvent(new CustomEvent('prayer:fired',{detail:{rec:rec}}));
    }catch(e){console.warn('fire',e)}
  },Math.max(0,delay));
  _rt.timers.set(rec.id,tid);
}

async function scheduleForDay(date){
  const prefs=await global.XR_Storage.getPrefs();
  if(!global.XR_Prayer)return;
  const today=await global.XR_Prayer.getForDate(date);
  const dayKey=global.XR_Prayer.ymd(date);
  const order=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
  const d0=new Date(date);d0.setHours(0,0,0,0);
  for(const p of order){
    const dt=global.XR_Prayer.parseTimeToDate(d0,today.times[p]);
    if(!dt)continue;
    for(const k of ['pre10','pre5','onTime']){
      const fireAt=dt.getTime()+_offset(k);
      if(fireAt<Date.now()-60000)continue;
      const id=_id(dayKey,p,k);
      const exist=(await global.XR_Storage.getPendingNotifications()).find(function(n){return n.id===id});
      const rec=exist||{id:id,prayer:p,kind:k,fireAt:fireAt,fired:false,source:today.source};
      rec.fireAt=fireAt;rec.fired=false;
      await global.XR_Storage.saveNotification(rec);
      if(prefs.notificationsEnabled)await _scheduleOne(rec,prefs);
    }
  }
}

async function rebuildSchedule(){
  _clearTimers();
  await global.XR_Storage.purgeFiredNotifications();
  await scheduleForDay(new Date());
  const tom=new Date();tom.setDate(tom.getDate()+1);
  await scheduleForDay(tom);
  const pend=await global.XR_Storage.getPendingNotifications();
  const prefs=await global.XR_Storage.getPrefs();
  if(prefs.notificationsEnabled){
    for(const r of pend){if(!_rt.timers.has(r.id))await _scheduleOne(r,prefs)}
  }
}

async function _heartbeat(){
  if(Date.now()-_rt.lastTick<HEARTBEAT_MS-1000)return;
  _rt.lastTick=Date.now();
  const prefs=await global.XR_Storage.getPrefs();
  if(!prefs.notificationsEnabled)return;
  const pend=await global.XR_Storage.getPendingNotifications();
  const now=Date.now();
  for(const r of pend){
    if(r.fireAt<=now && r.fireAt>now-120000 && !r.fired){
      const m=_msg(r.prayer,r.kind);
      await _showNotification(m.title,m.body,r.id,{prayer:r.prayer,kind:r.kind});
      vibrate(r.kind==='onTime'?[300,100,300,100,300]:[150,80,150]);
      if(r.kind==='onTime'&&prefs.adhanEnabled)playAdhan();
      await global.XR_Storage.markNotificationFired(r.id);
      document.dispatchEvent(new CustomEvent('prayer:fired',{detail:{rec:r}}));
    }
  }
}

async function getPendingCount(){const p=await global.XR_Storage.getPendingNotifications();return p.length}

async function disableAll(){_clearTimers();await global.XR_Storage.clearAllNotifications()}

async function enable(){
  const p=await requestPermission();
  if(p!=='granted')return p;
  await global.XR_Storage.setPrefs({notificationsEnabled:true});
  await rebuildSchedule();
  try{
    if('serviceWorker' in navigator && 'SyncManager' in window){
      const r=await navigator.serviceWorker.ready;
      if(r.sync)await r.sync.register('xr-prayer-refresh');
    }
    if('serviceWorker' in navigator){
      const r=await navigator.serviceWorker.ready;
      if(r.periodicSync){try{await r.periodicSync.register('xr-prayer-periodic',{minInterval:30*60*1000})}catch(e){}}
    }
  }catch(e){}
  return 'granted';
}

async function disable(){await global.XR_Storage.setPrefs({notificationsEnabled:false});_clearTimers()}

async function testNotification(){
  const ok=await _showNotification('Xhamia Ratkoc','Njoftim prove - sistemi funksionon ne menyre strikte.','test',{test:true});
  vibrate([60,40,60,40,60]);
  return ok;
}

/* Wake Lock: keep CPU/screen alive when a prayer is < PRE_WAKE_MS away */
async function _maintainWakeLock(){
  if(!('wakeLock' in navigator))return;
  try{
    const pend=await global.XR_Storage.getPendingNotifications();
    const now=Date.now();
    const imminent=pend.find(function(n){return n.fireAt>now && n.fireAt<now+PRE_WAKE_MS && n.kind==='onTime'});
    if(imminent && !_rt.wakeLock){
      try{_rt.wakeLock=await navigator.wakeLock.request('screen');_rt.wakeLock.addEventListener('release',function(){_rt.wakeLock=null})}catch(e){}
    }else if(!imminent && _rt.wakeLock){
      try{await _rt.wakeLock.release();_rt.wakeLock=null}catch(e){}
    }
  }catch(e){}
}

/* Check notification permission status with helpful diagnostic */
function getDiagnostic(){
  const out={
    notificationApi:('Notification' in window),
    permission:getPermission(),
    serviceWorker:('serviceWorker' in navigator),
    timestampTrigger:supportsTrigger(),
    wakeLock:('wakeLock' in navigator),
    periodicSync:false,
    vibrate:('vibrate' in navigator),
    isStandalone:(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true)
  };
  return out;
}

async function init(){
  if(_rt.initialized)return;
  _rt.initialized=true;
  // 1. Page visibility (rebuild when tab returns to foreground)
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'){rebuildSchedule();_heartbeat();_maintainWakeLock()}
  });
  // 2. Focus event (additional safety)
  global.addEventListener('focus',function(){_heartbeat();_maintainWakeLock()});
  // 3. Page show (back/forward cache restore)
  global.addEventListener('pageshow',function(ev){if(ev.persisted){rebuildSchedule();_heartbeat()}});
  // 4. Prefs / source changed
  document.addEventListener('prefs:changed',function(){rebuildSchedule()});
  document.addEventListener('prayer:source-changed',function(){rebuildSchedule()});
  // 5. Online comeback
  global.addEventListener('online',function(){rebuildSchedule();_heartbeat()});
  // 6. Storage cross-tab sync
  global.addEventListener('storage',function(ev){if(ev.key && ev.key.indexOf('xr.')===0)rebuildSchedule()});
  await rebuildSchedule();
  if(_rt.heartbeatInterval)clearInterval(_rt.heartbeatInterval);
  _rt.heartbeatInterval=setInterval(function(){_heartbeat();_maintainWakeLock()},HEARTBEAT_MS);
}

global.XR_Notifications={
  getPermission:getPermission,requestPermission:requestPermission,
  enable:enable,disable:disable,rebuildSchedule:rebuildSchedule,
  disableAll:disableAll,testNotification:testNotification,
  playAdhan:playAdhan,stopAdhan:stopAdhan,vibrate:vibrate,init:init,
  supportsTrigger:supportsTrigger,getPendingCount:getPendingCount,
  getDiagnostic:getDiagnostic
};
})(window);
