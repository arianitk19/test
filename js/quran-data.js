/* quran-data.js — Quran metadata + API client
 *
 * Data sources:
 *  - Arabic + Albanian translation: https://api.alquran.cloud/v1/
 *    Edition codes: ar.quran-uthmani (Arabic Uthmani), sq.ahmeti (Sherif Ahmeti)
 *  - Audio per ayah: https://everyayah.com/data/Alafasy_128kbps/{ssaaa}.mp3
 *    (s = surah 3-digit, aa = ayah 3-digit, e.g. 001001.mp3 = Surah 1, Ayah 1)
 *  - Audio per surah: https://server8.mp3quran.net/afs/{nnn}.mp3
 */
(function(global){
'use strict';

const SURAHS=[
  {n:1,ar:'الفاتحة',sq:'El-Fatiha',en:'The Opening',v:7,r:'mekke',o:5},
  {n:2,ar:'البقرة',sq:'El-Bekare',en:'The Cow',v:286,r:'medine',o:87},
  {n:3,ar:'آل عمران',sq:'Al-Imran',en:'Family of Imran',v:200,r:'medine',o:89},
  {n:4,ar:'النساء',sq:'En-Nisa',en:'The Women',v:176,r:'medine',o:92},
  {n:5,ar:'المائدة',sq:'El-Maide',en:'The Table',v:120,r:'medine',o:112},
  {n:6,ar:'الأنعام',sq:'El-Enam',en:'The Cattle',v:165,r:'mekke',o:55},
  {n:7,ar:'الأعراف',sq:'El-Araf',en:'The Heights',v:206,r:'mekke',o:39},
  {n:8,ar:'الأنفال',sq:'El-Enfal',en:'The Spoils of War',v:75,r:'medine',o:88},
  {n:9,ar:'التوبة',sq:'Et-Tewbe',en:'The Repentance',v:129,r:'medine',o:113},
  {n:10,ar:'يونس',sq:'Junus',en:'Jonah',v:109,r:'mekke',o:51},
  {n:11,ar:'هود',sq:'Hud',en:'Hud',v:123,r:'mekke',o:52},
  {n:12,ar:'يوسف',sq:'Jusuf',en:'Joseph',v:111,r:'mekke',o:53},
  {n:13,ar:'الرعد',sq:'Er-Ra\'d',en:'The Thunder',v:43,r:'medine',o:96},
  {n:14,ar:'إبراهيم',sq:'Ibrahim',en:'Abraham',v:52,r:'mekke',o:72},
  {n:15,ar:'الحجر',sq:'El-Hixhr',en:'The Rocky Tract',v:99,r:'mekke',o:54},
  {n:16,ar:'النحل',sq:'En-Nahl',en:'The Bee',v:128,r:'mekke',o:70},
  {n:17,ar:'الإسراء',sq:'El-Isra',en:'The Night Journey',v:111,r:'mekke',o:50},
  {n:18,ar:'الكهف',sq:'El-Kehf',en:'The Cave',v:110,r:'mekke',o:69},
  {n:19,ar:'مريم',sq:'Merjem',en:'Mary',v:98,r:'mekke',o:44},
  {n:20,ar:'طه',sq:'Ta-Ha',en:'Ta-Ha',v:135,r:'mekke',o:45},
  {n:21,ar:'الأنبياء',sq:'El-Enbija',en:'The Prophets',v:112,r:'mekke',o:73},
  {n:22,ar:'الحج',sq:'El-Haxh',en:'The Pilgrimage',v:78,r:'medine',o:103},
  {n:23,ar:'المؤمنون',sq:'El-Muminun',en:'The Believers',v:118,r:'mekke',o:74},
  {n:24,ar:'النور',sq:'En-Nur',en:'The Light',v:64,r:'medine',o:102},
  {n:25,ar:'الفرقان',sq:'El-Furkan',en:'The Criterion',v:77,r:'mekke',o:42},
  {n:26,ar:'الشعراء',sq:'Esh-Shuara',en:'The Poets',v:227,r:'mekke',o:47},
  {n:27,ar:'النمل',sq:'En-Neml',en:'The Ant',v:93,r:'mekke',o:48},
  {n:28,ar:'القصص',sq:'El-Kasas',en:'The Stories',v:88,r:'mekke',o:49},
  {n:29,ar:'العنكبوت',sq:'El-Ankebut',en:'The Spider',v:69,r:'mekke',o:85},
  {n:30,ar:'الروم',sq:'Er-Rum',en:'The Romans',v:60,r:'mekke',o:84},
  {n:31,ar:'لقمان',sq:'Llukman',en:'Luqman',v:34,r:'mekke',o:57},
  {n:32,ar:'السجدة',sq:'Es-Sexhde',en:'The Prostration',v:30,r:'mekke',o:75},
  {n:33,ar:'الأحزاب',sq:'El-Ahzab',en:'The Confederates',v:73,r:'medine',o:90},
  {n:34,ar:'سبأ',sq:'Sebe',en:'Sheba',v:54,r:'mekke',o:58},
  {n:35,ar:'فاطر',sq:'Fatir',en:'Originator',v:45,r:'mekke',o:43},
  {n:36,ar:'يس',sq:'Jasin',en:'Ya-Sin',v:83,r:'mekke',o:41},
  {n:37,ar:'الصافات',sq:'Es-Safat',en:'Those Who Set Ranks',v:182,r:'mekke',o:56},
  {n:38,ar:'ص',sq:'Sad',en:'Sad',v:88,r:'mekke',o:38},
  {n:39,ar:'الزمر',sq:'Ez-Zumer',en:'The Groups',v:75,r:'mekke',o:59},
  {n:40,ar:'غافر',sq:'El-Mu\'min',en:'The Forgiver',v:85,r:'mekke',o:60},
  {n:41,ar:'فصلت',sq:'Fussilet',en:'Explained in Detail',v:54,r:'mekke',o:61},
  {n:42,ar:'الشورى',sq:'Esh-Shura',en:'The Consultation',v:53,r:'mekke',o:62},
  {n:43,ar:'الزخرف',sq:'Ez-Zuhruf',en:'The Gold',v:89,r:'mekke',o:63},
  {n:44,ar:'الدخان',sq:'Ed-Duhan',en:'The Smoke',v:59,r:'mekke',o:64},
  {n:45,ar:'الجاثية',sq:'El-Xhathije',en:'The Crouching',v:37,r:'mekke',o:65},
  {n:46,ar:'الأحقاف',sq:'El-Ahkaf',en:'The Wind-Curved Sandhills',v:35,r:'mekke',o:66},
  {n:47,ar:'محمد',sq:'Muhammed',en:'Muhammad',v:38,r:'medine',o:95},
  {n:48,ar:'الفتح',sq:'El-Fet\'h',en:'The Victory',v:29,r:'medine',o:111},
  {n:49,ar:'الحجرات',sq:'El-Huxhurat',en:'The Rooms',v:18,r:'medine',o:106},
  {n:50,ar:'ق',sq:'Kaf',en:'Qaf',v:45,r:'mekke',o:34},
  {n:51,ar:'الذاريات',sq:'Edh-Dharijat',en:'The Winnowing Winds',v:60,r:'mekke',o:67},
  {n:52,ar:'الطور',sq:'Et-Tur',en:'The Mount',v:49,r:'mekke',o:76},
  {n:53,ar:'النجم',sq:'En-Nexhm',en:'The Star',v:62,r:'mekke',o:23},
  {n:54,ar:'القمر',sq:'El-Kamer',en:'The Moon',v:55,r:'mekke',o:37},
  {n:55,ar:'الرحمن',sq:'Er-Rahman',en:'The Merciful',v:78,r:'medine',o:97},
  {n:56,ar:'الواقعة',sq:'El-Wakia',en:'The Inevitable',v:96,r:'mekke',o:46},
  {n:57,ar:'الحديد',sq:'El-Hadid',en:'The Iron',v:29,r:'medine',o:94},
  {n:58,ar:'المجادلة',sq:'El-Muxhadele',en:'The Pleading Woman',v:22,r:'medine',o:105},
  {n:59,ar:'الحشر',sq:'El-Hashr',en:'The Exile',v:24,r:'medine',o:101},
  {n:60,ar:'الممتحنة',sq:'El-Mumtehine',en:'She That Is to Be Examined',v:13,r:'medine',o:91},
  {n:61,ar:'الصف',sq:'Es-Saff',en:'The Ranks',v:14,r:'medine',o:109},
  {n:62,ar:'الجمعة',sq:'El-Xhumua',en:'Friday',v:11,r:'medine',o:110},
  {n:63,ar:'المنافقون',sq:'El-Munafikun',en:'The Hypocrites',v:11,r:'medine',o:104},
  {n:64,ar:'التغابن',sq:'Et-Tegabun',en:'Mutual Disillusion',v:18,r:'medine',o:108},
  {n:65,ar:'الطلاق',sq:'Et-Talak',en:'Divorce',v:12,r:'medine',o:99},
  {n:66,ar:'التحريم',sq:'Et-Tahrim',en:'The Prohibition',v:12,r:'medine',o:107},
  {n:67,ar:'الملك',sq:'El-Mulk',en:'The Sovereignty',v:30,r:'mekke',o:77},
  {n:68,ar:'القلم',sq:'El-Kalem',en:'The Pen',v:52,r:'mekke',o:2},
  {n:69,ar:'الحاقة',sq:'El-Hakka',en:'The Reality',v:52,r:'mekke',o:78},
  {n:70,ar:'المعارج',sq:'El-Mearixh',en:'The Ascending Stairways',v:44,r:'mekke',o:79},
  {n:71,ar:'نوح',sq:'Nuh',en:'Noah',v:28,r:'mekke',o:71},
  {n:72,ar:'الجن',sq:'El-Xhinn',en:'The Jinn',v:28,r:'mekke',o:40},
  {n:73,ar:'المزمل',sq:'El-Muzzemmil',en:'The Enshrouded One',v:20,r:'mekke',o:3},
  {n:74,ar:'المدثر',sq:'El-Muddethir',en:'The Cloaked One',v:56,r:'mekke',o:4},
  {n:75,ar:'القيامة',sq:'El-Kijame',en:'The Resurrection',v:40,r:'mekke',o:31},
  {n:76,ar:'الإنسان',sq:'El-Insan',en:'Man',v:31,r:'medine',o:98},
  {n:77,ar:'المرسلات',sq:'El-Murselat',en:'The Emissaries',v:50,r:'mekke',o:33},
  {n:78,ar:'النبأ',sq:'En-Nebe',en:'The Tidings',v:40,r:'mekke',o:80},
  {n:79,ar:'النازعات',sq:'En-Naziat',en:'Those Who Drag Forth',v:46,r:'mekke',o:81},
  {n:80,ar:'عبس',sq:'Abese',en:'He Frowned',v:42,r:'mekke',o:24},
  {n:81,ar:'التكوير',sq:'Et-Tekwir',en:'The Overthrowing',v:29,r:'mekke',o:7},
  {n:82,ar:'الانفطار',sq:'El-Infitar',en:'The Cleaving',v:19,r:'mekke',o:82},
  {n:83,ar:'المطففين',sq:'El-Mutaffifin',en:'Defrauding',v:36,r:'mekke',o:86},
  {n:84,ar:'الانشقاق',sq:'El-Inshikak',en:'The Sundering',v:25,r:'mekke',o:83},
  {n:85,ar:'البروج',sq:'El-Buruxh',en:'The Mansions of the Stars',v:22,r:'mekke',o:27},
  {n:86,ar:'الطارق',sq:'Et-Tarik',en:'The Morning Star',v:17,r:'mekke',o:36},
  {n:87,ar:'الأعلى',sq:'El-Ala',en:'The Most High',v:19,r:'mekke',o:8},
  {n:88,ar:'الغاشية',sq:'El-Gashije',en:'The Overwhelming',v:26,r:'mekke',o:68},
  {n:89,ar:'الفجر',sq:'El-Fexhr',en:'The Dawn',v:30,r:'mekke',o:10},
  {n:90,ar:'البلد',sq:'El-Beled',en:'The City',v:20,r:'mekke',o:35},
  {n:91,ar:'الشمس',sq:'Esh-Shems',en:'The Sun',v:15,r:'mekke',o:26},
  {n:92,ar:'الليل',sq:'El-Lejl',en:'The Night',v:21,r:'mekke',o:9},
  {n:93,ar:'الضحى',sq:'Ed-Duha',en:'The Morning Hours',v:11,r:'mekke',o:11},
  {n:94,ar:'الشرح',sq:'El-Inshirah',en:'The Relief',v:8,r:'mekke',o:12},
  {n:95,ar:'التين',sq:'Et-Tin',en:'The Fig',v:8,r:'mekke',o:28},
  {n:96,ar:'العلق',sq:'El-Alek',en:'The Clot',v:19,r:'mekke',o:1},
  {n:97,ar:'القدر',sq:'El-Kadr',en:'The Power',v:5,r:'mekke',o:25},
  {n:98,ar:'البينة',sq:'El-Bejjine',en:'The Clear Evidence',v:8,r:'medine',o:100},
  {n:99,ar:'الزلزلة',sq:'Ez-Zelzele',en:'The Earthquake',v:8,r:'medine',o:93},
  {n:100,ar:'العاديات',sq:'El-Adijat',en:'The Coursers',v:11,r:'mekke',o:14},
  {n:101,ar:'القارعة',sq:'El-Karia',en:'The Calamity',v:11,r:'mekke',o:30},
  {n:102,ar:'التكاثر',sq:'Et-Tekathur',en:'The Rivalry',v:8,r:'mekke',o:16},
  {n:103,ar:'العصر',sq:'El-Asr',en:'The Declining Day',v:3,r:'mekke',o:13},
  {n:104,ar:'الهمزة',sq:'El-Humeze',en:'The Traducer',v:9,r:'mekke',o:32},
  {n:105,ar:'الفيل',sq:'El-Fil',en:'The Elephant',v:5,r:'mekke',o:19},
  {n:106,ar:'قريش',sq:'Kurejsh',en:'Quraysh',v:4,r:'mekke',o:29},
  {n:107,ar:'الماعون',sq:'El-Maun',en:'Small Kindnesses',v:7,r:'mekke',o:17},
  {n:108,ar:'الكوثر',sq:'El-Kewther',en:'The Abundance',v:3,r:'mekke',o:15},
  {n:109,ar:'الكافرون',sq:'El-Kafirun',en:'The Disbelievers',v:6,r:'mekke',o:18},
  {n:110,ar:'النصر',sq:'En-Nasr',en:'The Divine Support',v:3,r:'medine',o:114},
  {n:111,ar:'المسد',sq:'El-Mesed',en:'The Palm Fiber',v:5,r:'mekke',o:6},
  {n:112,ar:'الإخلاص',sq:'El-Ihlas',en:'The Sincerity',v:4,r:'mekke',o:22},
  {n:113,ar:'الفلق',sq:'El-Felek',en:'The Daybreak',v:5,r:'mekke',o:20},
  {n:114,ar:'الناس',sq:'En-Nas',en:'Mankind',v:6,r:'mekke',o:21}
];

function pad3(n){return String(n).padStart(3,'0')}
const API_BASE='https://api.alquran.cloud/v1';
const AUDIO_BASE='https://everyayah.com/data/Alafasy_128kbps';
const SURAH_AUDIO_BASE='https://server8.mp3quran.net/afs';

function ayahAudioUrl(surah,ayah){return AUDIO_BASE+'/'+pad3(surah)+pad3(ayah)+'.mp3'}
function surahAudioUrl(surah){return SURAH_AUDIO_BASE+'/'+pad3(surah)+'.mp3'}

async function fetchSurah(num){
  // Try cache first via IndexedDB
  const cacheKey='surah:'+num;
  try{const cached=await global.XR_Storage.getMeta(cacheKey);if(cached&&cached.ayahs)return cached}catch(e){}
  if(!navigator.onLine)return null;
  try{
    const ctrl=new AbortController();
    const tm=setTimeout(function(){ctrl.abort()},12000);
    // Multi-edition: ar.quran-uthmani + sq.ahmeti
    const url=API_BASE+'/surah/'+num+'/editions/ar.quran-uthmani,sq.ahmeti';
    const r=await fetch(url,{signal:ctrl.signal});
    clearTimeout(tm);
    if(!r.ok)return null;
    const j=await r.json();
    if(!j||!j.data||!Array.isArray(j.data))return null;
    const ar=j.data[0];
    const sq=j.data[1];
    if(!ar||!ar.ayahs)return null;
    const out={num:num,nameAr:ar.englishName||'',nameSq:(SURAHS.find(s=>s.n===num)||{}).sq||'',ayahs:[]};
    for(let i=0;i<ar.ayahs.length;i++){
      const a=ar.ayahs[i];
      const s=sq&&sq.ayahs?sq.ayahs[i]:null;
      out.ayahs.push({n:a.numberInSurah,ar:a.text,sq:s?s.text:'',juz:a.juz||1,hizb:a.hizbQuarter||1,sajda:!!a.sajda});
    }
    try{await global.XR_Storage.setMeta(cacheKey,out)}catch(e){}
    return out;
  }catch(e){return null}
}

function getSurahMeta(num){return SURAHS.find(function(s){return s.n===num})}
function searchSurahs(query){
  if(!query)return SURAHS;
  const q=query.toLowerCase().trim();
  if(/^\d+$/.test(q)){const n=parseInt(q,10);if(n>=1&&n<=114)return SURAHS.filter(function(s){return s.n===n})}
  return SURAHS.filter(function(s){
    return s.sq.toLowerCase().indexOf(q)>=0 ||
           s.en.toLowerCase().indexOf(q)>=0 ||
           s.ar.indexOf(query)>=0;
  });
}

global.XR_Quran={
  SURAHS:SURAHS,
  fetchSurah:fetchSurah,
  getSurahMeta:getSurahMeta,
  searchSurahs:searchSurahs,
  ayahAudioUrl:ayahAudioUrl,
  surahAudioUrl:surahAudioUrl
};
})(window);
