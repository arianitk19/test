/* ui-controller.js v4 — Xhamia Ratkoc Premium */
(function(global){
'use strict';
const $=function(s,r){return(r||document).querySelector(s)};
const $$=function(s,r){return Array.from((r||document).querySelectorAll(s))};

const state={
  activeTab:'xhamia',prefs:null,today:null,
  nextPrayerDate:null,nextPrayerKey:null,
  currentPrayerKey:null,currentPrayerDate:null,
  timers:{clock:null,refresh:null,reflektim:null,reflektimFade:null},
  deferredInstallPrompt:null,
  gallery:{images:[],currentIndex:0,touchStartX:0},
  qibla:{unsub:null,started:false,aligned:false}
};

/* ============================================================
 * GALLERY — Add your photos here:
 *   { src: 'https://i.imgur.com/abc.jpg', title: 'Pamja jashtme' }
 *   OR { src: 'assets/gallery/foto-1.jpg', title: 'Pamja jashtme' }
 * ============================================================ */
const GALLERY_ITEMS=[
  { src:'', title:'Pamja jashtme' },
  { src:'', title:'Mihrabi' },
  { src:'', title:'Brendia e xhamise' },
  { src:'', title:'Drita e mengjesit' },
  { src:'', title:'Minarja' },
  { src:'', title:'Hyrja kryesore' }
];

const REFLEKTIMET=[
  {ar:'إِنَّ مَعَ الْعُسْرِ يُسْرًا',sq:'"Vertet, me veshtiresine eshte edhe lehtesimi."',source:'Kuran · El-Inshirah 6'},
  {ar:'فَاذْكُرُونِي أَذْكُرْكُمْ',sq:'"Me kujtoni Mua, edhe Une do t\'ju kujtoj juve."',source:'Kuran · El-Bekare 152'},
  {ar:'وَبَشِّرِ الصَّابِرِينَ',sq:'"Pergezoji te durueshmit."',source:'Kuran · El-Bekare 155'},
  {ar:'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',sq:'"Vertet, Allahu eshte me te durueshmit."',source:'Kuran · El-Bekare 153'},
  {ar:'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا',sq:'"E kush i frikesohet Allahut, Ai i siguron rrugedalje."',source:'Kuran · Et-Talak 2'},
  {ar:'وَأَقِيمُوا الصَّلَاةَ',sq:'"Faleni namazin me kujdes."',source:'Kuran · El-Bekare 43'},
  {ar:'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',sq:'"Nuk ka force as fuqi vec me ndihmen e Allahut."',source:'Hadith'},
  {ar:'الدِّينُ النَّصِيحَةُ',sq:'"Feja eshte keshillim i mire."',source:'Hadith — Muslim'},
  {ar:'وَالصَّابِرِينَ فِي الْبَأْسَاءِ وَالضَّرَّاءِ',sq:'"Dhe te durueshmit ne veshtiresi e veshtiresi te tjera."',source:'Kuran · El-Bekare 177'},
  {ar:'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ',sq:'"Dhe Allahu i do mireberesit."',source:'Kuran · Al-Imran 134'}
];
let _reflektimIdx=0;
function renderReflektim(){
  const it=REFLEKTIMET[_reflektimIdx];
  const a=$('#reflektimArabic');const t=$('#reflektimTranslation');const s=$('#reflektimSource');
  // Fade out then in
  [a,t,s].forEach(function(el){if(el){el.style.opacity='0';el.style.transition='opacity .35s ease'}});
  clearTimeout(state.timers.reflektimFade);
  state.timers.reflektimFade=setTimeout(function(){
    if(a)a.textContent=it.ar;
    if(t)t.textContent=it.sq;
    if(s)s.textContent=it.source;
    [a,t,s].forEach(function(el){if(el)el.style.opacity='1'});
  },380);
  _reflektimIdx=(_reflektimIdx+1)%REFLEKTIMET.length;
}
function startReflektimRotation(){
  _reflektimIdx=Math.floor(Math.random()*REFLEKTIMET.length);
  const a=$('#reflektimArabic');const t=$('#reflektimTranslation');const s=$('#reflektimSource');
  const it=REFLEKTIMET[_reflektimIdx];
  if(a)a.textContent=it.ar;if(t)t.textContent=it.sq;if(s)s.textContent=it.source;
  _reflektimIdx=(_reflektimIdx+1)%REFLEKTIMET.length;
  clearInterval(state.timers.reflektim);
  state.timers.reflektim=setInterval(renderReflektim,13000);
}

function tinyHaptic(){if(!state.prefs||state.prefs.hapticEnabled===false)return;try{if(navigator.vibrate)navigator.vibrate(8)}catch(e){}}
function pulseHaptic(){if(!state.prefs||state.prefs.hapticEnabled===false)return;try{if(navigator.vibrate)navigator.vibrate([14,20,14])}catch(e){}}
function successHaptic(){if(!state.prefs||state.prefs.hapticEnabled===false)return;try{if(navigator.vibrate)navigator.vibrate([30,40,80])}catch(e){}}

function toast(msg,kind,dur){
  kind=kind||'info';dur=dur||2600;
  const host=$('#toastHost');if(!host)return;
  const el=document.createElement('div');
  el.className='toast '+kind;
  const ic=kind==='success'?'✓':kind==='error'?'!':'·';
  el.innerHTML='<span style="opacity:.7">'+ic+'</span><span>'+esc(msg)+'</span>';
  host.appendChild(el);
  setTimeout(function(){el.style.transition='opacity .3s ease,transform .3s ease';el.style.opacity='0';el.style.transform='translateY(10px)';setTimeout(function(){el.remove()},350)},dur);
}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}

const VALID_TABS=['xhamia','namazi','kibla','rreth','galeria','kuran','cilesimet'];
function setTab(tab,opts){
  opts=opts||{};
  if(!tab||VALID_TABS.indexOf(tab)<0)return;
  if(state.activeTab===tab&&!opts.force)return;
  if(state.activeTab==='kibla'&&tab!=='kibla')stopQibla();
  state.activeTab=tab;
  $$('#dock .dock-btn').forEach(function(b){b.classList.toggle('is-active',b.getAttribute('data-tab')===tab)});
  $$('.tab-panel').forEach(function(p){p.style.display=p.getAttribute('data-tab')===tab?'':'none'});
  const panel=$('#tab-'+tab);if(panel){panel.style.animation='none';void panel.offsetWidth;panel.style.animation=''}
  tinyHaptic();
  try{const u=new URL(global.location.href);u.searchParams.set('tab',tab);history.replaceState(null,'',u.toString())}catch(e){}
  if(tab==='galeria')ensureGalleryRendered();
  if(tab==='namazi')refreshPrayerView();
  if(tab==='xhamia')refreshHomeView();
  if(tab==='kibla')initQiblaTab();
  if(tab==='kuran')initKuranTab();
  window.scrollTo({top:0,behavior:'instant'});
}
function wireNav(){
  $$('#dock .dock-btn').forEach(function(btn){btn.addEventListener('click',function(){setTab(btn.getAttribute('data-tab'))})});
  $$('.qa').forEach(function(btn){btn.addEventListener('click',function(){setTab(btn.getAttribute('data-goto'))})});
}

const WD=['e Diel','e Hene','e Marte','e Merkure','e Enjte','e Premte','e Shtune'];
const MO=['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nentor','Dhjetor'];
function pad(n){return String(n).padStart(2,'0')}

function renderClock(){
  const now=new Date();
  const c=$('#clock');if(c)c.textContent=pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());
  const dg=$('#dateGregorian');if(dg)dg.textContent=WD[now.getDay()]+' · '+now.getDate()+' '+MO[now.getMonth()]+' '+now.getFullYear();
  if(state.today&&state.today.hijriSq){const dh=$('#dateHijri');if(dh)dh.textContent=state.today.hijriSq;const ph=$('#prayerHijriLabel');if(ph)ph.textContent=state.today.hijriSq}
  const pd=$('#prayerDateLabel');if(pd)pd.textContent=WD[now.getDay()]+' · '+now.getDate()+' '+MO[now.getMonth()]+' '+now.getFullYear();
  updateCountdowns(now);
  updateSunArc(now);
}

