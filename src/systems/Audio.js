/**
 * Procedural WebAudio engine: synthesised sound effects and a generative, theme-aware
 * music score. No audio files are needed. Uses Phaser's AudioContext when available so
 * Phaser handles mobile unlock and blur-suspend for us.
 */
const STORE = 'shadow-escape-audio-v1';
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Scales as semitone offsets
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const HARM = [0, 2, 3, 5, 7, 8, 11];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

/**
 * Track definitions. chords: scale degrees (triads built on them), one per bar.
 * arp: 16-step pattern of chord-tone indexes (-1 = rest). bells: chance per 8th note.
 */
const TRACKS = {
  menu: { bpm: 68, root: 45, scale: MINOR, chords: [0, 5, 2, 6], pad: 'sawtooth', padCut: 900, arp: [0, -1, 2, -1, 1, -1, 2, -1, 3, -1, 2, -1, 1, -1, -1, -1], arpWave: 'triangle', arpOct: 2, bass: [0, 8], bells: 0.12, drums: null },
  forest: { bpm: 76, root: 50, scale: DORIAN, chords: [0, 3, 6, 4], pad: 'triangle', padCut: 1800, arp: [0, 2, 1, 2, 3, 2, 1, 2, -1, 2, 1, -1, 3, -1, 2, -1], arpWave: 'sine', arpOct: 2, bass: [0, 10], bells: 0.18, drums: null },
  ruins: { bpm: 64, root: 40, scale: PHRYGIAN, chords: [0, 1, 0, 6], pad: 'sawtooth', padCut: 600, arp: [0, -1, -1, 1, -1, -1, 2, -1, -1, 1, -1, -1, 0, -1, -1, -1], arpWave: 'triangle', arpOct: 2, bass: [0, 6, 8], bells: 0.06, drums: 'toms' },
  castle: { bpm: 84, root: 48, scale: HARM, chords: [0, 5, 3, 4], pad: 'square', padCut: 1100, arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, -1, 2, -1], arpWave: 'triangle', arpOct: 1, bass: [0, 4, 8, 12], bells: 0.05, drums: 'march' },
  crystal: { bpm: 72, root: 54, scale: LYDIAN, chords: [0, 1, 5, 4], pad: 'triangle', padCut: 2600, arp: [0, 2, 3, 2, 1, 3, 2, 3, 0, 2, 3, 2, 1, 3, 2, -1], arpWave: 'sine', arpOct: 3, bass: [0, 8], bells: 0.3, drums: null },
  void: { bpm: 58, root: 47, scale: MINOR, chords: [0, 5, 1, 4], pad: 'sawtooth', padCut: 700, arp: [0, -1, -1, -1, 3, -1, -1, -1, 2, -1, -1, -1, 1, -1, -1, -1], arpWave: 'sine', arpOct: 2, bass: [0], bells: 0.14, drums: null, detune: 18 },
  boss: { bpm: 132, root: 45, scale: HARM, chords: [0, 0, 5, 4], pad: 'sawtooth', padCut: 1500, arp: [0, 1, 2, 1, 0, 1, 3, 1, 0, 1, 2, 1, 3, 2, 1, 0], arpWave: 'sawtooth', arpOct: 1, bass: [0, 2, 4, 6, 8, 10, 12, 14], bells: 0, drums: 'boss' },
};
const BOSS_ROOTS = { forest: 50, ruins: 40, castle: 48, crystal: 54, void: 47 };

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.settings = { music: true, sfx: true, musicVol: 1, sfxVol: 1 };
    try {
      Object.assign(this.settings, JSON.parse(localStorage.getItem(STORE) || '{}'));
    } catch (e) {
      /* ignore */
    }
    this.last = {};
    this.track = null;
    this.ducked = false;
  }

  /** Attach to a Phaser game. Safe to call repeatedly. */
  init(game) {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = (game && game.sound && game.sound.context) || (Ctx ? new Ctx() : null);
    if (!this.ctx) return;
    this.low = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    this.buildGraph();
    const unlock = () => {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    };
    ['pointerdown', 'keydown', 'touchend'].forEach((e) => window.addEventListener(e, unlock, { passive: true }));
    this.timer = setInterval(() => this.schedule(), 50);
    // Save battery: silence the audio graph while the tab / app is in the background.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
      } else unlock();
    });
  }

  buildGraph() {
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.85;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    this.master.connect(comp).connect(c.destination);

    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = this.sfxLevel();
    this.sfxBus.connect(this.master);

    this.musicFilter = c.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 18000;
    this.musicBus = c.createGain();
    this.musicBus.gain.value = this.musicLevel();
    this.musicFilter.connect(this.musicBus).connect(this.master);

    // reverb with a generated impulse response
    this.reverb = c.createConvolver();
    const len = Math.floor(c.sampleRate * 2.6);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb.buffer = ir;
    this.reverbOut = c.createGain();
    this.reverbOut.gain.value = 0.5;
    this.reverb.connect(this.reverbOut).connect(this.master);
    this.sfxVerb = c.createGain();
    this.sfxVerb.gain.value = this.settings.sfx ? 0.35 : 0;
    this.sfxVerb.connect(this.reverb);
    this.musicVerb = c.createGain();
    this.musicVerb.gain.value = this.settings.music ? 0.5 : 0;
    this.musicVerb.connect(this.reverb);

    // music echo
    this.delay = c.createDelay(1);
    this.delay.delayTime.value = 0.36;
    const fb = c.createGain();
    fb.gain.value = 0.32;
    const dl = c.createBiquadFilter();
    dl.type = 'lowpass';
    dl.frequency.value = 2400;
    this.delay.connect(dl).connect(fb).connect(this.delay);
    this.delayIn = c.createGain();
    this.delayIn.gain.value = 0.28;
    this.delayIn.connect(this.delay);
    dl.connect(this.musicFilter);

    const nlen = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, nlen, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(this.settings));
    } catch (e) {
      /* ignore */
    }
  }

  setMusic(on) {
    this.settings.music = on;
    this.save();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.musicLevel(), t, 0.1);
    this.musicVerb.gain.setTargetAtTime(on ? 0.5 : 0, t, 0.1);
  }

  setSfx(on) {
    this.settings.sfx = on;
    this.save();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.sfxLevel(), t, 0.05);
    this.sfxVerb.gain.setTargetAtTime(on ? 0.35 : 0, t, 0.05);
  }

  musicLevel() {
    if (!this.settings.music) return 0;
    return (this.ducked ? 0.2 : 0.34) * (this.settings.musicVol ?? 1);
  }

  sfxLevel() {
    return this.settings.sfx ? 0.7 * (this.settings.sfxVol ?? 1) : 0;
  }

  /** Volume 0..1 for 'music' or 'sfx'. */
  setVolume(bus, v) {
    v = Math.max(0, Math.min(1, v));
    this.settings[bus === 'music' ? 'musicVol' : 'sfxVol'] = Math.round(v * 10) / 10;
    this.save();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (bus === 'music') this.musicBus.gain.setTargetAtTime(this.musicLevel(), t, 0.05);
    else this.sfxBus.gain.setTargetAtTime(this.sfxLevel(), t, 0.05);
  }

  toggleMusic() {
    this.setMusic(!this.settings.music);
    return this.settings.music;
  }

  toggleSfx() {
    this.setSfx(!this.settings.sfx);
    return this.settings.sfx;
  }

  /** Muffles the music (pause menu). */
  duck(on) {
    this.ducked = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicFilter.frequency.setTargetAtTime(on ? 650 : 18000, t, 0.15);
    if (this.settings.music) this.musicBus.gain.setTargetAtTime(this.musicLevel(), t, 0.15);
  }

  // ------------------------------------------------------------ primitives
  /** Oscillator voice with an attack/decay envelope and optional pitch glide. */
  tone(o) {
    const c = this.ctx;
    const t = o.t ?? c.currentTime;
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.glide ?? o.dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = c.createGain();
    const atk = o.atk ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol ?? 0.2, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + o.dur);
    let out = g;
    if (o.cut) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(o.cut, t);
      if (o.cutTo) f.frequency.exponentialRampToValueAtTime(o.cutTo, t + atk + o.dur);
      f.Q.value = o.q ?? 0.8;
      g.connect(f);
      out = f;
    }
    osc.connect(g);
    out.connect(o.dest || this.sfxBus);
    if (o.verb) out.connect(o.verbDest || this.sfxVerb);
    if (o.echo) out.connect(this.delayIn);
    osc.start(t);
    osc.stop(t + atk + o.dur + 0.05);
  }

  /** Filtered noise burst. */
  noise(o) {
    const c = this.ctx;
    const t = o.t ?? c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    f.Q.value = o.q ?? 1;
    const g = c.createGain();
    const atk = o.atk ?? 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol ?? 0.2, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + o.dur);
    src.connect(f).connect(g).connect(o.dest || this.sfxBus);
    if (o.verb) g.connect(o.verbDest || this.sfxVerb);
    src.start(t, Math.random() * 0.5);
    src.stop(t + atk + o.dur + 0.05);
  }

  // ------------------------------------------------------------------ sfx
  sfx(name, v = 1) {
    if (!this.ready || !this.settings.sfx) return;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < 0.04) return;
    this.last[name] = now;
    const fn = SFX[name];
    if (fn) fn(this, now, v);
  }

  // ---------------------------------------------------------------- music
  /** Switch to a track by name ('menu', a theme key, or 'boss:<theme>'). */
  music(name) {
    if (!this.ctx) return;
    if (this.track && this.track.name === name) return;
    const [base, theme] = name.split(':');
    const def = TRACKS[base] || TRACKS.forest;
    const c = this.ctx;
    const t = c.currentTime;
    if (this.track) {
      const old = this.track.gain;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(old.gain.value, t);
      old.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => old.disconnect(), 1600);
    }
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 1.5);
    gain.connect(this.musicFilter);
    const verb = c.createGain();
    verb.gain.value = 0.6;
    gain.connect(verb).connect(this.musicVerb);
    const root = base === 'boss' && theme ? BOSS_ROOTS[theme] || def.root : def.root;
    this.track = { name, def, root, gain, step: 0, next: t + 0.1 };
  }

  stopMusic() {
    if (!this.track || !this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.track.gain;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.8);
    setTimeout(() => g.disconnect(), 1000);
    this.track = null;
  }

  schedule() {
    const tr = this.track;
    if (!tr || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (tr.next < now) tr.next = now + 0.05; // resync after a suspend
    const stepDur = 60 / tr.def.bpm / 4;
    while (tr.next < now + 0.2) {
      if (this.settings.music && (this.settings.musicVol ?? 1) > 0) this.playStep(tr, tr.step, tr.next, stepDur);
      tr.step++;
      tr.next += stepDur;
    }
  }

  note(tr, degree, oct) {
    const sc = tr.def.scale;
    const d = ((degree % 7) + 7) % 7;
    const o = Math.floor(degree / 7);
    return tr.root + sc[d] + (o + oct) * 12;
  }

  playStep(tr, step, t, sd) {
    const d = tr.def;
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const deg = d.chords[bar % d.chords.length];
    const chord = [deg, deg + 2, deg + 4, deg + 7];
    const dest = tr.gain;
    const boss = d.drums === 'boss';

    // pad
    if (s === 0) {
      const dur = sd * 16;
      const voices = this.low ? 1 : 2;
      for (let i = 0; i < 3; i++) {
        const f = mtof(this.note(tr, chord[i], 0));
        for (let v = 0; v < voices; v++) {
          this.tone({
            t, f, type: d.pad, dur, atk: boss ? 0.05 : dur * 0.35, vol: boss ? 0.05 : 0.065,
            detune: (v ? 1 : -1) * (d.detune || 7), cut: d.padCut, dest,
          });
        }
      }
    }
    // bass
    if (d.bass.includes(s)) {
      const f = mtof(this.note(tr, deg, -1));
      this.tone({ t, f, type: boss ? 'sawtooth' : 'triangle', dur: boss ? sd * 1.6 : sd * 7, atk: 0.01, vol: boss ? 0.13 : 0.16, cut: boss ? 700 : 500, dest });
    }
    // arp
    const a = d.arp[s];
    if (a >= 0) {
      const f = mtof(this.note(tr, chord[a], d.arpOct));
      this.tone({ t, f, type: d.arpWave, dur: boss ? sd * 1.2 : sd * 3, vol: boss ? 0.045 : 0.06, cut: boss ? 2600 : 4000, dest, echo: !boss });
    }
    // bells
    if (d.bells && s % 2 === 0 && Math.random() < d.bells) {
      const f = mtof(this.note(tr, chord[Math.floor(Math.random() * 3)] + 7 * Math.floor(Math.random() * 2), 3));
      this.tone({ t, f, type: 'sine', dur: 1.6, vol: 0.035, dest, echo: true });
      this.tone({ t, f: f * 2.76, type: 'sine', dur: 0.5, vol: 0.01, dest });
    }
    // drums
    if (d.drums === 'boss') {
      if (s % 4 === 0) this.kick(t, dest, 0.5);
      if (s === 4 || s === 12) this.snare(t, dest, 0.18);
      if (s % 2 === 1) this.noise({ t, f: 8000, filter: 'highpass', dur: 0.03, vol: 0.04, dest });
    } else if (d.drums === 'march') {
      if (s === 0 || s === 8) this.kick(t, dest, 0.35);
      if (s === 12 || s === 14) this.snare(t, dest, 0.07);
    } else if (d.drums === 'toms') {
      if (s === 0 || s === 10) this.tone({ t, f: 110, to: 60, glide: 0.25, dur: 0.35, vol: 0.18, dest });
      if (s === 6) this.tone({ t, f: 160, to: 90, glide: 0.2, dur: 0.25, vol: 0.1, dest });
    }
  }

  kick(t, dest, vol) {
    this.tone({ t, f: 140, to: 42, glide: 0.12, dur: 0.28, vol, dest });
  }

  snare(t, dest, vol) {
    this.noise({ t, f: 1800, filter: 'bandpass', q: 0.7, dur: 0.14, vol, dest });
    this.tone({ t, f: 220, to: 160, dur: 0.08, vol: vol * 0.5, dest });
  }
}

