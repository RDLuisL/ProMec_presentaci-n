
const slides = [...document.querySelectorAll(".slide")];
const reveals = [...document.querySelectorAll(".reveal")];
const progressBar = document.getElementById("progressBar");
const dotsWrap = document.getElementById("dots");
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

let currentSlide = 0;
let audioReady = false;
let audioCtx = null;
let lastPlayedAt = 0;

/* ---------- Menu ---------- */
menuBtn?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
});
nav.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", () => nav.classList.remove("open"));
});

/* ---------- Dots ---------- */
slides.forEach((slide, index) => {
  const dot = document.createElement("button");
  dot.setAttribute("aria-label", `Ir a la diapositiva ${index + 1}`);
  dot.addEventListener("click", () => {
    slide.scrollIntoView({behavior:"smooth"});
  });
  dotsWrap.appendChild(dot);
});
const dots = [...dotsWrap.children];

/* ---------- Reveal observer ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add("in");
    }
  });
}, {threshold:0.18});
reveals.forEach(el => revealObserver.observe(el));

/* ---------- Slide observer ---------- */
const slideObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      const index = slides.indexOf(entry.target);

      dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
      document.querySelectorAll(".nav a").forEach(a => {
        a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`);
      });

      if(index !== currentSlide){
        const direction = index > currentSlide ? "next" : "prev";
        currentSlide = index;
        playSlideSound(direction);
      }
    }
  });
}, {threshold:0.58});

slides.forEach(slide => slideObserver.observe(slide));
reveals.forEach(el => el.classList.add("in"));

/* ---------- Progress bar ---------- */
function updateProgress(){
  const max = document.documentElement.scrollHeight - innerHeight;
  const ratio = max > 0 ? scrollY / max : 0;
  progressBar.style.width = `${ratio * 100}%`;
}
addEventListener("scroll", updateProgress, {passive:true});
updateProgress();

/* ---------- Keyboard navigation ---------- */
document.addEventListener("keydown", (e) => {
  if(!["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "].includes(e.key)) return;

  if(["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"].includes(e.key) || e.code === "Space"){
    e.preventDefault();
  }

  let targetIndex = currentSlide;
  if(e.key === "ArrowDown" || e.key === "PageDown" || e.code === "Space"){
    targetIndex = Math.min(slides.length - 1, currentSlide + 1);
  }
  if(e.key === "ArrowUp" || e.key === "PageUp"){
    targetIndex = Math.max(0, currentSlide - 1);
  }
  if(e.key === "Home") targetIndex = 0;
  if(e.key === "End") targetIndex = slides.length - 1;

  slides[targetIndex].scrollIntoView({behavior:"smooth"});
});

/* ---------- Touch vertical swipe ---------- */
let touchStartY = null;
addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
}, {passive:true});

addEventListener("touchend", (e) => {
  if(touchStartY === null) return;
  const deltaY = e.changedTouches[0].clientY - touchStartY;
  touchStartY = null;

  if(Math.abs(deltaY) < 70) return;
  const target = deltaY < 0
    ? Math.min(slides.length - 1, currentSlide + 1)
    : Math.max(0, currentSlide - 1);

  slides[target].scrollIntoView({behavior:"smooth"});
}, {passive:true});

/* ---------- Parallax ---------- */
const parallaxEls = [...document.querySelectorAll(".parallax")];
addEventListener("pointermove", (e) => {
  if(matchMedia("(pointer: coarse)").matches) return;
  const x = e.clientX / innerWidth - 0.5;
  const y = e.clientY / innerHeight - 0.5;

  parallaxEls.forEach(el => {
    const depth = Number(el.dataset.depth || 0.04);
    el.style.transform = `scale(1.05) translate(${x * -36 * depth}px, ${y * -36 * depth}px)`;
  });
});

/* ---------- Sound engine (Web Audio API, no external files needed) ---------- */
function initAudio(){
  if(audioReady) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return;
  audioCtx = new AC();
  audioReady = true;
}
window.addEventListener("pointerdown", initAudio, {once:true});
window.addEventListener("keydown", initAudio, {once:true});

function tone(when, freq, duration, type="triangle", volume=0.04){
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function noiseBurst(when, duration=0.06, volume=0.02){
  if(!audioCtx) return;
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i = 0; i < data.length; i++){
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.8);
  }

  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  filter.type = "highpass";
  filter.frequency.value = 900;

  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(when);
}

function playSlideSound(direction="next"){
  if(!audioReady || !audioCtx) return;

  const now = audioCtx.currentTime;
  const msNow = performance.now();
  if(msNow - lastPlayedAt < 250) return;
  lastPlayedAt = msNow;

  if(audioCtx.state === "suspended"){
    audioCtx.resume();
  }

  // Subtle industrial transition sound
  noiseBurst(now, 0.05, 0.014);
  if(direction === "next"){
    tone(now + 0.01, 360, 0.09, "triangle", 0.035);
    tone(now + 0.08, 520, 0.12, "sine", 0.03);
  }else{
    tone(now + 0.01, 480, 0.08, "triangle", 0.03);
    tone(now + 0.07, 320, 0.11, "sine", 0.028);
  }
}
