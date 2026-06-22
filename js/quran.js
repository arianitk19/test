/* quran.js — Quran UI: surah list, reader, search, bookmarks, continue reading, daily ayah */
(function(global){
'use strict';
const $=function(s,r){return(r||document).querySelector(s)};
const $$=function(s,r){return Array.from((r||document).querySelectorAll(s))};
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}

const state={
  view:'list',         // 'list' | 'reader'
  currentSurah:null,   // surah data
  currentSurahNum:null,
  activeAyahIdx:-1,
  unsubPlayer:null,
  bookmarks:[],
  fontSize:1,          // 1 = normal, 0.85 small, 1.15 large, 1.3 xl
  showTranslation:true,
  search:''
};

/* ====== BOOKMARKS ====== */
async function loadBookmarks(){
  try{state.bookmarks=(await global.XR_Storage.getMeta('quranBookmarks'))||[]}catch(e){state.bookmarks=[]}
}
async function saveBookmarks(){try{await global.XR_Storage.setMeta('quranBookmarks',state.bookmarks)}catch(e){}}
function hasBookmark(surahNum,ayahN){return state.bookmarks.some(function(b){return b.s===surahNum&&b.a===ayahN})}
async function toggleBookmark(surahNum,ayahN){
  const i=state.bookmarks.findIndex(function(b){return b.s===surahNum&&b.a===ayahN});
  if(i>=0)state.bookmarks.splice(i,1);
  else state.bookmarks.unshift({s:surahNum,a:ayahN,ts:Date.now()});
  await saveBookmarks();
}

/* ====== CONTINUE READING ====== */
async function saveProgress(){
  if(!state.currentSurahNum)return;
  try{await global.XR_Storage.setMeta('quranProgress',{s:state.currentSurahNum,a:state.activeAyahIdx,ts:Date.now()})}catch(e){}
}
async function loadProgress(){try{return await global.XR_Storage.getMeta('quranProgress')}catch(e){return null}}

/* ====== DAILY AYAH ====== */
function dailyAyahPick(){
  // Deterministic based on day of year
  const d=new Date();const start=new Date(d.getFullYear(),0,0);
  const day=Math.floor((d-start)/86400000);
  // Pick a surah & ayah from a curated list
  const PICKS=[
    {s:2,a:255},{s:2,a:286},{s:3,a:8},{s:3,a:159},{s:3,a:185},
    {s:6,a:162},{s:9,a:51},{s:13,a:28},{s:14,a:7},{s:17,a:80},
    {s:18,a:10},{s:20,a:114},{s:25,a:74},{s:28,a:88},{s:39,a:53},
    {s:55,a:13},{s:65,a:3},{s:94,a:5},{s:94,a:6},{s:103,a:1}
  ];
  return PICKS[day%PICKS.length];
}
async function fetchDailyAyah(){
  const pick=dailyAyahPick();
  const s=await global.XR_Quran.fetchSurah(pick.s);
  if(!s)return null;
  const ayah=s.ayahs.find(function(a){return a.n===pick.a});
  if(!ayah)return null;
  return{surahNum:pick.s,ayahNum:pick.a,ar:ayah.ar,sq:ayah.sq,source:s.nameSq+' · '+pick.a};
}

/* ====== SURAH LIST VIEW ====== */
function renderSurahList(){
  const host=$('#quranList');if(!host)return;
  const query=state.search;
  const list=global.XR_Quran.searchSurahs(query);
  if(!list.length){host.innerHTML='<div style="padding:30px;text-align:center;color:var(--text-2)">Asnje sure e gjetur.</div>';return}
  host.innerHTML=list.map(function(s){
    const bm=state.bookmarks.filter(function(b){return b.s===s.n}).length;
    return '<button class="surah-item" data-num="'+s.n+'" type="button">'+
      '<div class="s-num">'+s.n+'</div>'+
      '<div class="s-info">'+
        '<div class="s-name">'+esc(s.sq)+'</div>'+
        '<div class="s-meta">'+s.v+' ajete · '+(s.r==='mekke'?'Mekke':'Medine')+(bm?' · '+bm+' shenjuar':'')+'</div>'+
      '</div>'+
      '<div class="s-arab">'+esc(s.ar)+'</div>'+
    '</button>';
  }).join('');
  $$('.surah-item',host).forEach(function(btn){
    btn.addEventListener('click',function(){openSurah(parseInt(btn.dataset.num,10))});
  });
}

/* ====== READER VIEW ====== */
async function openSurah(num,startAyah){
  state.view='reader';
  state.currentSurahNum=num;
  state.activeAyahIdx=-1;
  $('#quranListView').style.display='none';
  $('#quranReader').style.display='';
  const meta=global.XR_Quran.getSurahMeta(num);
  $('#readerTitle').textContent=meta.sq;
  $('#readerSubtitle').textContent=meta.v+' ajete · '+(meta.r==='mekke'?'Shpallur ne Mekke':'Shpallur ne Medine');
  $('#readerArabic').textContent=meta.ar;
  const body=$('#readerBody');
  body.innerHTML='<div style="padding:40px;text-align:center;color:var(--text-2)">Po ngarkohet sura...</div>';
  window.scrollTo({top:0,behavior:'instant'});
  const surah=await global.XR_Quran.fetchSurah(num);
  if(!surah){body.innerHTML='<div style="padding:40px;text-align:center;color:var(--rose)">Nuk u arrit te ngarkohet. Sigurohu qe je online per leximin e pare.</div>';return}
  state.currentSurah=surah;
  if(global.XR_QuranPlayer)global.XR_QuranPlayer.loadSurah(surah,startAyah||0);
  renderReaderBody();
  if(startAyah){
    setTimeout(function(){scrollToAyah(startAyah)},300);
  }
  saveProgress();
}
function renderReaderBody(){
  const body=$('#readerBody');if(!body||!state.currentSurah)return;
  const num=state.currentSurahNum;
  const showT=state.showTranslation;
  body.innerHTML=state.currentSurah.ayahs.map(function(a,i){
    const bm=hasBookmark(num,a.n);
    const arText=esc(a.ar);
    return '<div class="ayah" data-idx="'+i+'" data-num="'+a.n+'">'+
      '<div class="ayah-head">'+
        '<span class="ayah-num">'+a.n+'</span>'+
        '<div class="ayah-tools">'+
          '<button class="ayah-tool" data-act="play" data-idx="'+i+'" type="button" aria-label="Luaj"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg></button>'+
          '<button class="ayah-tool '+(bm?'is-on':'')+'" data-act="bookmark" data-idx="'+i+'" type="button" aria-label="Bookmark"><svg viewBox="0 0 24 24" width="14" height="14" fill="'+(bm?'currentColor':'none')+'" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>'+
        '</div>'+
      '</div>'+
      '<div class="ayah-ar">'+arText+'</div>'+
      (showT?'<div class="ayah-sq">'+esc(a.sq||'')+'</div>':'')+
    '</div>';
  }).join('');
  // Wire ayah tools
  $$('.ayah-tool',body).forEach(function(btn){
    btn.addEventListener('click',async function(ev){
      ev.stopPropagation();
      const idx=parseInt(btn.dataset.idx,10);
      const act=btn.dataset.act;
      if(act==='play'){
        if(global.XR_QuranPlayer)global.XR_QuranPlayer.playAyah(idx);
      }else if(act==='bookmark'){
        const a=state.currentSurah.ayahs[idx];
        await toggleBookmark(state.currentSurahNum,a.n);
        renderReaderBody();
        updateBookmarkBar();
      }
    });
  });
  // Tap ayah body to play
  $$('.ayah',body).forEach(function(div){
    div.addEventListener('click',function(){
      const idx=parseInt(div.dataset.idx,10);
      if(global.XR_QuranPlayer){
        const st=global.XR_QuranPlayer.getState();
        if(st.ayahIdx===idx && st.playing)global.XR_QuranPlayer.pause();
        else global.XR_QuranPlayer.playAyah(idx);
      }
    });
  });
}
function highlightActiveAyah(idx){
  if(state.activeAyahIdx===idx)return;
  state.activeAyahIdx=idx;
  $$('.ayah').forEach(function(el){
    el.classList.toggle('is-active',parseInt(el.dataset.idx,10)===idx);
  });
  scrollToAyah(idx,true);
  saveProgress();
}
function scrollToAyah(idx,smooth){
  const el=document.querySelector('.ayah[data-idx="'+idx+'"]');
  if(!el)return;
  el.scrollIntoView({behavior:smooth?'smooth':'instant',block:'center'});
}
function backToList(){
  state.view='list';
  $('#quranReader').style.display='none';
  $('#quranListView').style.display='';
  if(global.XR_QuranPlayer)global.XR_QuranPlayer.stop();
  if(state.unsubPlayer){state.unsubPlayer();state.unsubPlayer=null}
}

function updateBookmarkBar(){
  const bar=$('#bookmarksBar');if(!bar)return;
  const my=state.bookmarks.filter(function(b){return b.s===state.currentSurahNum}).sort(function(a,b){return a.a-b.a});
  if(!my.length){bar.style.display='none';return}
  bar.style.display='';
  bar.innerHTML='<span style="font-size:11px;color:var(--text-2);text-transform:uppercase;letter-spacing:.16em;font-weight:600">Bookmarks:</span>'+my.map(function(b){return '<button class="bm-pill" data-num="'+b.a+'" type="button">'+b.a+'</button>'}).join('');
  $$('.bm-pill',bar).forEach(function(btn){
    btn.addEventListener('click',function(){
      const n=parseInt(btn.dataset.num,10);
      const idx=state.currentSurah.ayahs.findIndex(function(a){return a.n===n});
      if(idx>=0)scrollToAyah(idx,true);
    });
  });
}

/* ====== INIT ====== */
async function init(){
  await loadBookmarks();
  // Setup search
  const sb=$('#quranSearch');
  if(sb){
    sb.addEventListener('input',function(ev){state.search=ev.target.value;renderSurahList()});
  }
  // Back button
  const bb=$('#btnReaderBack');
  if(bb)bb.addEventListener('click',backToList);
  // Continue reading
  const cont=$('#btnContinueReading');
  if(cont){
    cont.addEventListener('click',async function(){
      const p=await loadProgress();
      if(p)openSurah(p.s,p.a||0);
      else if(state.bookmarks.length)openSurah(state.bookmarks[0].s,0);
      else openSurah(1,0);
    });
  }
  // Player toolbar
  wirePlayerToolbar();
  // Initial list render
  renderSurahList();
  // Update continue button label
  refreshContinueLabel();
}

async function refreshContinueLabel(){
  const lbl=$('#continueLabel');if(!lbl)return;
  const p=await loadProgress();
  if(p){
    const m=global.XR_Quran.getSurahMeta(p.s);
    if(m)lbl.textContent='Vazhdo: '+m.sq+(p.a?' · ajeti '+(p.a+1):'');
  }else{
    lbl.textContent='Fillo me El-Fatiha';
  }
}

function wirePlayerToolbar(){
  const pp=$('#btnPlayPause');
  if(pp)pp.addEventListener('click',function(){
    if(!global.XR_QuranPlayer)return;
    const st=global.XR_QuranPlayer.getState();
    if(st.playing)global.XR_QuranPlayer.pause();
    else global.XR_QuranPlayer.play();
  });
  const pn=$('#btnPlayerNext');if(pn)pn.addEventListener('click',function(){if(global.XR_QuranPlayer)global.XR_QuranPlayer.nextAyah()});
  const pp2=$('#btnPlayerPrev');if(pp2)pp2.addEventListener('click',function(){if(global.XR_QuranPlayer)global.XR_QuranPlayer.prevAyah()});
  const sp=$('#btnPlayerSpeed');if(sp)sp.addEventListener('click',function(){
    if(!global.XR_QuranPlayer)return;
    const s=global.XR_QuranPlayer.getSpeed();
    const next=s>=1.5?0.75:s===0.75?1.0:s===1.0?1.25:s===1.25?1.5:1.0;
    global.XR_QuranPlayer.setSpeed(next);
    sp.textContent=next+'×';
  });
  const ra=$('#btnRepeatAyah');if(ra)ra.addEventListener('click',function(){
    ra.classList.toggle('is-on');
    if(global.XR_QuranPlayer)global.XR_QuranPlayer.setRepeatAyah(ra.classList.contains('is-on'));
  });
  const rs=$('#btnRepeatSurah');if(rs)rs.addEventListener('click',function(){
    rs.classList.toggle('is-on');
    if(global.XR_QuranPlayer)global.XR_QuranPlayer.setRepeatSurah(rs.classList.contains('is-on'));
  });
  const ts=$('#btnToggleTranslation');if(ts)ts.addEventListener('click',function(){
    state.showTranslation=!state.showTranslation;
    ts.classList.toggle('is-on',state.showTranslation);
    renderReaderBody();
    updateBookmarkBar();
  });
  const fs=$('#btnFontSize');if(fs)fs.addEventListener('click',function(){
    const sizes=[0.85,1.0,1.15,1.3];
    const cur=state.fontSize;
    const idx=sizes.indexOf(cur);
    state.fontSize=sizes[(idx+1)%sizes.length];
    document.documentElement.style.setProperty('--quran-font-scale',state.fontSize);
    fs.textContent='A'+(state.fontSize<1?'-':state.fontSize>1?'+':'');
  });

  if(global.XR_QuranPlayer){
    state.unsubPlayer=global.XR_QuranPlayer.subscribe(function(s){
      const btn=$('#btnPlayPause');
      if(btn)btn.innerHTML=s.playing?'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>':'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg>';
      const lbl=$('#playerNowPlaying');
      if(lbl&&s.ayahNum)lbl.textContent='Ajeti '+s.ayahNum+' · '+global.XR_Quran.getSurahMeta(s.surahNum).sq;
      if(s.event==='ayah'||s.event==='loaded'||s.event==='play')highlightActiveAyah(s.ayahIdx);
    });
  }
}

global.XR_QuranUI={init:init,openSurah:openSurah,backToList:backToList,fetchDailyAyah:fetchDailyAyah,refreshContinueLabel:refreshContinueLabel};
})(window);
