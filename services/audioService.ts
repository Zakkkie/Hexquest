/**
 * Advanced Procedural Audio Synthesizer for HexQuest.
 * Engine: "Nebula V2"
 * Features: FM Synthesis, Generative Space Ambience, Chord Progressions, Dynamic Mixing
 */

export type SoundType = 
  | 'UI_HOVER' 
  | 'UI_CLICK' 
  | 'MOVE' 
  | 'ERROR' 
  | 'SUCCESS' 
  | 'LEVEL_UP' 
  | 'COIN' 
  | 'GROWTH_START' 
  | 'COLLAPSE' 
  | 'CRACK' 
  | 'WARNING'
  | 'FIREWORK'
  | 'TELEPORT'
  | 'JACKPOT'
  | 'TURRET_FIRE'
  | 'TILE_PLACE';

export interface AiMusicState {
  status: 'idle' | 'generating' | 'playing' | 'paused' | 'error';
  lyrics?: string;
  error?: string;
}

class AudioService {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private portalOsc: OscillatorNode | null = null;
  private portalGain: GainNode | null = null;

  public isSfxMuted: boolean = false;
  public isMusicMuted: boolean = false;

  private isMusicPlaying: boolean = false;
  private musicInterval: any = null;
  private sparkleTimeout: any = null;
  private activeMusicOscillators: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private activeChordIndex: number = 0;
  private intensityRatio: number = 0.5;

  // Space Chords (Pentatonic / Minor 9th / Lydian space harmonies)
  private spaceChords = [
    // C Minor 9: C3, Eb3, G3, Bb3, D4
    [130.81, 155.56, 196.00, 233.08, 293.66],
    // Ab Major 7: Ab2, C3, Eb3, G3, C4
    [103.83, 130.81, 155.56, 196.00, 261.63],
    // Eb Major 9: Eb3, G3, Bb3, D4, F4
    [155.56, 196.00, 233.08, 293.66, 349.23],
    // F Minor 7: F2, Ab2, C3, Eb3, G3
    [87.31, 103.83, 130.81, 155.56, 196.00],
  ];

  private subBasses = [65.41, 51.91, 77.78, 43.65]; // C2, Ab1, Eb2, F1
  private sparkleNotes = [392.00, 466.16, 523.25, 587.33, 622.25, 783.99, 932.33, 1046.50];

  private aiAudio: HTMLAudioElement | null = null;
  public aiMusicState: AiMusicState = { status: 'idle' };
  private aiMusicListeners: Set<(state: AiMusicState) => void> = new Set();
  private hasAddedGestureListener: boolean = false;