// --------------------------------------------------------------- sound design
const SFX = {
  jump(A, t) {
    A.tone({ t, f: 280, to: 620, dur: 0.12, type: 'triangle', vol: 0.16 });
    A.noise({ t, f: 900, to: 2400, filter: 'bandpass', dur: 0.08, vol: 0.05 });
  },
  doubleJump(A, t) {
    A.tone({ t, f: 520, to: 1100, dur: 0.16, type: 'triangle', vol: 0.12, verb: true });
    A.tone({ t: t + 0.03, f: 780, to: 1640, dur: 0.2, type: 'sine', vol: 0.08, verb: true });
    A.noise({ t, f: 3000, filter: 'highpass', dur: 0.12, vol: 0.04 });
  },
  wallJump(A, t) {
    A.noise({ t, f: 1400, filter: 'bandpass', q: 2, dur: 0.06, vol: 0.14 });
    A.tone({ t, f: 360, to: 760, dur: 0.12, type: 'triangle', vol: 0.12 });
  },
  dash(A, t) {
    A.noise({ t, f: 500, to: 3600, filter: 'bandpass', q: 1.5, dur: 0.22, vol: 0.22, verb: true });
    A.tone({ t, f: 190, to: 60, dur: 0.2, type: 'sine', vol: 0.16 });
  },
  land(A, t, k = 0.5) {
    A.noise({ t, f: 380, filter: 'lowpass', dur: 0.08 + 0.08 * k, vol: 0.08 + 0.2 * k });
    A.tone({ t, f: 120, to: 48, dur: 0.12, vol: 0.1 + 0.18 * k });
  },
  hurt(A, t) {
    A.tone({ t, f: 420, to: 140, dur: 0.2, type: 'sawtooth', vol: 0.12, cut: 1800 });
    A.noise({ t, f: 1600, filter: 'bandpass', dur: 0.12, vol: 0.12 });
  },
  death(A, t) {
    A.tone({ t, f: 320, to: 38, dur: 0.7, type: 'sawtooth', vol: 0.16, cut: 1600, cutTo: 120, verb: true });
    A.noise({ t, f: 2400, to: 200, dur: 0.6, vol: 0.2, verb: true });
    [880, 660, 494, 330].forEach((f, i) => A.tone({ t: t + 0.05 + i * 0.07, f, dur: 0.3, type: 'sine', vol: 0.05, verb: true }));
  },
  respawn(A, t) {
    [392, 523, 659, 784, 1047].forEach((f, i) => A.tone({ t: t + i * 0.05, f, dur: 0.35, type: 'sine', vol: 0.07, verb: true }));
    A.noise({ t, f: 300, to: 4000, filter: 'bandpass', dur: 0.3, vol: 0.05 });
  },
  shard(A, t) {
    [1319, 1976, 2637].forEach((f, i) => {
      A.tone({ t: t + i * 0.06, f, dur: 0.5, type: 'sine', vol: 0.09, verb: true });
      A.tone({ t: t + i * 0.06, f: f * 2.01, dur: 0.18, type: 'sine', vol: 0.025 });
    });
  },
  checkpoint(A, t) {
    [523, 659, 784].forEach((f) => A.tone({ t, f, dur: 0.9, atk: 0.06, type: 'triangle', vol: 0.06, verb: true }));
    [1568, 2093].forEach((f, i) => A.tone({ t: t + 0.12 + i * 0.1, f, dur: 0.5, type: 'sine', vol: 0.05, verb: true }));
  },
  secret(A, t) {
    [523, 587, 659, 784, 880, 1047].forEach((f, i) => A.tone({ t: t + i * 0.07, f, dur: 0.3, type: 'square', vol: 0.035, cut: 3000, verb: true }));
  },
  enemyPop(A, t) {
    A.tone({ t, f: 640, to: 180, dur: 0.14, type: 'square', vol: 0.08, cut: 2400 });
    A.noise({ t, f: 2000, filter: 'bandpass', dur: 0.1, vol: 0.12 });
    A.tone({ t: t + 0.04, f: 1200, dur: 0.18, type: 'sine', vol: 0.05, verb: true });
  },
  bossHit(A, t) {
    A.noise({ t, f: 1200, to: 120, dur: 0.4, vol: 0.3, verb: true });
    A.tone({ t, f: 200, to: 50, dur: 0.35, type: 'sawtooth', vol: 0.16, cut: 900 });
  },
  bossRoar(A, t) {
    for (const d of [-14, 0, 14]) A.tone({ t, f: 95, to: 55, dur: 1.2, atk: 0.15, type: 'sawtooth', vol: 0.08, detune: d, cut: 300, cutTo: 1400, verb: true });
    A.noise({ t, f: 300, to: 900, dur: 1.1, atk: 0.2, vol: 0.12, verb: true });
  },
  bossDefeat(A, t) {
    A.noise({ t, f: 3000, to: 80, dur: 1.4, vol: 0.32, verb: true });
    A.tone({ t, f: 120, to: 30, dur: 1, vol: 0.25 });
    [262, 330, 392, 523, 659, 784].forEach((f, i) => A.tone({ t: t + 0.5 + i * 0.09, f, dur: 1.4, type: 'triangle', vol: 0.06, verb: true }));
  },
  victory(A, t) {
    [523, 659, 784, 1047].forEach((f, i) => A.tone({ t: t + i * 0.11, f, dur: 0.4, type: 'square', vol: 0.045, cut: 2800, verb: true }));
    [523, 659, 784, 1047].forEach((f) => A.tone({ t: t + 0.48, f, dur: 1.3, atk: 0.02, type: 'triangle', vol: 0.06, verb: true }));
    A.noise({ t: t + 0.45, f: 6000, filter: 'highpass', dur: 0.8, vol: 0.05, verb: true });
  },
  crumble(A, t) {
    A.noise({ t, f: 700, to: 200, dur: 0.35, vol: 0.18 });
    A.noise({ t: t + 0.08, f: 1500, filter: 'bandpass', q: 3, dur: 0.06, vol: 0.08 });
  },
  impact(A, t) {
    A.noise({ t, f: 900, to: 150, dur: 0.2, vol: 0.18 });
    A.tone({ t, f: 110, to: 45, dur: 0.18, vol: 0.18 });
  },
  thunder(A, t) {
    A.noise({ t, f: 900, to: 120, dur: 0.35, vol: 0.18 });
    A.noise({ t: t + 0.08, f: 260, to: 70, dur: 2.6, atk: 0.12, vol: 0.32, verb: true });
  },
  uiMove(A, t) {
    A.tone({ t, f: 880, dur: 0.04, type: 'triangle', vol: 0.06 });
  },
  uiConfirm(A, t) {
    A.tone({ t, f: 660, dur: 0.1, type: 'triangle', vol: 0.08 });
    A.tone({ t: t + 0.07, f: 990, dur: 0.2, type: 'triangle', vol: 0.08, verb: true });
  },
  uiBack(A, t) {
    A.tone({ t, f: 660, to: 440, dur: 0.12, type: 'triangle', vol: 0.07 });
  },
  star(A, t, n = 1) {
    const f = [784, 988, 1319][Math.max(0, Math.min(2, n - 1))];
    A.tone({ t, f, dur: 0.5, type: 'triangle', vol: 0.09, verb: true });
    A.tone({ t, f: f * 2, dur: 0.3, type: 'sine', vol: 0.05, verb: true });
    A.noise({ t, f: 7000, filter: 'highpass', dur: 0.25, vol: 0.05 });
  },
  coin(A, t) {
    A.tone({ t, f: 1568, dur: 0.06, type: 'square', vol: 0.03, cut: 4000 });
    A.tone({ t: t + 0.05, f: 2093, dur: 0.12, type: 'sine', vol: 0.05 });
  },
  purchase(A, t) {
    [659, 784, 988, 1319].forEach((f, i) => A.tone({ t: t + i * 0.06, f, dur: 0.35, type: 'triangle', vol: 0.07, verb: true }));
    A.noise({ t, f: 5000, filter: 'highpass', dur: 0.4, vol: 0.04, verb: true });
  },
  achievement(A, t) {
    [523, 784, 1047].forEach((f) => A.tone({ t, f, dur: 1.0, atk: 0.03, type: 'triangle', vol: 0.06, verb: true }));
    [1568, 2093, 2637].forEach((f, i) => A.tone({ t: t + 0.15 + i * 0.08, f, dur: 0.5, type: 'sine', vol: 0.045, verb: true }));
  },
  uiDeny(A, t) {
    A.tone({ t, f: 200, to: 140, dur: 0.15, type: 'square', vol: 0.06, cut: 1200 });
  },
};

const Audio = new AudioEngine();
export default Audio;
