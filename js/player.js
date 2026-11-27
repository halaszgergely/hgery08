// HGWS – zenelejátszó (lapozás közben is szól tovább)
import { $, esc, toast } from './core.js?v=202611271920';

const audio = new Audio();
audio.preload = 'metadata';
let queue = [], idx = -1, shuffle = false, repeat = false, getTracks = () => [];
const fmt = s => !isFinite(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function init(tracksFn) {
  getTracks = tracksFn;
  try { audio.volume = +(localStorage.getItem('hgws_vol') ?? .8); } catch (_) { audio.volume = .8; }
  const bar = $('#pbar');
  bar.innerHTML = `<div class="prog2"><i id="pProg"></i></div>
    <div class="pl"><span class="pc" id="pCover"></span><div class="pt"><b id="pTitle"></b><small id="pArtist"></small></div></div>
    <div class="pm"><div class="pctl"><button id="pShuf" title="Keverés"><i class="ic ic-shuffle"></i></button><button id="pPrev" title="Előző"><i class="ic ic-skip-back"></i></button><button id="pPlay" class="pp" title="Lejátszás"><i class="ic ic-play"></i></button><button id="pNext" title="Következő"><i class="ic ic-skip-forward"></i></button><button id="pRep" title="Ismétlés"><i class="ic ic-repeat"></i></button></div>
      <div class="pseek"><span id="pCur">0:00</span><input type="range" id="pSeek" min="0" max="1000" value="0" aria-label="Pozíció"><span id="pDur">0:00</span></div></div>
    <div class="pr"><span><i class="ic ic-volume-2"></i></span><input type="range" id="pVol" min="0" max="1" step="0.01" value="${audio.volume}" aria-label="Hangerő"><button id="pClose" title="Bezárás"><i class="ic ic-x"></i></button></div>`;
  $('#pPlay').onclick = toggle;
  $('#pNext').onclick = () => next(true);
  $('#pPrev').onclick = prev;
  $('#pShuf').onclick = () => { shuffle = !shuffle; $('#pShuf').classList.toggle('on', shuffle); };
  $('#pRep').onclick = () => { repeat = !repeat; $('#pRep').classList.toggle('on', repeat); };
  $('#pClose').onclick = () => { audio.pause(); bar.hidden = true; document.body.classList.remove('hasplayer'); idx = -1; mark(); };
  $('#pVol').oninput = e => { audio.volume = +e.target.value; try { localStorage.setItem('hgws_vol', audio.volume); } catch (_) {} };
  let seeking = false;
  $('#pSeek').oninput = () => { seeking = true; $('#pCur').textContent = fmt($('#pSeek').value / 1000 * audio.duration); };
  $('#pSeek').onchange = () => { if (isFinite(audio.duration)) audio.currentTime = $('#pSeek').value / 1000 * audio.duration; seeking = false; };
  audio.addEventListener('timeupdate', () => {
    const p = audio.duration ? audio.currentTime / audio.duration : 0;
    $('#pProg').style.width = (p * 100) + '%';
    if (!seeking) { $('#pSeek').value = p * 1000; $('#pCur').textContent = fmt(audio.currentTime); }
  });
  audio.addEventListener('loadedmetadata', () => $('#pDur').textContent = fmt(audio.duration));
  audio.addEventListener('play', paint); audio.addEventListener('pause', paint);
  audio.addEventListener('ended', () => repeat ? (audio.currentTime = 0, audio.play()) : next(false));
  audio.addEventListener('error', () => { if (idx >= 0) toast('Ezt a zenét nem sikerült betölteni. Ellenőrizd a fájl elérési útját.', true); });
  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => audio.play()); ms.setActionHandler('pause', () => audio.pause());
    ms.setActionHandler('nexttrack', () => next(true)); ms.setActionHandler('previoustrack', prev);
  }
}

function paint() {
  const playing = !audio.paused;
  $('#pPlay').innerHTML = playing ? '<i class="ic ic-pause"></i>' : '<i class="ic ic-play"></i>';
  document.body.classList.toggle('playing', playing);
  mark();
}
/* a lejátszott szám kiemelése a listákban */
function mark() {
  const cur = queue[idx]?.id, playing = !audio.paused;
  document.querySelectorAll('[data-track]').forEach(el => {
    const on = el.dataset.track === cur;
    el.classList.toggle('cur', on); el.classList.toggle('isplay', on && playing);
  });
}
export const refreshMarks = mark;

function load(i) {
  idx = i; const t = queue[idx]; if (!t) return;
  audio.src = t.src; audio.play().catch(() => {});
  const bar = $('#pbar'); bar.hidden = false; document.body.classList.add('hasplayer');
  $('#pCover').style.backgroundImage = t.cover ? `url("${t.cover.replace(/"/g, '%22')}")` : '';
  $('#pTitle').textContent = t.title; $('#pArtist').textContent = t.artist || 'HGWS';
  $('#pDur').textContent = '0:00';
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || 'HGWS', album: 'HGWS Studios', artwork: t.cover ? [{ src: t.cover }] : [] });
  mark();
}
export function play(id, list) {
  const all = list || getTracks();
  const cur = queue[idx];
  if (cur && cur.id === id) return toggle();
  queue = all.slice(); const i = queue.findIndex(t => t.id === id);
  load(i < 0 ? 0 : i);
}
export function playAll(list) { if (!list.length) return; queue = list.slice(); if (shuffle) queue.sort(() => Math.random() - .5); load(0); }
export function toggle() { if (idx < 0) return; audio.paused ? audio.play() : audio.pause(); }
function next(manual) {
  if (!queue.length) return;
  if (shuffle && queue.length > 1) { let j; do j = Math.random() * queue.length | 0; while (j === idx); return load(j); }
  if (idx + 1 < queue.length) return load(idx + 1);
  if (manual || repeat) return load(0);
  audio.pause();
}
function prev() { if (audio.currentTime > 3) { audio.currentTime = 0; return; } load(idx > 0 ? idx - 1 : queue.length - 1); }
export const current = () => queue[idx]?.id;
export const isPlaying = () => !audio.paused;
