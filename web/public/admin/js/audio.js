// Makes an uploaded song light: decode in the browser, mix down to mono, resample to 24 kHz and re-encode as a
// 48 kbps MP3 with lamejs (vendored in ./vendor, LGPL). A 3 minute song comes out around 1 MB, so it loads fast on
// a phone and plays without lag. Nothing leaves the admin's computer until it is already small.

export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
export const MAX_SECONDS = 300;            // 5 minutes
export const OUT_RATE = 24000;
export const OUT_KBPS = 48;

export const formatSize = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
export const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export function checkSong(file) {
  const isMp3 = file.type === 'audio/mpeg' || file.type === 'audio/mp3' || /\.mp3$/i.test(file.name || '');
  if (!isMp3) throw new Error('Please choose an MP3 file.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('That file is over 40 MB. Please choose a shorter song.');
}

let lameLoading = null;
function loadLame() {
  if (globalThis.lamejs?.Mp3Encoder) return Promise.resolve(globalThis.lamejs);
  lameLoading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('./vendor/lame.min.js', import.meta.url).href;
    s.onload = () => (globalThis.lamejs?.Mp3Encoder ? resolve(globalThis.lamejs) : reject(new Error('The audio tools did not load.')));
    s.onerror = () => { lameLoading = null; reject(new Error('The audio tools did not load. Check your connection and try again.')); };
    document.head.append(s);
  });
  return lameLoading;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * file -> { blob, seconds, bytes, originalBytes }.
 * onProgress receives a 0..1 number. Throws a friendly Error for files that are not audio, are empty or run too long.
 */
export async function compressSong(file, onProgress = () => {}) {
  checkSong(file);
  const lame = await loadLame();
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Ctx || !Offline) throw new Error('This browser cannot prepare audio. Please use a recent Chrome, Edge, Safari or Firefox.');

  onProgress(0.02);
  const raw = await file.arrayBuffer();
  const ctx = new Ctx();
  let decoded;
  try { decoded = await ctx.decodeAudioData(raw); } catch { throw new Error('That file could not be read as an MP3. Please try another.'); } finally { ctx.close?.(); }
  if (!decoded.length || !decoded.duration) throw new Error('That song is empty.');
  if (decoded.duration > MAX_SECONDS) throw new Error(`That song is ${formatTime(decoded.duration)} long. Songs can be up to ${formatTime(MAX_SECONDS)}.`);
  onProgress(0.1);

  // mono + 24 kHz via an offline render (the browser mixes the channels down and resamples for us)
  const off = new Offline(1, Math.ceil(decoded.duration * OUT_RATE), OUT_RATE);
  const src = off.createBufferSource();
  src.buffer = decoded; src.connect(off.destination); src.start();
  const mono = (await off.startRendering()).getChannelData(0);
  onProgress(0.25);

  const pcm = new Int16Array(mono.length);
  for (let i = 0; i < mono.length; i++) { const v = Math.max(-1, Math.min(1, mono[i])); pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff; }

  const enc = new lame.Mp3Encoder(1, OUT_RATE, OUT_KBPS);
  const parts = [];
  const block = 1152 * 40;
  for (let i = 0; i < pcm.length; i += block) {
    const out = enc.encodeBuffer(pcm.subarray(i, i + block));
    if (out.length) parts.push(out);
    if ((i / block) % 8 === 0) { onProgress(0.25 + 0.73 * (i / pcm.length)); await tick(); }
  }
  const end = enc.flush();
  if (end.length) parts.push(end);
  const blob = new Blob(parts, { type: 'audio/mpeg' });
  onProgress(1);
  return { blob, seconds: Math.round(decoded.duration), bytes: blob.size, originalBytes: file.size };
}
