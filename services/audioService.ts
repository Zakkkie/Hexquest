
/**
 * Procedural Audio Synthesizer for HexQuest
 * Style: Chill / Dub Techno
 * Features: Playlist system, Shuffle, Procedural Patterns
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

// --- MUSIC THEORY & PRESETS ---

// Scales (Intervals from Root)
const SCALES = {
    MINOR_7: [0, 3, 7, 10],
    DORIAN: [0, 2, 3, 5, 7, 9, 10],
    PHRYGIAN: [0, 1, 3, 5, 7, 8, 10],
    DEEP_TECH: [0, 3, 5, 7, 10]
};

// Base Frequencies (Roots)
const ROOTS = {
    C2: 65.41,
    D2: 73.42,
    Eb2: 77.78,
    F2: 87.31,
    G2: 98.00,
    A2: 110.00,
    Bb2: 116.54
};

interface TrackPreset {
    id: string;
    title: string;
    bpm: number;
    root: number;
    scale: number[];
    vibe: 'DUB' | 'DEEP' | 'FLOAT' | 'ACID';
    seed: number; // Determines rhythmic patterns
}

// 12 Chill Techno Presets
const TRACK_LIBRARY: TrackPreset[] = [
    { id: 't1', title: "Sector 7 Mist", bpm: 110, root: ROOTS.C2, scale: SCALES.MINOR_7, vibe: 'DUB', seed: 101 },
    { id: 't2', title: "Carbon Cycle", bpm: 112, root: ROOTS.G2, scale: SCALES.DEEP_TECH, vibe: 'DEEP', seed: 202 },
    { id: 't3', title: "Neon Rain", bpm: 108, root: ROOTS.F2, scale: SCALES.DORIAN, vibe: 'FLOAT', seed: 303 },
    { id: 't4', title: "Void Echoes", bpm: 105, root: ROOTS.Eb2, scale: SCALES.PHRYGIAN, vibe: 'DUB', seed: 404 },
    { id: 't5', title: "Orbital Lounge", bpm: 115, root: ROOTS.Bb2, scale: SCALES.MINOR_7, vibe: 'FLOAT', seed: 505 },
    { id: 't6', title: "Deep Core", bpm: 118, root: ROOTS.D2, scale: SCALES.DEEP_TECH, vibe: 'DEEP', seed: 606 },
    { id: 't7', title: "Silicon Dreams", bpm: 110, root: ROOTS.A2, scale: SCALES.DORIAN, vibe: 'ACID', seed: 707 },
    { id: 't8', title: "Midnight Protocol", bpm: 113, root: ROOTS.C2, scale: SCALES.MINOR_7, vibe: 'DEEP', seed: 808 },
    { id: 't9', title: "Aurora Systems", bpm: 106, root: ROOTS.G2, scale: SCALES.DORIAN, vibe: 'FLOAT', seed: 909 },
    { id: 't10', title: "Sub-Level 1", bpm: 109, root: ROOTS.F2, scale: SCALES.DEEP_TECH, vibe: 'DUB', seed: 1010 },
    { id: 't11', title: "Hex Grid Blues", bpm: 111, root: ROOTS.Eb2, scale: SCALES.MINOR_7, vibe: 'DEEP', seed: 1111 },
    { id: 't12', title: "Isotope Decay", bpm: 114, root: ROOTS.C2, scale: SCALES.PHRYGIAN, vibe: 'ACID', seed: 1212 }
];

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  
  // FX Bus (Shared Reverb/Delay)
  private delayNode: DelayNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private dubSend: GainNode | null = null;

  // Music State
  private isMusicMuted: boolean = false;
  private isSfxMuted: boolean = false;
  private musicRunning: boolean = false;
  
  private schedulerTimer: number | null = null;
  private nextNoteTime: number = 0;
  private beatCount: number = 0;
  
  // Playlist State
  private playlist: TrackPreset[] = [];
  private currentTrackIndex: number = 0;
  private currentTrackStartTime: number = 0;
  private TRACK_DURATION_SECONDS = 180; // 3 minutes per track

  // Patterns derived from seed
  private currentPatterns: {
      kick: boolean[];
      bass: number[];
      chord: boolean[];
      hat: boolean[];
  } = { kick:[], bass:[], chord:[], hat:[] };

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

      // Music Bus
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.isMusicMuted ? 0 : 0.4;
      this.musicBus.connect(this.masterGain);

      // --- DUB TECHNO FX CHAIN ---
      // 1. Delay (Stereo Ping Pong simulation via mono for simplicity + pan later)
      this.delayNode = this.ctx.createDelay(2.0);
      this.delayNode.delayTime.value = 0.375; // Dotted 8th approx at 120bpm, dynamically updated
      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.value = 0.4;
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'bandpass';
      delayFilter.frequency.value = 1000;
      
      this.delayNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.musicBus);

      // 2. Reverb (Procedural Impulse Response)
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.createImpulseResponse(2.0, 2.0); // 2 seconds reverb
      this.reverbNode.connect(this.musicBus);

      // Send Bus for Chords -> FX
      this.dubSend = this.ctx.createGain();
      this.dubSend.gain.value = 0.6;
      this.dubSend.connect(this.delayNode);
      this.dubSend.connect(this.reverbNode);

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

  // Generate Reverb Impulse Response (White Noise Decay)
  private createImpulseResponse(duration: number, decay: number) {
      if (!this.ctx) return null;
      const rate = this.ctx.sampleRate;
      const length = rate * duration;
      const impulse = this.ctx.createBuffer(2, length, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);

      for (let i = 0; i < length; i++) {
          const n = i / length;
          // Exponential decay
          const vol = Math.pow(1 - n, decay); 
          left[i] = (Math.random() * 2 - 1) * vol;
          right[i] = (Math.random() * 2 - 1) * vol;
      }
      return impulse;
  }

  public setMusicMuted(muted: boolean) {
    this.isMusicMuted = muted;
    if (this.musicBus) {
        const t = this.ctx?.currentTime || 0;
        this.musicBus.gain.setTargetAtTime(muted ? 0 : 0.4, t, 0.2);
    }
    if (!muted && !this.musicRunning) {
        this.startMusic();
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

  // --- PLAYLIST LOGIC ---

  private shufflePlaylist() {
      // Fisher-Yates shuffle
      this.playlist = [...TRACK_LIBRARY];
      for (let i = this.playlist.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
      }
      this.currentTrackIndex = 0;
  }

  private loadTrack(index: number) {
      const track = this.playlist[index];
      console.log(`[Audio] Playing: ${track.title} (${track.bpm} BPM)`);
      this.generatePatterns(track.seed);
      this.currentTrackStartTime = this.ctx?.currentTime || 0;
      
      // Update delay time to sync with BPM
      if (this.delayNode && this.ctx) {
          const beatTime = 60 / track.bpm;
          // Dotted 8th delay (0.75 of a beat)
          this.delayNode.delayTime.setValueAtTime(beatTime * 0.75, this.ctx.currentTime);
      }
  }

  // Pseudo-random generator for patterns
  private generatePatterns(seed: number) {
      const rng = (mod: number) => {
          seed = (seed * 9301 + 49297) % 233280;
          return Math.floor((seed / 233280) * mod);
      };

      // 16-step patterns
      this.currentPatterns = {
          kick: Array(16).fill(false),
          bass: Array(16).fill(-1),
          chord: Array(16).fill(false),
          hat: Array(16).fill(false)
      };

      // Kick: Four-on-the-floor
      for(let i=0; i<16; i+=4) this.currentPatterns.kick[i] = true;

      // Hat: Off-beats + random 16ths
      for(let i=0; i<16; i++) {
          if (i % 2 !== 0) this.currentPatterns.hat[i] = true; // Main open hat
          else if (rng(10) > 7) this.currentPatterns.hat[i] = true; // Random ticks
      }

      // Bass: Off-beat groove + some random fills
      for(let i=0; i<16; i++) {
          if (i % 4 === 2) this.currentPatterns.bass[i] = 0; // Standard Techno Off-beat
          else if (rng(10) > 8) this.currentPatterns.bass[i] = rng(3); // Variation (Root, or +1, +2 scale degrees)
      }

      // Chords: Dub stabs (Sparse)
      // Usually step 0, 7, 14 etc.
      for(let i=0; i<16; i++) {
          if (rng(100) > 85) this.currentPatterns.chord[i] = true;
      }
  }

  // --- ENGINE ---
  
  public startMusic() {
      if (this.musicRunning) return;
      this.init();
      if (!this.ctx) return;

      this.resumeContext();
      this.musicRunning = true;
      this.shufflePlaylist();
      this.loadTrack(0);
      
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

      // Track Management
      const currentTrack = this.playlist[this.currentTrackIndex];
      const elapsed = this.ctx.currentTime - this.currentTrackStartTime;
      
      if (elapsed > this.TRACK_DURATION_SECONDS) {
          // Next track
          this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
          this.loadTrack(this.currentTrackIndex);
      }

      const secondsPerBeat = 60.0 / currentTrack.bpm;
      const stepTime = secondsPerBeat / 4; // 16th notes
      const scheduleAheadTime = 0.1;

      while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
          this.playStep(this.nextNoteTime, this.beatCount, currentTrack);
          this.nextNoteTime += stepTime;
          this.beatCount++;
      }
      
      this.schedulerTimer = window.setTimeout(() => this.scheduler(), 25);
  }

  private playStep(time: number, totalStep: number, track: TrackPreset) {
      if (!this.ctx || !this.musicBus) return;

      const step = totalStep % 16;
      const patterns = this.currentPatterns;

      // 1. Kick (Soft, Deep)
      if (patterns.kick[step]) {
          this.playKick(time);
      }

      // 2. Bass (Deep, Rolling)
      if (patterns.bass[step] !== -1) {
          // Map index to scale frequency
          const scaleIdx = patterns.bass[step] % track.scale.length;
          const semitones = track.scale[scaleIdx];
          const freq = track.root * Math.pow(2, semitones / 12);
          this.playBass(time, freq, track.vibe);
      }

      // 3. Hi-Hats (Shakers/Noise)
      if (patterns.hat[step]) {
          const isOpen = step % 2 !== 0; // Off-beats usually open
          this.playHat(time, isOpen);
      }

      // 4. Dub Chords (Stabs)
      if (patterns.chord[step]) {
          this.playDubChord(time, track);
      }
  }

  // --- INSTRUMENTS ---

  private playKick(time: number) {
      if (!this.ctx || !this.musicBus) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine'; // Pure sub
      
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
      
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(gain);
      gain.connect(this.musicBus);
      osc.start(time);
      osc.stop(time + 0.4);
  }

  private playBass(time: number, freq: number, vibe: string) {
      if (!this.ctx || !this.musicBus) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      // Timbre selection
      if (vibe === 'ACID') osc.type = 'sawtooth';
      else if (vibe === 'DEEP') osc.type = 'triangle';
      else osc.type = 'sine'; // Dub/Float

      osc.frequency.value = freq;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(vibe === 'ACID' ? 800 : 300, time);
      if (vibe === 'ACID') filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);
      filter.Q.value = vibe === 'ACID' ? 5 : 1;

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.linearRampToValueAtTime(0, time + 0.2); // Short plucky

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);
      osc.start(time);
      osc.stop(time + 0.25);
  }

  private playHat(time: number, open: boolean) {
      if (!this.ctx || !this.musicBus) return;
      
      // Noise burst
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6000;

      const gain = this.ctx.createGain();
      // Louder if open
      const vol = open ? 0.15 : 0.05; 
      const dur = open ? 0.1 : 0.03;

      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);
      noise.start(time);
  }

  private playDubChord(time: number, track: TrackPreset) {
      if (!this.ctx || !this.dubSend) return;

      // Construct a minor triad
      const chordIntervals = [0, 3, 7];
      
      chordIntervals.forEach(interval => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          
          osc.type = 'sawtooth';
          
          const semitones = interval;
          // Shift up an octave for chords
          const freq = (track.root * 2) * Math.pow(2, semitones / 12);
          osc.frequency.value = freq;

          gain.gain.setValueAtTime(0.05, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15); // Short stab

          osc.connect(gain);
          // Send to FX Bus (Dub delay)
          gain.connect(this.dubSend!); 
          
          osc.start(time);
          osc.stop(time + 0.2);
      });
  }

  // --- PUBLIC API ---

  public updateMusic(credits: number, maxThreshold: number) {
      // Stub: Dub Techno is consistent, maybe automate filter cutoff slightly with wealth?
      // For now, keep it chill and steady.
  }

  // --- SFX (Existing) ---
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
        osc.type = 'sine'; 
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
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.05);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain); gain.connect(this.sfxBus); osc.start(t); osc.stop(t + 0.1);
        break;
      }
      case 'MOVE': {
        // Soft swish
        const noise = this.ctx.createBufferSource();
        const bSize = this.ctx.sampleRate * 0.2;
        const buf = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for(let i=0; i<bSize; i++) d[i] = Math.random()*2-1;
        noise.buffer = buf;
        
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(400, t);
        f.frequency.linearRampToValueAtTime(100, t+0.2);
        
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.1, t);
        g.gain.linearRampToValueAtTime(0, t+0.2);
        
        noise.connect(f); f.connect(g); g.connect(this.sfxBus); noise.start(t);
        break;
      }
      case 'COIN': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t); 
        osc.frequency.setValueAtTime(1600, t + 0.05);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain); gain.connect(this.sfxBus); osc.start(t); osc.stop(t + 0.3);
        break;
      }
      // Minimalist versions of others
      case 'ERROR': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.15);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.connect(gain); gain.connect(this.sfxBus); osc.start(t); osc.stop(t + 0.2);
        break;
      }
      case 'SUCCESS': {
        // Major triad arp fast
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = t + (i * 0.04);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
            osc.connect(gain); gain.connect(this.sfxBus!); osc.start(start); osc.stop(start + 0.5);
        });
        break;
      }
      case 'LEVEL_UP': {
        // Ethereal sweep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.5);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.connect(gain); gain.connect(this.sfxBus); osc.start(t); osc.stop(t + 0.5);
        break;
      }
      case 'COLLAPSE': {
         // Low rumble
         const osc = this.ctx.createOscillator();
         const gain = this.ctx.createGain();
         osc.type = 'sawtooth';
         osc.frequency.setValueAtTime(80, t);
         osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
         gain.gain.setValueAtTime(0.2, t);
         gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
         osc.connect(gain); gain.connect(this.sfxBus); osc.start(t); osc.stop(t + 0.4);
         break;
      }
      default: break;
    }
  }
}

export const audioService = new AudioService();