const RING_C=289.027; // 2*pi*46 (radius)
function updateCountdowns(now){
  if(!state.nextPrayerDate)return;
  const rem=state.nextPrayerDate.getTime()-now.getTime();
  const fmt=global.XR_Prayer.formatCountdown(rem);
  const c1=$('#nextPrayerCountdown');if(c1)c1.textContent='Mbetet '+fmt;
  const c2=$('#currentPrayerCountdown');if(c2)c2.textContent=fmt;
  // Circular ring progress
  if(state.currentPrayerDate&&state.nextPrayerDate&&state.currentPrayerDate<state.nextPrayerDate){
    const tot=state.nextPrayerDate-state.currentPrayerDate;
    const dn=Math.max(0,Math.min(tot,now-state.currentPrayerDate));
    const pct=dn/tot;
    const ring=$('#ringProgress');
    if(ring)ring.setAttribute('stroke-dashoffset',RING_C*(1-pct));
  }
  if(rem<=0)scheduleSoon(800);
}

/* Update sun arc visualization */
function updateSunArc(now){
  if(!state.today)return;
  const t=state.today.times;
  const d0=new Date(now);d0.setHours(0,0,0,0);
  const sr=global.XR_Prayer.parseTimeToDate(d0,t.Sunrise);
  const ss=global.XR_Prayer.parseTimeToDate(d0,t.Maghrib);
  const dh=global.XR_Prayer.parseTimeToDate(d0,t.Dhuhr);
  const isha=global.XR_Prayer.parseTimeToDate(d0,t.Isha);
  if(!sr||!ss)return;

  // Calculate sun position along arc (0-1)
  let p=0;
  if(now<sr){p=0}
  else if(now>=ss){p=1}
  else{p=(now-sr)/(ss-sr)}

  // Update SVG path: arc from (20,70) Q (160,-10) (300,70)
  // We need to compute the point at parameter t on the quadratic Bezier
  // B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
  // P0=(20,70), P1=(160,-10), P2=(300,70)
  const x=Math.pow(1-p,2)*20+2*(1-p)*p*160+Math.pow(p,2)*300;
  const y=Math.pow(1-p,2)*70+2*(1-p)*p*(-10)+Math.pow(p,2)*70;
  const disk=$('#sunDisk');
  if(disk){disk.setAttribute('cx',x);disk.setAttribute('cy',y)}

  // Update arc fill (stroke-dashoffset)
  // Total dasharray is approx 400 (path length)
  const fill=$('#sunArcFill');
  if(fill)fill.setAttribute('stroke-dashoffset',400*(1-p));

  // Update labels
  const sal=$('#sunArcLeft');if(sal)sal.textContent='Sabahu '+(t.Fajr||'—');
  const sam=$('#sunArcMid');if(sam)sam.textContent='Dreka '+(t.Dhuhr||'—');
  const sar=$('#sunArcRight');if(sar)sar.textContent='Jacia '+(t.Isha||'—');
}

