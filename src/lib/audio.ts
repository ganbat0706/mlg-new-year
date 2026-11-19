'use client';

/**
 * Баярын дуу чимээ — Web Audio API дээр бүтээв.
 *
 * ЯАГААД СИНТЕЗ ВЭ: «Last Christmas» (Wham!) зэрэг алдартай дуу нь
 * зохиогчийн эрхтэй тул репод суулгах боломжгүй. Энд сонсогдох бүх зүйл
 * ажиллах үедээ осциллятороос үүсдэг — эрхийн асуудалгүй, нэмэлт файл
 * татахгүй (0 байт), офлайн ажиллана.
 *
 * ГЭХДЭЭ: хэрэв арга хэмжээний баг өөрийн ЭРХТЭЙ дууны файлтай бол
 * `public/audio/theme.mp3` болгож хийхэд л хангалттай — энэ модуль
 * эхлэхдээ тухайн файл байгаа эсэхийг шалгаж, байвал синтезийн оронд
 * ҮҮНИЙГ давталттайгаар тоглуулна. Код өөрчлөх шаардлагагүй.
 */

const THEME_URL = '/audio/theme.mp3';
const STORAGE_KEY = 'mlg.sound';

export type Cue = 'tap' | 'correct' | 'wrong' | 'start' | 'clear' | 'reveal' | 'best';

type Ctx = AudioContext & { _mlgUnlocked?: boolean };

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let themeEl: HTMLAudioElement | null = null;
let themeChecked = false;
let themeAvailable = false;
let loopTimer: number | null = null;
let loopStep = 0;
let muted = true;
let restored = false;
let started = false;
const listeners = new Set<(m: boolean) => void>();

/** Хөтчийн autoplay бодлого: хэрэглэгчийн эхний үйлдлээс өмнө огт дуугарахгүй. */
function ensureCtx(): Ctx | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC() as Ctx;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.22;      // хөгжим дэвсгэр — дуун дохионоос чимээгүй
    musicGain.connect(master);
    return ctx;
  } catch { return null; }
}

function now(): number { return ctx ? ctx.currentTime : 0; }

/**
 * Нэг нот. `type` нь тембр: 'bell' (шилэн хонх — баярын гол өнгө),
 * 'soft' (дугуй, намуун), 'blip' (богино, механик — товшилтод).
 */
function note(
  freq: number,
  startAt: number,
  durSec: number,
  peak: number,
  type: 'bell' | 'soft' | 'blip',
  dest: AudioNode,
): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type === 'blip' ? 'square' : type === 'soft' ? 'sine' : 'triangle';
  osc.frequency.setValueAtTime(freq, startAt);

  // Дайрлага (envelope): хонх нь огцом цохиод удаан бүдгэрнэ, soft нь зөөлөн.
  const attack = type === 'bell' ? 0.004 : type === 'blip' ? 0.002 : 0.03;
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), startAt + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + durSec);

  osc.connect(g); g.connect(dest);
  osc.start(startAt);
  osc.stop(startAt + durSec + 0.02);
}

/** Чангийн хонх — өндөр давтамжтай шуугиан, маш богино. «Цасан» мэдрэмж өгнө. */
function shaker(startAt: number, peak: number, dest: AudioNode): void {
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 5200;
  const g = ctx.createGain(); g.gain.value = peak;
  src.connect(hp); hp.connect(g); g.connect(dest);
  src.start(startAt);
}

/**
 * Дэвсгэр аялгуу — ЭХ ЗОХИОЛ, ямар ч алдартай дууны хуулбар биш.
 * F-dur-ын дөрвөн хөвчийн эргэлт (F – Dm – B♭ – C) дээр хонхны арпеджио.
 * Нэг алхам = 500мс, 32 алхмын дараа эхнээсээ давтана (16 секунд).
 */
const STEP_MS = 500;
const CHORDS = [
  [349.23, 440.00, 523.25], // F
  [293.66, 349.23, 440.00], // Dm
  [233.08, 349.23, 466.16], // Bb
  [261.63, 329.63, 392.00], // C
];

function scheduleLoopStep(): void {
  if (!ctx || !musicGain || muted) return;
  const t = now() + 0.03;
  const chord = CHORDS[Math.floor(loopStep / 4) % CHORDS.length];
  const pos = loopStep % 4;

  // Арпеджио: хөвчийн нот ээлжлэн, 4 дэх алхамд октав дээш.
  const f = pos === 3 ? chord[0] * 2 : chord[pos % chord.length];
  note(f, t, 1.1, 0.16, 'bell', musicGain);
  if (pos === 0) note(chord[0] / 2, t, 1.6, 0.10, 'soft', musicGain);  // басс
  shaker(t, pos === 0 ? 0.05 : 0.025, musicGain);

  loopStep = (loopStep + 1) % 32;
}

