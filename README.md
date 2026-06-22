# Xhamia e Fshatit Ratkoc — PWA v3.0

Aplikacioni zyrtar i Xhamise se Fshatit Ratkoc, Rahovec, Kosove.

## Cfare ka te re ne v3

- **Tab i ri Kibla** me busull qe perdor magnetometrin e telefonit
- **Karte Reflektimi** ne fillim (zevendeson Imami/Muezini) me ajete/hadithe qe rrotullohen cdo 12s
- **Njoftime strikte** me 5 nivele redundance (TimestampTrigger + setTimeout + heartbeat + visibility/focus + sync)
- **Nav i fiksuar** poshte qe nuk levizet (safe-area inset, transform translateZ)
- **Optimizim total per telefona** - tap targets ≥44px, no double-tap zoom, smooth scrolling
- **6 tabe** ne nav: Xhamia · Namazi · Kibla · Rreth · Galeria · Cilesimet

## Permbajtja

### 1. Kohet e namazit (3 burime)

- **BIK** (PRIMAR) — te dhena zyrtare nga Takvimi i Bashkesise Islame te Kosoves
  Marrur nga repo `drilonjaha/kohet-e-namazit-kosove-json` ne GitHub
  Cache-uar offline pas leximit te pare
- **Aladhan API** (alternative online, method 3 / MWL)
- **Diyanet** (alternative online, method 13 / Turqi)
- **Fallback offline**: llogaritje lokale me parametra te sakte BIK
  (Fajr 18°, Isha 17°, Hanafi, +6 min Temkin)

### 2. Kibla (NEW)

- Busull qe rrotullohet me magnetometrin e telefonit
- Distanca te Meka ne km
- Drejtimi i sakte i Kabes nga Ratkoc (~136°, ~2940 km)
- Vibrim haptik kur shigjeta perputhet me Kaben
- Mbeshtet iOS (kerkon leje DeviceOrientation) + Android Chrome

### 3. Njoftimet 100% strikte

5 mekanizma redundance:
1. **Notification.showTrigger** (Chrome 80+) — fire edhe kur shfletuesi mbyllur
2. **setTimeout** ne faqe (kur app eshte hapur)
3. **Service Worker** schedule (persistent)
4. **Re-verifikim** ne visibilitychange/focus/online/prefs-changed
5. **Heartbeat 30s** qe rekuperon njoftime te humbur

### 4. Reflektim card

8 ajete/hadithe ne arabisht + perkthim shqip + burimi
Rrotullohen automatikisht cdo 12 sekonda
Animime: shine sweep, conic rotation, kornize e arte

### 5. Galeri

6 vende per foto, mbeshtet:
- URL te jashtem (Imgur, Cloudinary, etj)
- Path lokal (`assets/gallery/foto-1.jpg`)
- Placeholder elegant kur src=''
- Fullscreen viewer me swipe, klik mbrapa, ESC

### 6. Tema

Erret · Soft · Drita

## Si t'i shtosh fotot e xhamise

Hap `js/ui-controller.js` rreshti ~18. Gjej:

```js
const GALLERY_ITEMS = [
  { src: '', title: 'Pamja jashtme' },
  ...
];
```

Zevendeso `src: ''` me URL ose path:

```js
const GALLERY_ITEMS = [
  { src: 'https://i.imgur.com/abc123.jpg', title: 'Pamja jashtme' },
  { src: 'assets/gallery/foto-2.jpg',      title: 'Mihrabi' },
  ...
];
```

Per Opsion B, vendos `foto-1.jpg`...`foto-6.jpg` ne folderin `assets/gallery/`.

## Si ta nisesh lokalisht

```powershell
cd "$env:USERPROFILE\OneDrive\Desktop\Xhamia-Ratkoc"
python -m http.server 8080
```

Hap `http://localhost:8080` ne Chrome ose Edge. Kibla nuk funksionon ne localhost (kerkon HTTPS), por gjithcka tjeter po.

## Si ta ngarkosh ne server real (HTTPS)

1. Ngarko folderin `Xhamia-Ratkoc/` ne hapesiren e webit
2. Aksesoje me `https://domain.com/xhamia/`
3. Service Worker aktivizohet automatikisht
4. Kibla funksionon ne mobile

Opsione hostimi pa pages:
- **GitHub Pages**: push folderin te GitHub, aktivizo Pages
- **Netlify**: drag-drop folderin ne netlify.com/drop
- **Cloudflare Pages**: lidh repo-n

## Struktura

```
Xhamia-Ratkoc/
├── index.html
├── manifest.json
├── service-worker.js
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js              (bootstrap, anti-zoom)
│   ├── storage.js          (IndexedDB)
│   ├── prayer-engine.js    (BIK/Aladhan/Diyanet + fallback BIK params)
│   ├── notifications.js    (strict mode, 5 mechanisms)
│   ├── qibla.js            (DeviceOrientation, spherical bearing)
│   ├── ui-controller.js    (UI, reflektim, galeri  EDIT FOR PHOTOS)
│   └── sw-register.js
└── assets/
    ├── icons/
    │   ├── icon.svg
    │   └── maskable.svg
    └── gallery/   (vendos foto-1.jpg deri foto-6.jpg ketu)
```

## Krediti

- **Te dhenat BIK**: [drilonjaha/kohet-e-namazit-kosove-json](https://github.com/drilonjaha/kohet-e-namazit-kosove-json)
- **Burimi origjinal**: Takvimi zyrtar i [Bashkesise Islame te Kosoves](https://bislame.net)
- **API**: [Aladhan](https://aladhan.com)
- **Diyanet**: [Diyanet Isleri](https://diyanet.gov.tr)