const PI={
  Fajr:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 4V2M12 22v-2M4 12H2M22 12h-2"/></svg>',
  Sunrise:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 18h18"/><path d="M5 14a7 7 0 0114 0"/><path d="M12 4v3"/></svg>',
  Dhuhr:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2"/></svg>',
  Asr:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M3 17h2M19 17h2"/></svg>',
  Maghrib:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 18h18"/><path d="M5 14a7 7 0 0114 0"/><path d="M12 4v3"/></svg>',
  Isha:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'
};

function renderQuickPrayerList(){
  const host=$('#quickPrayerList');if(!host||!state.today)return;
  const L=global.XR_Prayer.PRAYER_LABELS;
  host.innerHTML=global.XR_Prayer.ORDER.map(function(k){
    const t=state.today.times[k]||'--:--';
    const cur=state.currentPrayerKey===k;
    return '<div class="quick-prayer-item '+(cur?'is-current':'')+'"><div class="qp-name"><span style="color:#D4B370">'+(PI[k]||'')+'</span>'+L[k]+'</div><div class="qp-time">'+t+'</div></div>';
  }).join('');
}
function renderFullPrayerList(){
  const host=$('#prayerList');if(!host||!state.today)return;
  const L=global.XR_Prayer.PRAYER_LABELS;
  host.innerHTML=global.XR_Prayer.ORDER.map(function(k){
    const t=state.today.times[k]||'--:--';
    const cur=state.currentPrayerKey===k;
    const nx=state.nextPrayerKey===k;
    const tag=cur?'is-current':(nx?'is-next':'');
    return '<div class="prayer-row '+tag+'"><div class="p-name"><div class="p-icon">'+(PI[k]||'')+'</div>'+L[k]+'</div><div class="p-time">'+t+'</div></div>';
  }).join('');
}
function updateNextPrayerHero(){
  if(!state.today)return;
  const nm=$('#nextPrayerName');const nt=$('#nextPrayerTime');
  if(state.nextPrayerKey&&nm)nm.textContent=global.XR_Prayer.PRAYER_LABELS[state.nextPrayerKey];
  if(state.nextPrayerKey&&nt&&state.nextPrayerDate)nt.textContent=pad(state.nextPrayerDate.getHours())+':'+pad(state.nextPrayerDate.getMinutes());
  const cn=$('#currentPrayerName');if(cn)cn.textContent=state.currentPrayerKey?global.XR_Prayer.PRAYER_LABELS[state.currentPrayerKey]:'—';
}