  public subscribeAiMusic(fn: (state: AiMusicState) => void) {
    this.aiMusicListeners.add(fn);
    fn(this.aiMusicState);
    return () => { this.aiMusicListeners.delete(fn); };
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.setValueAtTime(this.isSfxMuted ? 0 : 0.8, this.ctx.currentTime);
      this.sfxBus.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.setValueAtTime(this.isMusicMuted ? 0 : 0.35, this.ctx.currentTime);
      this.musicBus.connect(this.ctx.destination);

      // Synthetic noise buffer for impacts/moves/fireworks
      const bufferSize = this.ctx.sampleRate * 1.5;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.whiteNoiseBuffer = noiseBuffer;

      this.attachGestureListeners();
    } catch (e) {
      console.warn("AudioContext init failed", e);
    }
  }

  private attachGestureListeners() {
    if (this.hasAddedGestureListener || typeof window === 'undefined') return;
    this.hasAddedGestureListener = true;

    const unlockAudio = () => {
      this.resumeContext();
      if (!this.isMusicMuted && !this.isMusicPlaying) {
        this.startMusic();
      }
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
  }

  public async resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn("AudioContext resume failed", e);
      }
    }
  }

  public async preload() {
    this.init();
  }

  public setSfxMuted(muted: boolean) {
    this.isSfxMuted = muted;
    this.resumeContext();
    if (this.sfxBus && this.ctx) {
      this.sfxBus.gain.setValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime);
    }
  }

  public setMusicMuted(muted: boolean) {
    this.isMusicMuted = muted;
    this.resumeContext();
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setValueAtTime(muted ? 0 : 0.35, this.ctx.currentTime);
    }
    if (!muted && !this.isMusicPlaying) {
      this.startMusic();
    }
  }

  public play(type: SoundType, level?: number) {
    if (this.isSfxMuted) return;
    this.resumeContext();
    if (!this.ctx || !this.sfxBus) return;

    const t = this.ctx.currentTime;

    const playOsc = (freq: number, type: OscillatorType, dur: number, vol: number, startTime: number = t) => {
      if (!this.ctx || !this.sfxBus) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      g.gain.setValueAtTime(vol, startTime);
      g.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
      osc.connect(g);
      g.connect(this.sfxBus);
      osc.start(startTime);
      osc.stop(startTime + dur);
      osc.onended = () => { osc.disconnect(); g.disconnect(); };
    };

    switch (type) {
      case 'UI_CLICK': {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1300, t);
        osc1.frequency.exponentialRampToValueAtTime(650, t + 0.04);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(2600, t);
        osc2.frequency.exponentialRampToValueAtTime(1300, t + 0.02);
        g.gain.setValueAtTime(0.07, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc1.connect(g); osc2.connect(g); g.connect(this.sfxBus);
        osc1.start(t); osc2.start(t);
        osc1.stop(t + 0.06); osc2.stop(t + 0.06);
        break;
      }
      case 'UI_HOVER': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(640, t + 0.04);
        g.gain.setValueAtTime(0.012, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(g); g.connect(this.sfxBus);
        osc.start(t); osc.stop(t + 0.05);
        break;
      }
      case 'ERROR': {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(130, t);
        osc1.frequency.linearRampToValueAtTime(70, t + 0.25);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(132, t);
        osc2.frequency.linearRampToValueAtTime(72, t + 0.25);
        filter.type = 'peaking';
        filter.frequency.value = 320;
        filter.Q.value = 4.5;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc1.connect(filter); osc2.connect(filter); filter.connect(g); g.connect(this.sfxBus);
        osc1.start(t); osc2.start(t);
        osc1.stop(t + 0.26); osc2.stop(t + 0.26);
        break;
      }
      case 'SUCCESS': {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const noteTime = t + (idx * 0.05);
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.05, noteTime + 0.22);
          g.gain.setValueAtTime(0, noteTime);
          g.gain.linearRampToValueAtTime(0.08, noteTime + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
          osc.connect(g); g.connect(this.sfxBus!);
          osc.start(noteTime); osc.stop(noteTime + 0.26);
        });
        break;
      }
      case 'COIN': {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.50, t);
        osc1.frequency.exponentialRampToValueAtTime(1396.91, t + 0.06);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2093.00, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc1.connect(g); osc2.connect(g); g.connect(this.sfxBus);
        osc1.start(t); osc2.start(t);
        osc1.stop(t + 0.36); osc2.stop(t + 0.36);
        break;
      }
      case 'MOVE': {
        if (this.whiteNoiseBuffer) {
          const src = this.ctx.createBufferSource();
          src.buffer = this.whiteNoiseBuffer;
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(100, t + 0.1);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.1, t); g.gain.linearRampToValueAtTime(0, t + 0.1);
          src.connect(f); f.connect(g); g.connect(this.sfxBus);
          src.start(t); src.stop(t + 0.1);
          src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
        } else {
          playOsc(220, 'sine', 0.08, 0.05);
        }
        break;
      }
      case 'LEVEL_UP': {
        playOsc(440, 'triangle', 0.6, 0.1, t);
        playOsc(880, 'triangle', 0.6, 0.1, t + 0.2);
        break;
      }
      case 'GROWTH_START': {
        playOsc(330, 'sine', 0.15, 0.08, t);
        playOsc(440, 'sine', 0.15, 0.08, t + 0.08);
        break;
      }
      case 'COLLAPSE': playOsc(60, 'sawtooth', 0.6, 0.3); break;
      case 'CRACK': playOsc(300, 'square', 0.05, 0.2); break;
      case 'WARNING': playOsc(150, 'sawtooth', 0.3, 0.2); break;
      case 'FIREWORK': {
        if (this.whiteNoiseBuffer) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = this.whiteNoiseBuffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, t);
          filter.frequency.exponentialRampToValueAtTime(50, t + 0.4);
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
          noise.connect(filter); filter.connect(gain); gain.connect(this.sfxBus);
          noise.start(t); noise.stop(t + 0.5);
          noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
        }
        break;
      }
      case 'TELEPORT': {
        playOsc(150, 'triangle', 0.4, 0.15, t);
        playOsc(600, 'sine', 0.4, 0.12, t + 0.1);
        break;
      }
      case 'JACKPOT': {
        const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        chord.forEach((freq, idx) => {
          const noteTime = t + (idx * 0.05);
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.02, noteTime + 0.45);
          g.gain.setValueAtTime(0, noteTime);
          g.gain.linearRampToValueAtTime(0.12, noteTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.5);
          osc.connect(g); g.connect(this.sfxBus!);
          osc.start(noteTime); osc.stop(noteTime + 0.52);
        });
        break;
      }
      case 'TURRET_FIRE': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(960, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.16);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, t);
        filter.frequency.exponentialRampToValueAtTime(450, t + 0.16);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(filter); filter.connect(gain); gain.connect(this.sfxBus);

        osc.start(t); osc.stop(t + 0.18);
        osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
        break;
      }
      case 'TILE_PLACE': {
        const lvl = level ?? 0;
        // Quiet, non-fatiguing volume (0.04)
        const vol = 0.04;

        // Base frequency scales higher with tile level
        const baseFreq = lvl < 0 ? Math.max(120, 200 + lvl * 20) : 240 + lvl * 80;

        // 1. Primary body tone (soft triangle with pitch drop for tactile seating)
        const osc1 = this.ctx.createOscillator();
        const g1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(baseFreq * 1.35, t);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.035);

        g1.gain.setValueAtTime(vol, t);
        g1.gain.exponentialRampToValueAtTime(0.0005, t + 0.08);

        osc1.connect(g1); g1.connect(this.sfxBus);
        osc1.start(t); osc1.stop(t + 0.085);

        // 2. Secondary harmonic tone (sine wave for pitch elevation indicator)
        const osc2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        osc2.type = 'sine';
        const mult = lvl >= 3 ? 2.0 : (lvl >= 1 ? 1.5 : 1.25);
        const harmFreq = baseFreq * mult;

        osc2.frequency.setValueAtTime(harmFreq, t + 0.005);
        osc2.frequency.exponentialRampToValueAtTime(harmFreq * 1.015, t + 0.09);

        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(vol * 0.7, t + 0.01);
        g2.gain.exponentialRampToValueAtTime(0.0005, t + 0.095);

        osc2.connect(g2); g2.connect(this.sfxBus);
        osc2.start(t); osc2.stop(t + 0.1);

        // 3. Subtle tactile noise snap
        if (this.whiteNoiseBuffer) {
          const src = this.ctx.createBufferSource();
          src.buffer = this.whiteNoiseBuffer;
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.setValueAtTime(450 + Math.max(0, lvl) * 100, t);
          f.frequency.linearRampToValueAtTime(100, t + 0.03);

          const g = this.ctx.createGain();
          g.gain.setValueAtTime(vol * 0.5, t);
          g.gain.linearRampToValueAtTime(0.0005, t + 0.035);

          src.connect(f); f.connect(g); g.connect(this.sfxBus);
          src.start(t); src.stop(t + 0.04);
          src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
        }
        break;
      }
    }
  }

  public playTilePlace(level: number = 0) {
    this.play('TILE_PLACE', level);
  }

  public startPortalHum() {
    this.resumeContext();
    if (!this.ctx || !this.sfxBus || this.portalOsc) return;
    this.portalOsc = this.ctx.createOscillator();
    this.portalGain = this.ctx.createGain();
    this.portalOsc.type = 'sine';
    this.portalOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
    this.portalGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    this.portalOsc.connect(this.portalGain);
    this.portalGain.connect(this.sfxBus);
    this.portalOsc.start();
  }

  public stopPortalHum() {
    if (this.portalOsc) {
      try { this.portalOsc.stop(); this.portalOsc.disconnect(); } catch {}
      this.portalOsc = null;
    }
    if (this.portalGain) {
      try { this.portalGain.disconnect(); } catch {}
      this.portalGain = null;
    }
  }

  // --- PROCEDURAL AMBIENT MUSIC ENGINE ("Nebula V2") ---

  public startMusic() {
    if (this.isMusicPlaying) return;
    this.resumeContext();
    this.isMusicPlaying = true;

    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setValueAtTime(this.isMusicMuted ? 0 : 0.35, this.ctx.currentTime);
    }

    // Play immediate first chord measure
    this.playAmbientMeasure();

    // Loop measures every 6.5 seconds
    if (this.musicInterval) clearInterval(this.musicInterval);
    this.musicInterval = setInterval(() => {
      if (this.isMusicPlaying && !this.isMusicMuted) {
        this.playAmbientMeasure();
      }
    }, 6500);
  }

  public stopMusic(instant: boolean = false) {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.sparkleTimeout) {
      clearTimeout(this.sparkleTimeout);
      this.sparkleTimeout = null;
    }
    this.clearActiveOscillators(instant ? 0.05 : 1.5);
  }

  public updateMusic(coins: number, targetCoins: number) {
    const ratio = Math.min(1, Math.max(0, coins / (targetCoins || 500)));
    this.intensityRatio = ratio;
  }

  private playAmbientMeasure() {
    if (!this.ctx || !this.musicBus || this.isMusicMuted) return;

    const t = this.ctx.currentTime;
    const chord = this.spaceChords[this.activeChordIndex];
    const subBass = this.subBasses[this.activeChordIndex];
    this.activeChordIndex = (this.activeChordIndex + 1) % this.spaceChords.length;

    // Filter node for smooth cosmic warm pads
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoff = 450 + this.intensityRatio * 550;
    filter.frequency.setValueAtTime(cutoff, t);

    const padGain = this.ctx.createGain();
    padGain.gain.setValueAtTime(0, t);
    // Slow Attack (2.2s), Sustain, Slow Release (2.5s)
    padGain.gain.linearRampToValueAtTime(0.08, t + 2.2);
    padGain.gain.setValueAtTime(0.08, t + 4.5);
    padGain.gain.linearRampToValueAtTime(0.001, t + 6.8);

    filter.connect(padGain);
    padGain.connect(this.musicBus);

    // Spawn voices for the chord
    chord.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = Math.random() > 0.4 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      // Slight detune for chorus warmth
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, t);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + 7.0);

      this.activeMusicOscillators.push({ osc, gain: padGain });
    });

    // Sub-bass layer
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(subBass, t);
    bassGain.gain.setValueAtTime(0, t);
    bassGain.gain.linearRampToValueAtTime(0.12, t + 1.8);
    bassGain.gain.linearRampToValueAtTime(0.001, t + 6.5);

    bassOsc.connect(bassGain);
    bassGain.connect(this.musicBus);
    bassOsc.start(t);
    bassOsc.stop(t + 6.8);

    // Schedule 2 random crystalline sparkle notes during this measure
    this.scheduleSparkleNote(t + 1.2 + Math.random() * 1.5);
    this.scheduleSparkleNote(t + 3.8 + Math.random() * 1.8);
  }

  private scheduleSparkleNote(startTime: number) {
    if (!this.ctx || !this.musicBus || this.isMusicMuted) return;

    const freq = this.sparkleNotes[Math.floor(Math.random() * this.sparkleNotes.length)];
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(0.035, startTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0005, startTime + 1.2);

    osc.connect(g);
    g.connect(this.musicBus);

    osc.start(startTime);
    osc.stop(startTime + 1.25);
  }

  private clearActiveOscillators(fadeTime: number = 0.5) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeMusicOscillators.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.linearRampToValueAtTime(0.0001, now + fadeTime);
        osc.stop(now + fadeTime + 0.05);
      } catch {}
    });
    this.activeMusicOscillators = [];
  }
}

export const audioService = new AudioService();
