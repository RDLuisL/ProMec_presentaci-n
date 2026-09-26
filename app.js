const slides = [...document.querySelectorAll('.slide')];
const reveals = [...document.querySelectorAll('.reveal')];
const progressBar = document.getElementById('progressBar');
const dotsWrap = document.getElementById('dots');
const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
const presentation = document.getElementById('presentation');
const startPresentationBtn = document.getElementById('startPresentationBtn');

let currentSlide = 0;
let audioReady = false;
let audioCtx = null;
let lastPlayedAt = 0;
const MASTER_VOLUME = 1.9;

/* =========================
   MODAL INICIAL + LOCALSTORAGE
   ========================= */
const MODAL_STORAGE_KEY = 'promec_hide_initial_notice_v1';
const noticeModal = document.getElementById('noticeModal');
const noticeConfirm = document.getElementById('noticeConfirm');
const dontShowAgain = document.getElementById('dontShowAgain');

function openNoticeModal(){
  if (!noticeModal) return;
  noticeModal.classList.add('is-open');
  noticeModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeNoticeModal(){
  if (!noticeModal) return;
  if (dontShowAgain?.checked){
    localStorage.setItem(MODAL_STORAGE_KEY, 'true');
  }
  noticeModal.classList.remove('is-open');
  noticeModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

if (localStorage.getItem(MODAL_STORAGE_KEY) !== 'true'){
  window.addEventListener('DOMContentLoaded', openNoticeModal, {once:true});
}
noticeConfirm?.addEventListener('click', closeNoticeModal);

/* =========================
   MENÚ
   ========================= */
menuBtn?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

/* =========================
   FULLSCREEN
   ========================= */
async function enterFullscreen(){
  try{
    const target = document.documentElement;
    if (!document.fullscreenElement && target.requestFullscreen){
      await target.requestFullscreen();
    }
  }catch(err){
    console.warn('No fue posible activar pantalla completa:', err);
  }
}

startPresentationBtn?.addEventListener('click', async () => {
  initAudio();
  await enterFullscreen();
  slides[1]?.scrollIntoView({behavior:'smooth'});
});

function syncFullscreenClass(){
  document.body.classList.toggle('is-fullscreen', Boolean(document.fullscreenElement));
}
document.addEventListener('fullscreenchange', syncFullscreenClass);
syncFullscreenClass();

/* Inserta el indicador logo_scrolldown en todas las diapositivas.
   Solo se muestra en fullscreen de escritorio por CSS. */
slides.forEach((slide, index) => {
  const nextIndex = index === slides.length - 1 ? 0 : index + 1;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fullscreen-scroll-hint';
  btn.setAttribute('aria-label', index === slides.length - 1 ? 'Volver al inicio' : 'Ir a la siguiente diapositiva');
  btn.innerHTML = '<img src="./assets/logo_scrolldown.png" alt="" />';
  btn.addEventListener('click', () => slides[nextIndex].scrollIntoView({behavior:'smooth'}));
  slide.appendChild(btn);
});

/* =========================
   PUNTOS DE NAVEGACIÓN
   ========================= */
slides.forEach((slide, index) => {
  const dot = document.createElement('button');
  dot.setAttribute('aria-label', `Ir a la diapositiva ${index + 1}`);
  dot.addEventListener('click', () => slide.scrollIntoView({behavior:'smooth'}));
  dotsWrap?.appendChild(dot);
});
const dots = dotsWrap ? [...dotsWrap.children] : [];

/* =========================
   ANIMACIONES
   ========================= */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('in');
  });
}, {threshold:0.18});
reveals.forEach(el => revealObserver.observe(el));

/* =========================
   SLIDE ACTUAL + RESET DE CARRUSEL
   ========================= */
function resetMobileCarousel(slide){
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  const carousel = slide.querySelector('.mobile-snap');
  if (!carousel) return;
  // rAF doble: espera layout y garantiza que la primera tarjeta quede en x=0.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    carousel.scrollTo({left:0, behavior:'auto'});
  }));
}

const slideObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const index = slides.indexOf(entry.target);

    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    document.querySelectorAll('.nav a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`);
    });

    if (index !== currentSlide){
      const direction = index > currentSlide ? 'next' : 'prev';
      currentSlide = index;
      playSlideSound(direction);
      resetMobileCarousel(entry.target);
    }
  });
}, {threshold:0.58});
slides.forEach(slide => slideObserver.observe(slide));