async function refreshPrayerData(){
  try{
    global.XR_Prayer.setSource(state.prefs.prayerSource);
    const today=await global.XR_Prayer.getToday();
    state.today=today;
    const now=new Date();
    const cn=global.XR_Prayer.currentAndNext(today,now);
    state.currentPrayerKey=cn.current?cn.current.key:null;
    state.currentPrayerDate=cn.current&&cn.current.date?cn.current.date:null;
    state.nextPrayerKey=cn.next?cn.next.key:null;
    state.nextPrayerDate=cn.next&&cn.next.date?cn.next.date:null;
    if(cn.next&&cn.next.tomorrow){const np=await global.XR_Prayer.nextPrayer(now);if(np&&np.date){state.nextPrayerKey=np.key;state.nextPrayerDate=np.date}}
    const ls=$('#lastSyncLabel');
    if(ls){if(today.verified)ls.textContent='Burimi: BIK zyrtar (GitHub)';else if(state.prefs.lastSync){const d=new Date(state.prefs.lastSync);ls.textContent='Sinkronizimi: '+pad(d.getHours())+':'+pad(d.getMinutes())+' · '+MO[d.getMonth()]+' '+d.getDate()}else ls.textContent=today.computed?'Llogaritje lokale (parametra BIK)':'Sinkronizimi: tani'}
    const badge=$('#prayerSourceBadge');
    if(badge){badge.textContent=(global.XR_Prayer.SOURCES[state.prefs.prayerSource]||{}).label||'BIK';if(today.verified)badge.classList.add('is-verified');else badge.classList.remove('is-verified')}
  }catch(e){console.warn('refreshPrayerData',e)}
}
function refreshHomeView(){renderQuickPrayerList();updateNextPrayerHero();updateSunArc(new Date())}
function refreshPrayerView(){renderFullPrayerList();updateNextPrayerHero()}

let _soon=null;
function scheduleSoon(d){clearTimeout(_soon);_soon=setTimeout(async function(){await refreshPrayerData();refreshHomeView();refreshPrayerView()},d||1500)}