/** Арга хэмжээний баг өөрийн эрхтэй файл тавьсан эсэхийг нэг л удаа шалгана. */
async function checkTheme(): Promise<void> {
  if (themeChecked) return;
  themeChecked = true;
  try {
    const res = await fetch(THEME_URL, { method: 'HEAD' });
    themeAvailable = res.ok && (res.headers.get('content-type') ?? '').startsWith('audio');
  } catch { themeAvailable = false; }
}

function startTheme(): void {
  if (!themeAvailable || themeEl) return;
  themeEl = new Audio(THEME_URL);
  themeEl.loop = true;
  themeEl.volume = muted ? 0 : 0.35;
  void themeEl.play().catch(() => { themeEl = null; themeAvailable = false; });
}

function notify(): void { listeners.forEach((fn) => fn(muted)); }

export const audio = {
  /** Хэрэглэгчийн эхний товшилтоос дуудна — autoplay бодлогод энэ л зөвшөөрөгдөнө. */
  async unlock(): Promise<void> {
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') { try { await c.resume(); } catch { /* ignore */ } }
    await checkTheme();
  },

  /** Тоглоомын үед дэвсгэр хөгжим эхлүүлнэ (давхар дуудахад аюулгүй). */
  startMusic(): void {
    if (started) return;
    started = true;
    if (!ensureCtx()) return;
    if (themeAvailable) { startTheme(); return; }
    loopStep = 0;
    scheduleLoopStep();
    loopTimer = window.setInterval(scheduleLoopStep, STEP_MS);
  },

  stopMusic(): void {
    started = false;
    if (loopTimer !== null) { window.clearInterval(loopTimer); loopTimer = null; }
    if (themeEl) { themeEl.pause(); themeEl.currentTime = 0; themeEl = null; }
  },

  /**
   * Хадгалсан сонголтыг ПЕРВЫЙ дуудлага дээр сэргээнэ. `useSyncExternalStore`
   * үүнийг snapshot болгон дууддаг тул React-ийн эффект дотор setState хийх
   * шаардлагагүй болно (cascading render-ээс сэргийлэв).
   */
  isMuted(): boolean {
    if (!restored && typeof window !== 'undefined') {
      restored = true;
      try { muted = localStorage.getItem(STORAGE_KEY) === 'off'; } catch { muted = false; }
      if (master && ctx) master.gain.value = muted ? 0 : 1;
    }
    return muted;
  },

  setMuted(next: boolean): void {
    muted = next;
    try { localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on'); } catch { /* private mode */ }
    if (master && ctx) {
      master.gain.cancelScheduledValues(now());
      master.gain.setTargetAtTime(next ? 0 : 1, now(), 0.05);
    }
    if (themeEl) themeEl.volume = next ? 0 : 0.35;
    notify();
  },

  subscribe(fn: (m: boolean) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Богино дуун дохио. Хөгжимтэй зөрчихгүйн тулд бүгд F-dur-д суурилав. */
  cue(name: Cue): void {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !master) return;
    const t = now() + 0.005;
    switch (name) {
      case 'tap':
        note(523.25, t, 0.06, 0.10, 'blip', master);
        break;
      case 'correct':                               // дээш өгсөх гурвалжин
        note(523.25, t, 0.12, 0.18, 'bell', master);
        note(659.25, t + 0.055, 0.14, 0.18, 'bell', master);
        note(783.99, t + 0.110, 0.26, 0.16, 'bell', master);
        break;
      case 'wrong':                                 // доош буух хоёр нот, бүдэг
        note(220.00, t, 0.14, 0.15, 'soft', master);
        note(174.61, t + 0.080, 0.22, 0.13, 'soft', master);
        break;
      case 'start':                                 // «бэлэн үү» — хоёр хонх
        note(392.00, t, 0.18, 0.14, 'bell', master);
        note(587.33, t + 0.120, 0.34, 0.14, 'bell', master);
        shaker(t + 0.12, 0.06, master);
        break;
      case 'clear':                                 // шат дуусав — F хөвч задарна
        [349.23, 440.00, 523.25, 698.46].forEach((f, i) => note(f, t + i * 0.06, 0.5, 0.15, 'bell', master!));
        break;
      case 'reveal':                                // оноо буух мөч
        [261.63, 349.23, 440.00, 523.25, 698.46].forEach((f, i) => note(f, t + i * 0.09, 0.9, 0.17, 'bell', master!));
        shaker(t, 0.08, master);
        shaker(t + 0.45, 0.06, master);
        break;
      case 'best':                                  // шинэ дээд амжилт
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => note(f, t + i * 0.07, 0.8, 0.18, 'bell', master!));
        [0, 0.12, 0.24, 0.36].forEach((d) => shaker(t + d, 0.07, master!));
        break;
    }
  },
};