/* =========================
   PROGRESO
   ========================= */
function updateProgress(){
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = `${(max > 0 ? window.scrollY / max : 0) * 100}%`;
}
window.addEventListener('scroll', updateProgress, {passive:true});
updateProgress();

/* =========================
   TECLADO
   ========================= */
document.addEventListener('keydown', e => {
  if (noticeModal?.classList.contains('is-open')) return;
  const keys = ['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '];
  if (!keys.includes(e.key)) return;
  e.preventDefault();
  let targetIndex = currentSlide;
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.code === 'Space') targetIndex = Math.min(slides.length - 1, currentSlide + 1);
  if (e.key === 'ArrowUp' || e.key === 'PageUp') targetIndex = Math.max(0, currentSlide - 1);
  if (e.key === 'Home') targetIndex = 0;
  if (e.key === 'End') targetIndex = slides.length - 1;
  slides[targetIndex]?.scrollIntoView({behavior:'smooth'});
});

/* =========================
   SWIPE VERTICAL: NO INTERFIERE CON CARRUSELES HORIZONTALES
   ========================= */
let touchStartX = null;
let touchStartY = null;
let touchStartedInsideCarousel = false;

window.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartedInsideCarousel = Boolean(e.target.closest('.mobile-snap'));
}, {passive:true});

window.addEventListener('touchend', e => {
  if (touchStartX === null || touchStartY === null) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  touchStartX = null;
  touchStartY = null;

  // Si el gesto comenzó en un carrusel y fue principalmente horizontal,
  // se deja que el carrusel gestione el swipe sin cambiar diapositiva.
  if (touchStartedInsideCarousel && Math.abs(dx) > Math.abs(dy)){
    touchStartedInsideCarousel = false;
    return;
  }
  touchStartedInsideCarousel = false;

  if (Math.abs(dy) < 70 || Math.abs(dy) < Math.abs(dx)) return;
  const target = dy < 0 ? Math.min(slides.length - 1, currentSlide + 1) : Math.max(0, currentSlide - 1);
  slides[target]?.scrollIntoView({behavior:'smooth'});
}, {passive:true});

/* =========================
   PARALLAX
   ========================= */
const parallaxEls = [...document.querySelectorAll('.parallax')];
window.addEventListener('pointermove', e => {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const x = e.clientX / window.innerWidth - 0.5;
  const y = e.clientY / window.innerHeight - 0.5;
  parallaxEls.forEach(el => {
    const depth = Number(el.dataset.depth || 0.04);
    el.style.transform = `scale(1.05) translate(${x * -36 * depth}px, ${y * -36 * depth}px)`;
  });
});

/* =========================
   AUDIO
   ========================= */
function initAudio(){
  if (audioReady) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  audioCtx = new AC();
  audioReady = true;
}
window.addEventListener('pointerdown', initAudio, {once:true});
window.addEventListener('keydown', initAudio, {once:true});

function tone(when, freq, duration, type='triangle', volume=0.04){
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  const finalVolume = volume * MASTER_VOLUME;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(finalVolume, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function noiseBurst(when, duration=0.06, volume=0.02){
  if (!audioCtx) return;
  const sampleCount = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0; i<data.length; i++) data[i] = (Math.random()*2-1) * Math.pow(1-i/data.length, 1.8);
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 900;
  const finalVolume = volume * MASTER_VOLUME;
  gain.gain.setValueAtTime(finalVolume, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(when);
}

function playSlideSound(direction='next'){
  if (!audioReady || !audioCtx) return;
  const now = audioCtx.currentTime;
  const msNow = performance.now();
  if (msNow - lastPlayedAt < 250) return;
  lastPlayedAt = msNow;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  noiseBurst(now, 0.07, 0.035);
  if (direction === 'next'){
    tone(now + 0.01, 360, 0.10, 'triangle', 0.085);
    tone(now + 0.08, 520, 0.14, 'sine', 0.070);
    tone(now + 0.13, 680, 0.10, 'sine', 0.035);
  } else {
    tone(now + 0.01, 480, 0.10, 'triangle', 0.080);
    tone(now + 0.07, 320, 0.14, 'sine', 0.065);
    tone(now + 0.12, 240, 0.10, 'sine', 0.030);
  }
}