/* ============ QIBLA ============ */
async function initQiblaTab(){
  if(!global.XR_Qibla)return;
  const loc=state.prefs.location;
  const b=global.XR_Qibla.computeBearing(loc.lat,loc.lng);
  const d=global.XR_Qibla.getDistanceKm();
  const bb=$('#qiblaBearing');if(bb)bb.textContent=Math.round(b)+'°';
  const dd=$('#qiblaDistance');if(dd)dd.textContent=Math.round(d).toLocaleString()+' km';
  updateQiblaStatusBadge();
  positionKaabaMarker(b);
}
function positionKaabaMarker(bearing){
  const k=$('#qiblaKaaba');if(!k)return;
  k.style.display='';
  const angle=bearing;
  const rad=(angle-90)*Math.PI/180;
  const radius=42;
  const x=50+radius*Math.cos(rad);
  const y=50+radius*Math.sin(rad);
  k.style.left=x+'%';
  k.style.top=y+'%';
  k.style.transform='translate(-50%,-50%)';
}
function updateQiblaStatusBadge(){
  const b=$('#qiblaStatusBadge');if(!b)return;
  const s=global.XR_Qibla.getPermissionState();
  if(s==='granted'){b.textContent='Aktiv';b.classList.add('is-verified')}
  else if(s==='denied'){b.textContent='Refuzuar';b.classList.remove('is-verified')}
  else if(s==='unavailable'){b.textContent='Pa busull';b.classList.remove('is-verified')}
  else{b.textContent='Pa lejen';b.classList.remove('is-verified')}
}
async function startQibla(){
  if(state.qibla.started)return;
  if(!global.XR_Qibla){toast('Busulla nuk mbeshtetet.','error');return}
  const r=await global.XR_Qibla.start();
  updateQiblaStatusBadge();
  if(r!=='granted'){
    if(r==='denied')toast('Lejet u refuzuan. Aktivizoji nga cilesimet e telefonit.','error');
    else if(r==='unavailable')toast('Pajisja nuk e mbeshtet DeviceOrientation.','error');
    return;
  }
  state.qibla.started=true;
  const btn=$('#btnStartQibla');if(btn)btn.style.display='none';
  const n=$('#qiblaNeedle');if(n)n.style.display='';
  state.qibla.unsub=global.XR_Qibla.subscribe(function(o){
    const rose=$('#qiblaRose');
    if(rose && o.heading!=null)rose.style.transform='rotate('+(-o.heading)+'deg)';
    if(n && o.qibla!=null && o.heading!=null){
      const raw=((o.qibla-o.heading)%360+360)%360;
      // signed delta: -180..180 (the short way to Qibla)
      const signed=raw>180?raw-360:raw;
      const absD=Math.abs(signed);
      n.style.transform='translate(-50%,-100%) rotate('+raw+'deg)';
      // Update delta display
      const dEl=$('#qiblaDelta');
      const badge=$('#qiblaAlignBadge');
      if(dEl){
        const txt=absD<1?'0°':(signed>0?'+':'')+Math.round(signed)+'°';
        dEl.textContent=txt;
        dEl.classList.toggle('is-close',absD<10);
      }
      // Alignment threshold: 3 deg for "perfect"
      if(absD<3){
        rose.classList.add('aligned');
        if(badge)badge.classList.add('is-aligned');
        if(!state.qibla.aligned){
          successHaptic();
          state.qibla.aligned=true;
          // Stronger feedback on first alignment
          try{if(navigator.vibrate)navigator.vibrate([100,40,100])}catch(e){}
        }
      }else{
        rose.classList.remove('aligned');
        if(badge)badge.classList.remove('is-aligned');
        state.qibla.aligned=false;
      }
    }
    const hh=$('#qiblaHeading');if(hh && o.heading!=null)hh.textContent=Math.round(o.heading)+'°';
  });
}
function stopQibla(){
  if(state.qibla.unsub){state.qibla.unsub();state.qibla.unsub=null}
  if(global.XR_Qibla)global.XR_Qibla.stop();
  state.qibla.started=false;
  state.qibla.aligned=false;
  const rose=$('#qiblaRose');if(rose){rose.style.transform='rotate(0deg)';rose.classList.remove('aligned')}
  const badge=$('#qiblaAlignBadge');if(badge)badge.classList.remove('is-aligned');
  const dEl=$('#qiblaDelta');if(dEl){dEl.textContent='—';dEl.classList.remove('is-close')}
  const btn=$('#btnStartQibla');if(btn)btn.style.display='';
}

