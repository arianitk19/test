/* qibla.js — Kibla compass (DeviceOrientation API + spherical bearing)
 *
 * Calculates bearing from user location to Kaaba (Mecca: 21.4225, 39.8262).
 * Uses absolute device orientation when available; falls back to relative.
 * On iOS, requests permission via DeviceOrientationEvent.requestPermission().
 */
(function(global){
'use strict';
const MECCA_LAT=21.4225;
const MECCA_LNG=39.8262;
const _rt={
  qiblaBearing:null,
  currentHeading:null,
  distanceKm:null,
  permission:'unknown', // 'unknown' | 'granted' | 'denied' | 'unavailable'
  hasAbsolute:false,
  listener:null,
  callbacks:new Set(),
  webkitNeedsAlpha:false
};

function toRad(d){return d*Math.PI/180}
function toDeg(r){return r*180/Math.PI}

/* Spherical bearing (Haversine-style) from (lat1,lng1) to (lat2,lng2) */
function bearing(lat1,lng1,lat2,lng2){
  const f1=toRad(lat1),f2=toRad(lat2);
  const dl=toRad(lng2-lng1);
  const y=Math.sin(dl)*Math.cos(f2);
  const x=Math.cos(f1)*Math.sin(f2)-Math.sin(f1)*Math.cos(f2)*Math.cos(dl);
  let b=toDeg(Math.atan2(y,x));
  return ((b%360)+360)%360;
}
function distance(lat1,lng1,lat2,lng2){
  const R=6371; // km
  const f1=toRad(lat1),f2=toRad(lat2);
  const df=toRad(lat2-lat1),dl=toRad(lng2-lng1);
  const a=Math.sin(df/2)*Math.sin(df/2)+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)*Math.sin(dl/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function computeBearing(lat,lng){
  _rt.qiblaBearing=bearing(lat,lng,MECCA_LAT,MECCA_LNG);
  _rt.distanceKm=distance(lat,lng,MECCA_LAT,MECCA_LNG);
  return _rt.qiblaBearing;
}

function getBearing(){return _rt.qiblaBearing}
function getHeading(){return _rt.currentHeading}
function getDistanceKm(){return _rt.distanceKm}
function getRelativeAngle(){
  if(_rt.qiblaBearing==null||_rt.currentHeading==null)return null;
  let a=_rt.qiblaBearing-_rt.currentHeading;
  return ((a%360)+360)%360;
}
function getPermissionState(){return _rt.permission}

function _onOrientation(ev){
  let heading=null;
  // iOS Safari: webkitCompassHeading is the actual heading from north (0-360)
  if(typeof ev.webkitCompassHeading==='number'){
    heading=ev.webkitCompassHeading;
  }else if(ev.absolute===true && typeof ev.alpha==='number'){
    // Android Chrome: alpha is 0 at north (compass-like) when absolute=true
    heading=360-ev.alpha;
    if(heading>=360)heading-=360;
  }else if(typeof ev.alpha==='number'){
    // Fallback: relative orientation
    heading=360-ev.alpha;
    if(heading>=360)heading-=360;
  }
  if(heading==null||isNaN(heading))return;
  _rt.currentHeading=heading;
  _rt.callbacks.forEach(function(cb){try{cb({heading:heading,qibla:_rt.qiblaBearing,delta:getRelativeAngle()})}catch(e){}});
}

async function start(){
  if(_rt.listener)return _rt.permission;
  // Try absolute orientation first (Android Chrome)
  if('DeviceOrientationEvent' in global){
    // iOS 13+ requires explicit permission
    if(typeof DeviceOrientationEvent.requestPermission==='function'){
      try{
        const r=await DeviceOrientationEvent.requestPermission();
        if(r!=='granted'){_rt.permission='denied';return 'denied'}
        _rt.permission='granted';
      }catch(e){_rt.permission='denied';return 'denied'}
    }else{
      _rt.permission='granted';
    }
    _rt.listener=_onOrientation;
    // Prefer 'deviceorientationabsolute' if available (true compass)
    if('ondeviceorientationabsolute' in global){
      global.addEventListener('deviceorientationabsolute',_rt.listener,true);
      _rt.hasAbsolute=true;
    }
    global.addEventListener('deviceorientation',_rt.listener,true);
    return 'granted';
  }
  _rt.permission='unavailable';
  return 'unavailable';
}

function stop(){
  if(!_rt.listener)return;
  try{global.removeEventListener('deviceorientation',_rt.listener,true)}catch(e){}
  try{global.removeEventListener('deviceorientationabsolute',_rt.listener,true)}catch(e){}
  _rt.listener=null;
}

function subscribe(cb){_rt.callbacks.add(cb);return function(){_rt.callbacks.delete(cb)}}

global.XR_Qibla={
  MECCA_LAT:MECCA_LAT,MECCA_LNG:MECCA_LNG,
  computeBearing:computeBearing,
  getBearing:getBearing,getHeading:getHeading,getDistanceKm:getDistanceKm,
  getRelativeAngle:getRelativeAngle,getPermissionState:getPermissionState,
  start:start,stop:stop,subscribe:subscribe,
  hasAbsolute:function(){return _rt.hasAbsolute}
};
})(window);
