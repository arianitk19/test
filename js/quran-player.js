/* quran-player.js — Audio engine for Quran recitation
 *
 * Features:
 *  - Single ayah audio playback
 *  - Auto-advance through surah
 *  - Repeat ayah / repeat surah
 *  - Playback speed (0.75x, 1x, 1.25x, 1.5x)
 *  - Media Session API for lock-screen controls
 *  - Background audio (continues when minimized)
 *  - Callbacks for UI sync (active ayah highlighting)
 */
(function(global){
'use strict';

const _rt={
  audio:null,
  surahNum:null,
  surah:null,        // {ayahs:[]}
  ayahIdx:0,         // 0-based index into ayahs
  playing:false,
  speed:1.0,
  repeatAyah:false,
  repeatSurah:false,
  callbacks:new Set(),
  preloadNext:null
};

function _ensureAudio(){
  if(_rt.audio)return _rt.audio;
  const a=new Audio();
  a.preload='auto';
  a.crossOrigin='anonymous';
  a.addEventListener('ended',_onEnded);
  a.addEventListener('play',function(){_rt.playing=true;_notify('play')});
  a.addEventListener('pause',function(){_rt.playing=false;_notify('pause')});
  a.addEventListener('timeupdate',function(){_notify('time')});
  a.addEventListener('error',function(){_notify('error')});
  _rt.audio=a;
  return a;
}

function _notify(ev){
  const state={
    event:ev,
    surahNum:_rt.surahNum,
    ayahIdx:_rt.ayahIdx,
    ayahNum:_rt.surah&&_rt.surah.ayahs[_rt.ayahIdx]?_rt.surah.ayahs[_rt.ayahIdx].n:null,
    playing:_rt.playing,
    speed:_rt.speed,
    currentTime:_rt.audio?_rt.audio.currentTime:0,
    duration:_rt.audio?_rt.audio.duration:0
  };
  _rt.callbacks.forEach(function(cb){try{cb(state)}catch(e){}});
}

function _onEnded(){
  if(_rt.repeatAyah){
    _rt.audio.currentTime=0;
    _rt.audio.play().catch(function(){});
    return;
  }
  if(!_rt.surah||!_rt.surah.ayahs)return;
  const nextIdx=_rt.ayahIdx+1;
  if(nextIdx<_rt.surah.ayahs.length){
    _rt.ayahIdx=nextIdx;
    _loadAndPlay();
  }else{
    if(_rt.repeatSurah){
      _rt.ayahIdx=0;
      _loadAndPlay();
    }else{
      _rt.playing=false;
      _notify('finished');
    }
  }
}

function _loadAndPlay(){
  if(!_rt.surah||!_rt.surah.ayahs[_rt.ayahIdx])return;
  const a=_ensureAudio();
  const ayah=_rt.surah.ayahs[_rt.ayahIdx];
  const url=global.XR_Quran.ayahAudioUrl(_rt.surahNum,ayah.n);
  a.src=url;
  a.playbackRate=_rt.speed;
  a.play().catch(function(e){console.warn('play err',e);_notify('error')});
  _notify('ayah');
  _updateMediaSession();
  // Preload next
  if(_rt.preloadNext)_rt.preloadNext.src='';
  const nextIdx=_rt.ayahIdx+1;
  if(nextIdx<_rt.surah.ayahs.length){
    const nextAyah=_rt.surah.ayahs[nextIdx];
    _rt.preloadNext=new Audio(global.XR_Quran.ayahAudioUrl(_rt.surahNum,nextAyah.n));
    _rt.preloadNext.preload='auto';
  }
}

function _updateMediaSession(){
  if(!('mediaSession' in navigator))return;
  const meta=global.XR_Quran.getSurahMeta(_rt.surahNum);
  const ayah=_rt.surah&&_rt.surah.ayahs[_rt.ayahIdx];
  if(!meta||!ayah)return;
  try{
    navigator.mediaSession.metadata=new MediaMetadata({
      title:meta.sq+' · Ajeti '+ayah.n,
      artist:'Mishary Rashid Alafasy',
      album:'Kurani Famelarte',
      artwork:[
        {src:'assets/icons/icon.svg',sizes:'512x512',type:'image/svg+xml'}
      ]
    });
    navigator.mediaSession.playbackState=_rt.playing?'playing':'paused';
    navigator.mediaSession.setActionHandler('play',function(){play()});
    navigator.mediaSession.setActionHandler('pause',function(){pause()});
    navigator.mediaSession.setActionHandler('previoustrack',function(){prevAyah()});
    navigator.mediaSession.setActionHandler('nexttrack',function(){nextAyah()});
    navigator.mediaSession.setActionHandler('seekbackward',function(){if(_rt.audio)_rt.audio.currentTime=Math.max(0,_rt.audio.currentTime-5)});
    navigator.mediaSession.setActionHandler('seekforward',function(){if(_rt.audio)_rt.audio.currentTime+=5});
  }catch(e){}
}

/* Public API */
function loadSurah(surahData,startAyahIdx){
  _rt.surah=surahData;
  _rt.surahNum=surahData.num;
  _rt.ayahIdx=startAyahIdx||0;
  _notify('loaded');
}
function playAyah(ayahIdx){
  if(!_rt.surah)return;
  _rt.ayahIdx=ayahIdx||0;
  _loadAndPlay();
}
function play(){
  if(_rt.audio&&_rt.audio.src){_rt.audio.play().catch(function(){})}
  else if(_rt.surah){_loadAndPlay()}
}
function pause(){if(_rt.audio)_rt.audio.pause()}
function stop(){
  if(_rt.audio){_rt.audio.pause();_rt.audio.currentTime=0;_rt.audio.src=''}
  _rt.playing=false;
  _notify('stop');
}
function nextAyah(){
  if(!_rt.surah)return;
  const n=_rt.ayahIdx+1;
  if(n<_rt.surah.ayahs.length){_rt.ayahIdx=n;_loadAndPlay()}
}
function prevAyah(){
  if(!_rt.surah)return;
  const n=Math.max(0,_rt.ayahIdx-1);
  _rt.ayahIdx=n;_loadAndPlay();
}
function setSpeed(s){
  _rt.speed=s;
  if(_rt.audio)_rt.audio.playbackRate=s;
  _notify('speed');
}
function getSpeed(){return _rt.speed}
function setRepeatAyah(v){_rt.repeatAyah=!!v;_notify('repeat')}
function setRepeatSurah(v){_rt.repeatSurah=!!v;_notify('repeat')}
function getState(){return{surahNum:_rt.surahNum,ayahIdx:_rt.ayahIdx,playing:_rt.playing,speed:_rt.speed,repeatAyah:_rt.repeatAyah,repeatSurah:_rt.repeatSurah}}
function subscribe(cb){_rt.callbacks.add(cb);return function(){_rt.callbacks.delete(cb)}}

global.XR_QuranPlayer={
  loadSurah:loadSurah,
  playAyah:playAyah,
  play:play,pause:pause,stop:stop,
  nextAyah:nextAyah,prevAyah:prevAyah,
  setSpeed:setSpeed,getSpeed:getSpeed,
  setRepeatAyah:setRepeatAyah,setRepeatSurah:setRepeatSurah,
  getState:getState,
  subscribe:subscribe
};
})(window);