/* ============ SETTINGS ============ */
function renderSettings(){
  if(!state.prefs)return;
  const sc=function(id,v){const e=$(id);if(e)e.checked=!!v};
  sc('#setNotifEnabled',state.prefs.notificationsEnabled);
  sc('#setAdhanEnabled',state.prefs.adhanEnabled);
  sc('#setHapticEnabled',state.prefs.hapticEnabled);
  $$('button[data-source]').forEach(function(b){b.classList.toggle('is-active',b.getAttribute('data-source')===state.prefs.prayerSource)});
  $$('button[data-theme]').forEach(function(b){b.classList.toggle('is-active',b.getAttribute('data-theme')===state.prefs.theme)});
  applyTheme(state.prefs.theme);
  const onl=navigator.onLine;
  const dot=$('#onlineDot');if(dot){dot.classList.toggle('online',onl);dot.classList.toggle('offline',!onl)}
  const oi=$('#offlineIndicator');
  if(oi){oi.textContent=onl?'Online':'Offline';oi.style.background=onl?'rgba(110,231,183,.1)':'rgba(245,158,11,.1)';oi.style.color=onl?'#6EE7B7':'#fbbf24';oi.style.borderColor=onl?'rgba(110,231,183,.3)':'rgba(245,158,11,.3)'}
  const ol=$('#offlineLabel');if(ol)ol.textContent=onl?'Statusi: i lidhur':'Statusi: pa internet (cache)';
  const sb=$('#strictModeBadge');
  if(sb && global.XR_Notifications && global.XR_Notifications.supportsTrigger){sb.style.display=global.XR_Notifications.supportsTrigger()?'':'none'}
  if(global.XR_Notifications && global.XR_Notifications.getPendingCount){
    global.XR_Notifications.getPendingCount().then(function(c){const e=$('#pendingNotifsLabel');if(e)e.textContent=c+' njoftime te programuara'});
  }
}
function applyTheme(t){
  const h=document.documentElement;
  h.classList.remove('theme-dark','theme-soft','theme-light');
  h.classList.add('theme-'+t);
  const m=document.querySelector('meta[name="theme-color"]');
  if(m)m.setAttribute('content',t==='light'?'#F5F0E0':(t==='soft'?'#0A1024':'#06080F'));
}

function wireSettings(){
  const n=$('#setNotifEnabled');
  if(n)n.addEventListener('change',async function(ev){if(ev.target.checked){const r=await global.XR_Notifications.enable();if(r!=='granted'){ev.target.checked=false;toast(r==='denied'?'Lejet u refuzuan.':'Njoftimet nuk mbeshteten.','error')}else toast('Njoftimet u aktivizuan strikte.','success')}else{await global.XR_Notifications.disable();toast('Njoftimet u caktivizuan.','info')}state.prefs=await global.XR_Storage.getPrefs();renderSettings()});
  const a=$('#setAdhanEnabled');
  if(a)a.addEventListener('change',async function(ev){await global.XR_Storage.setPrefs({adhanEnabled:ev.target.checked});state.prefs=await global.XR_Storage.getPrefs();toast(ev.target.checked?'Ezani u aktivizua.':'Ezani u caktivizua.','info');if(ev.target.checked){try{global.XR_Notifications.playAdhan();setTimeout(function(){global.XR_Notifications.stopAdhan()},1500)}catch(e){}}});
  const h=$('#setHapticEnabled');
  if(h)h.addEventListener('change',async function(ev){await global.XR_Storage.setPrefs({hapticEnabled:ev.target.checked});state.prefs=await global.XR_Storage.getPrefs();if(ev.target.checked)pulseHaptic()});
  $$('button[data-source]').forEach(function(btn){btn.addEventListener('click',async function(){const src=btn.getAttribute('data-source');await global.XR_Storage.setPrefs({prayerSource:src});state.prefs=await global.XR_Storage.getPrefs();global.XR_Prayer.setSource(src);document.dispatchEvent(new CustomEvent('prayer:source-changed'));renderSettings();await refreshPrayerData();refreshHomeView();refreshPrayerView();toast('Burimi: '+((global.XR_Prayer.SOURCES[src]||{}).label||src),'success')})});
  $$('button[data-theme]').forEach(function(btn){btn.addEventListener('click',async function(){await global.XR_Storage.setPrefs({theme:btn.getAttribute('data-theme')});state.prefs=await global.XR_Storage.getPrefs();renderSettings()})});
  const rf=$('#btnRefreshPrayer');
  if(rf)rf.addEventListener('click',async function(){tinyHaptic();toast('Po rifreskoj...','info',1500);await refreshPrayerData();refreshHomeView();refreshPrayerView();renderSettings();toast('U rifreskuan.','success')});
  const tn=$('#btnTestNotif');
  if(tn)tn.addEventListener('click',async function(){tinyHaptic();const ok=await global.XR_Notifications.testNotification();if(!ok){if(global.XR_Notifications.getPermission()!=='granted'){const r=await global.XR_Notifications.requestPermission();if(r==='granted'){await global.XR_Notifications.testNotification();toast('Njoftim prove u dergua.','success')}else toast('Lejet u refuzuan.','error')}else toast('Njoftimi nuk u shfaq.','error')}else toast('Njoftim prove u dergua.','success')});
  const cc=$('#btnClearCache');
  if(cc)cc.addEventListener('click',async function(){if(!confirm('Pastro te dhenat e ruajtura?'))return;tinyHaptic();await global.XR_Storage.clearAll();if('caches' in window){try{const ks=await caches.keys();for(const k of ks)await caches.delete(k)}catch(e){}}toast('U pastrua. Po ringarkoj...','success',1200);setTimeout(function(){location.reload()},1200)});
  const qn=$('#btnNotifQuick');
  if(qn)qn.addEventListener('click',function(){setTab('cilesimet')});
  const bsq=$('#btnStartQibla');
  if(bsq)bsq.addEventListener('click',startQibla);
}

