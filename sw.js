// Offline support. Always tries the network first so updates appear straight
// away; falls back to the saved copy when there is no connection.
const CACHE = 'latin-v9';
const FILES = ['./', 'index.html', 'app.css', 'app.js', 'vocab.js', 'memory.js', 'phrases.js', 'effects.js', 'practice.js', 'sync.js',
  'manifest.webmanifest',
  ...["chomp1", "chomp2", "skitter1", "skitter2", "chompking1", "chompking2", "antbun1", "kamikaze1", "kamikaze2", "ghost1", "ghost2", "flying1", "flying2", "moley", "broodqueen1", "broodqueen2", "ghostking", "antbun/dead_leftarm", "antbun/dead_body", "antbun/dead_skull", "antbun/dead_arm", "antbun/dead_rightear", "antbun/hurt_leftear", "antbun/hurt_body", "antbun/hurt_righteyeclose", "antbun/hurt_righteyeopen", "antbun/hurt_arm", "antbun/hurt_rightear", "antbun/leftear", "antbun/body", "antbun/body2", "antbun/body3", "antbun/eyesopen", "antbun/rightear", "antbun/eyepopping", "antbun/eyesclose", "antbun/arm", "antbun/death1", "antbun/death2", "antbun/death3", "antbun/death4", "antbun/death5", "antbun/death6", "antbun/death7", "antbun/death8", "antbun/death9"].map(a => 'art/squishies/' + a + '.png'), 'art/squishies/sharky.png',
  ...["blaster1", "blaster2", "blaster3", "bullet", "planet", "bolt", "bolt2", "ice", "title_gameover", "title_youwin", "laurel_l", "laurel_r", "spaceman_sad", "star", "star_dark", "pose_stand", "pose_wave", "pose_arms", "pose_hips", "pose_thumbs", "pose_facepalm", "emo_neutral", "emo_xx", "emo_happy", "emo_sleepy", "emo_shock", "emo_sad", "emo_confused", "emo_qqq", "emo_v", "emo_bear", "emo_stare", "emo_love", "emo_grin", "wave1", "wave2", "wave3", "wave4", "icon_practice"].map(a => 'art/ui/' + a + '.png'), 'art/ui/crown.png',
  ...["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10", "t11", "t12", "t13", "t14", "t15", "t16", "t17", "t18", "t19"].map(a => 'art/trophies/' + a + '.png'), 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
