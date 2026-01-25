
/**
 * Procedural Audio Synthesizer for HexQuest
 * Style: 8-bit French House / Sci-Fi Arcade
 */

type SoundType = 
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
  | 'WARNING';

// Pentatonic C Minor (C, Eb, F, G, Bb) suited for funky basslines
const BASS_FREQS = [65.41, 77.78, 87.31, 98.00, 116.54]; // C2 scale
// High arp notes
const LEAD_FREQS = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25]; // C4 scale

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  
  // Music Engine State
  private isMusicMuted: boolean = false;
  private isSfxMuted: boolean = false;
  
  private musicRunning: boolean = false;
  private schedulerTimer: number | null = null;
  private nextNoteTime: number = 0;
  private beatCount: number = 0;
  
  // Sidechain / Pumping Effect Node
  private sidechainGain: GainNode | null = null;

  // Dynamic Economy Factor (0.0 to 1.0)
  private wealthFactor: number = 0;

  constructor() {}

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0; 
      this.masterGain.connect(this.ctx.destination);

      // SFX Bus
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.isSfxMuted ? 0 : 0.5;
      this.sfxBus.connect(this.masterGain);

      // Music Bus Setup for "French House" feel
      // Chain: Music Source -> Filter (Wah) -> Sidechain (Pump) -> Master
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.isMusicMuted ? 0 : 0.4;

      this.sidechainGain = this.ctx.createGain();
      this.sidechainGain.gain.value = 1.0;
      
      this.sidechainGain.connect(this.musicBus);
      this.musicBus.connect(this.masterGain);

      // Auto-resume logic
      const resume = () => {
          if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
          if (this.ctx?.state === 'running') {
             window.removeEventListener('click', resume);
             window.removeEventListener('keydown', resume);
             window.removeEventListener('touchstart', resume);
          }
      };
      window.addEventListener('click', resume);
      window.addEventListener('keydown', resume);
      window.addEventListener('touchstart', resume);
    }
  }

  public setMusicMuted(muted: boolean) {
    this.isMusicMuted = muted;
    if (this.musicBus) {
        const t = this.ctx?.currentTime || 0;
        this.musicBus.gain.setTargetAtTime(muted ? 0 : 0.4, t, 0.1);
    }
    if (!muted && !this.musicRunning) {
        this.startMusic();
    } else if (muted) {
        // Optional: Pause sequencer to save CPU, but keeping it running keeps sync
    }
  }

  public setSfxMuted(muted: boolean) {
      this.isSfxMuted = muted;
      if (this.sfxBus) {
          const t = this.ctx?.currentTime || 0;
          this.sfxBus.gain.setTargetAtTime(muted ? 0 : 0.5, t, 0.1);
      }
  }
  
  public resumeContext() {
      if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
      }
  }

  // --- 8-BIT FUNK ENGINE ---
  
  public startMusic() {
      if (this.musicRunning) return;
      this.init();
      if (!this.ctx) return;

      this.resumeContext();
      this.musicRunning = true;
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.beatCount = 0;
      
      this.scheduler();
  }

  public stopMusic() {
      this.musicRunning = false;
      if (this.schedulerTimer) {
          clearTimeout(this.schedulerTimer);
          this.schedulerTimer = null;
      }
  }

  private scheduler() {
      if (!this.musicRunning || !this.ctx) return;

      const tempo = 120; // BPM (Disco/House)
      const secondsPerBeat = 60.0 / tempo;
      const scheduleAheadTime = 0.1;

      while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
          this.scheduleBeat(this.nextNoteTime, this.beatCount);
          this.nextNoteTime += secondsPerBeat / 4; // 16th notes
          this.beatCount++;
      }
      
      this.schedulerTimer = window.setTimeout(() => this.scheduler(), 25);
  }

  private scheduleBeat(time: number, beat: number) {
      if (!this.ctx || !this.sidechainGain) return;

      // 16-step sequencer (4/4 time)
      const step = beat % 16;
      const quarterNote = beat % 4 === 0; // 1, 5, 9, 13

      // --- SIDECHAIN EFFECT (The "Pumping" feeling) ---
      // Dips volume on every quarter note (Kick drum simulation)
      if (quarterNote) {
          this.sidechainGain.gain.cancelScheduledValues(time);
          this.sidechainGain.gain.setValueAtTime(0.4, time); // Duck down
          this.sidechainGain.gain.exponentialRampToValueAtTime(1.0, time + 0.3); // Recover
      }

      // --- BASS (Square Wave - 8-bit grit) ---
      // Funky off-beat pattern
      const isBassStep = [0, 3, 6, 8, 11, 14].includes(step);
      if (isBassStep) {
          this.playSynthNote(time, 'bass');
      }

      // --- LEAD / ARP (Sawtooth - Daft Punkish) ---
      // Arpeggiator runs faster when "rich"
      const arpDensity = this.wealthFactor > 0.5 ? 2 : 4; // Every 2nd or 4th step
      if (beat % arpDensity === 0) {
          this.playSynthNote(time, 'lead');
      }
      
      // --- HI-HAT (Noise) ---
      if (step % 2 !== 0) { // Off-beats
          this.playHiHat(time);
      }
  }

  private playSynthNote(time: number, type: 'bass' | 'lead') {
      if (!this.ctx || !this.sidechainGain) return;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      // 8-bit waveforms
      osc.type = type === 'bass' ? 'square' : 'sawtooth';
      
      // Note Selection based on Wealth (Excitement)
      let freq = 0;
      if (type === 'bass') {
          // Bass moves between Root and Flat 7
          const idx = Math.floor(Math.random() * (this.wealthFactor > 0.3 ? 5 : 2)); 
          freq = BASS_FREQS[idx];
      } else {
          // Lead arpeggiates higher
          const idx = Math.floor(Math.random() * LEAD_FREQS.length);
          freq = LEAD_FREQS[idx];
      }
      osc.frequency.value = freq;

      // Filter Envelope (The "Talking" effect)
      filter.type = 'lowpass';
      filter.Q.value = type === 'bass' ? 5 : 10; // Resonance
      
      const attack = 0.01;
      const decay = type === 'bass' ? 0.2 : 0.1;

      // Filter Sweep
      filter.frequency.setValueAtTime(type === 'bass' ? 200 : 800, time);
      filter.frequency.exponentialRampToValueAtTime(type === 'bass' ? 1000 : 3000, time + attack);
      filter.frequency.exponentialRampToValueAtTime(type === 'bass' ? 100 : 500, time + decay);

      // Amplitude Envelope
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(type === 'bass' ? 0.2 : 0.1, time + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

      // Connect
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sidechainGain); // Route through sidechain

      osc.start(time);
      osc.stop(time + decay + 0.1);
  }

  private playHiHat(time: number) {
      if (!this.ctx || !this.sidechainGain) return;
      
      // Create noise buffer once (optimization usually, but doing inline for brevity)
      const bufferSize = this.ctx.sampleRate * 0.05; // 50ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.05 + (this.wealthFactor * 0.05), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sidechainGain);
      
      noise.start(time);
  }

  /**
   * Updates music intensity based on economy.
   */
  public updateMusic(credits: number, maxThreshold: number = 500) {
      // Clamp 0-1
      this.wealthFactor = Math.min(1, Math.max(0, credits / maxThreshold));
  }

  // --- SFX (UNCHANGED BUT RETUNED FOR 8-BIT FEEL) ---

  public play(type: SoundType) {
    if (this.isSfxMuted) return;
    this.init();
    if (!this.ctx || !this.sfxBus) return;
    this.resumeContext();

    const t = this.ctx.currentTime;

    switch (type) {
      case 'UI_HOVER': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle'; // Crisper than sine
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.03);
        gain.gain.setValueAtTime(0.02, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.03);
        osc.connect(gain); gain.connect(this.sfxBus); osc.start(t); osc.stop(t + 0.05);
        break;
      }
      case 'UI_CLICK': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square'; // Clicky
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain); gain.connect(this.sfxBus); osc.start(t); osc.stop(t + 0.1);
        break;
      }
      case 'MOVE': {
        // Quick "Zip"
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.linearRampToValueAtTime(440, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.1);
        osc.connect(gain); gain.connect(this.sfxBus); osc.start(t); osc.stop(t + 0.15);
        break;
      }
      case 'COIN': {
        // Classic 2-note coin sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(987, t); 
        osc.frequency.setValueAtTime(1318, t + 0.08);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.setValueAtTime(0.05, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain); gain.connect(this.sfxBus); osc.start(t); osc.stop(t + 0.3);
        break;
      }
      case 'ERROR': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.2);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.connect(gain); gain.connect(this.sfxBus); osc.start(t); osc.stop(t + 0.2);
        break;
      }
      // Keep other complex sounds standard/generative
      case 'SUCCESS': {
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            const start = t + (i * 0.05);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.05, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
            osc.connect(gain); gain.connect(this.sfxBus!); osc.start(start); osc.stop(start + 0.5);
        });
        break;
      }
      case 'LEVEL_UP': {
        // Fast Arp
        [440, 554, 659, 880].forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const start = t + (i * 0.04);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
            osc.connect(gain); gain.connect(this.sfxBus!); osc.start(start); osc.stop(start + 0.4);
        });
        break;
      }
      case 'COLLAPSE': {
         // Noise burst
         const bufferSize = this.ctx.sampleRate * 0.3;
         const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
         const data = buffer.getChannelData(0);
         for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
         
         const noise = this.ctx.createBufferSource();
         noise.buffer = buffer;
         const filter = this.ctx.createBiquadFilter();
         filter.type = 'lowpass';
         filter.frequency.setValueAtTime(500, t);
         filter.frequency.linearRampToValueAtTime(50, t + 0.3);
         const gain = this.ctx.createGain();
         gain.gain.setValueAtTime(0.2, t);
         gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
         noise.connect(filter); filter.connect(gain); gain.connect(this.sfxBus); noise.start(t);
         break;
      }
      default: break;
    }
  }
}

export const audioService = new AudioService();