/* ============ GALLERY ============ */
let _galRendered=false;
function ensureGalleryRendered(){
  if(_galRendered)return;_galRendered=true;
  state.gallery.images=GALLERY_ITEMS;
  const grid=$('#galleryGrid');const cnt=$('#galleryCount');
  if(cnt)cnt.textContent=GALLERY_ITEMS.length+' fotografi';
  if(!grid)return;
  grid.innerHTML=GALLERY_ITEMS.map(function(it,i){
    const hasSrc=!!it.src;
    return '<button class="gallery-item" data-index="'+i+'" aria-label="'+esc(it.title)+'">'+
      (hasSrc?'<img loading="lazy" data-src="'+esc(it.src)+'" alt="'+esc(it.title)+'" />':'<div class="gi-placeholder"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="m21 17-5-5-9 9"/></svg></div>')+
      '<div class="gi-overlay">'+esc(it.title)+'</div></button>';
  }).join('');
  const imgs=$$('.gallery-item img',grid);
  if('IntersectionObserver' in window && imgs.length){
    const io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){const im=e.target;im.src=im.dataset.src;im.onload=function(){im.classList.add('loaded')};im.onerror=function(){im.style.display='none'};io.unobserve(im)}})},{rootMargin:'120px'});
    imgs.forEach(function(i){io.observe(i)});
  }else{imgs.forEach(function(i){i.src=i.dataset.src;i.onload=function(){i.classList.add('loaded')}})}
  $$('.gallery-item',grid).forEach(function(btn){btn.addEventListener('click',function(){const idx=parseInt(btn.dataset.index,10);if(GALLERY_ITEMS[idx].src)openViewer(idx);else toast('Foto e papercaktuar — shih GALLERY_ITEMS','info',3500)})});
}
function openViewer(idx){state.gallery.currentIndex=idx;const v=$('#galleryViewer');if(!v)return;v.style.display='';document.body.style.overflow='hidden';renderViewer();pulseHaptic()}
function closeViewer(){const v=$('#galleryViewer');if(!v)return;v.style.display='none';document.body.style.overflow=''}
function renderViewer(){const im=$('#viewerImage');const cap=$('#viewerCaption');const it=state.gallery.images[state.gallery.currentIndex];if(im&&it){im.style.opacity=0;im.src=it.src||'';im.onload=function(){im.style.transition='opacity .3s ease';im.style.opacity=1}}if(cap&&it)cap.textContent=(state.gallery.currentIndex+1)+' / '+state.gallery.images.length+' · '+it.title}
function nextImg(){let i=state.gallery.currentIndex;for(let k=0;k<state.gallery.images.length;k++){i=(i+1)%state.gallery.images.length;if(state.gallery.images[i].src){state.gallery.currentIndex=i;renderViewer();tinyHaptic();return}}}
function prevImg(){let i=state.gallery.currentIndex;for(let k=0;k<state.gallery.images.length;k++){i=(i-1+state.gallery.images.length)%state.gallery.images.length;if(state.gallery.images[i].src){state.gallery.currentIndex=i;renderViewer();tinyHaptic();return}}}

function wireGalleryViewer(){
  const c=$('#btnCloseViewer');if(c)c.addEventListener('click',closeViewer);
  const n=$('#btnNextImg');if(n)n.addEventListener('click',nextImg);
  const p=$('#btnPrevImg');if(p)p.addEventListener('click',prevImg);
  const v=$('#galleryViewer');
  if(v){
    v.addEventListener('click',function(ev){if(ev.target===v)closeViewer()});
    v.addEventListener('touchstart',function(ev){state.gallery.touchStartX=ev.changedTouches[0].screenX},{passive:true});
    v.addEventListener('touchend',function(ev){const ex=ev.changedTouches[0].screenX;const dx=ex-state.gallery.touchStartX;if(Math.abs(dx)>50)(dx<0?nextImg():prevImg())},{passive:true});
  }
  document.addEventListener('keydown',function(ev){const view=$('#galleryViewer');if(!view||view.style.display==='none')return;if(ev.key==='Escape')closeViewer();else if(ev.key==='ArrowRight')nextImg();else if(ev.key==='ArrowLeft')prevImg()});
}

function wireInstall(){
  global.addEventListener('beforeinstallprompt',function(e){e.preventDefault();state.deferredInstallPrompt=e;if(state.prefs&&state.prefs.installDismissed)return;const b=$('#installBanner');if(b)b.style.display=''});
  const btn=$('#btnInstall');if(btn)btn.addEventListener('click',async function(){if(!state.deferredInstallPrompt)return;tinyHaptic();state.deferredInstallPrompt.prompt();const ch=await state.deferredInstallPrompt.userChoice;state.deferredInstallPrompt=null;const b=$('#installBanner');if(b)b.style.display='none';if(ch&&ch.outcome==='accepted')toast('Aplikacioni u instalua.','success')});
  const d=$('#btnDismissInstall');if(d)d.addEventListener('click',async function(){const b=$('#installBanner');if(b)b.style.display='none';await global.XR_Storage.setPrefs({installDismissed:true})});
  global.addEventListener('appinstalled',function(){toast('Aplikacioni u shtua ne ekran.','success')});
}
function wireConnectivity(){
  global.addEventListener('online',function(){renderSettings();toast('Lidhja u rikthye.','success');scheduleSoon(300)});
  global.addEventListener('offline',function(){renderSettings();toast('Pa internet - po perdor cache.','info')});
}
function applyInitialRoute(){
  try{const u=new URL(global.location.href);const t=u.searchParams.get('tab');if(t&&VALID_TABS.indexOf(t)>=0)setTab(t,{force:true});else setTab('xhamia',{force:true})}catch(e){setTab('xhamia',{force:true})}
}


let _kuranInited=false;
function initKuranTab(){
  if(_kuranInited)return;_kuranInited=true;
  if(global.XR_QuranUI && global.XR_QuranUI.init)global.XR_QuranUI.init();
}

async function boot(){
  state.prefs=await global.XR_Storage.getPrefs();
  global.XR_Prayer.setSource(state.prefs.prayerSource);
  applyTheme(state.prefs.theme);
  wireNav();wireSettings();wireGalleryViewer();wireInstall();wireConnectivity();
  global.XR_Prayer.preloadBIKData().catch(function(){});
  await refreshPrayerData();refreshHomeView();refreshPrayerView();
  renderSettings();applyInitialRoute();
  renderClock();
  startReflektimRotation();
  state.timers.clock=setInterval(renderClock,1000);
  state.timers.refresh=setInterval(async function(){await refreshPrayerData();refreshHomeView();refreshPrayerView();renderSettings()},60000);
}

global.XR_UI={boot:boot,setTab:setTab,toast:toast,renderClock:renderClock,refreshPrayerData:refreshPrayerData,state:state,GALLERY_ITEMS:GALLERY_ITEMS,startQibla:startQibla,stopQibla:stopQibla};
})(window);
