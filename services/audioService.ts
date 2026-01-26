
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
    DEEP_TECH: [0, 3, 5, 7, 10],
    MELODIC: [0, 2, 3, 5, 7, 8, 10] // Natural Minor for melodies
};

// Base Frequencies (Roots)
const ROOTS = {
    C2: 65.41,
    D2: 73.42,
    Eb2: 77.78,
    F2: 87.31,
    G2: 98.00,
    A2: 110.00,
    Bb2: 116.54,
    E2: 82.41
};

// Rhythm Types defining the "Feel" at 128 BPM
type RhythmType = 'STRAIGHT' | 'BROKEN' | 'DUB' | 'MINIMAL' | 'HALF_TIME' | 'URGENT';

interface TrackPreset {
    id: string;
    title: string;
    bpm: number;
    root: number;
    scale: number[];
    vibe: 'DUB' | 'DEEP' | 'FLOAT' | 'ACID' | 'MINIMAL';
    rhythm: RhythmType;
    seed: number; // Determines rhythmic patterns
    bassSequence?: number[]; // Optional override for melody (Scale indices)
}

// 12 "Parody" Dub Techno Presets
const TRACK_LIBRARY: TrackPreset[] = [
    { 
        id: 't1', title: "Sand Sector", bpm: 128, root: ROOTS.E2, scale: SCALES.MELODIC, vibe: 'ACID', rhythm: 'URGENT', seed: 101,
        bassSequence: [7,7,7,7,7,-1,7,-1,7,7,7,7,7,-1,9,-1] // "Sandstorm"ish
    },
    { 
        id: 't2', title: "Seven Bits", bpm: 128, root: ROOTS.E2, scale: SCALES.MELODIC, vibe: 'DEEP', rhythm: 'HALF_TIME', seed: 202,
        bassSequence: [7, -1, 7, 10, 7, 5, 3, 2, 7, -1, 7, 10, 7, 5, 3, -1] // "Seven Nation Army"
    },
    { 
        id: 't3', title: "Sweet Threads", bpm: 128, root: ROOTS.C2, scale: SCALES.MELODIC, vibe: 'DUB', rhythm: 'STRAIGHT', seed: 303,
        bassSequence: [0, 0, 2, 2, 4, 4, 2, 2, 5, 5, 4, 4, 3, 3, 2, 2] // "Sweet Dreams"
    },
    { 
        id: 't4', title: "Blue Screen", bpm: 128, root: ROOTS.G2, scale: SCALES.MINOR_7, vibe: 'FLOAT', rhythm: 'STRAIGHT', seed: 404,
        bassSequence: [0, -1, 2, -1, 4, -1, 5, -1, 4, -1, 2, -1, 0, -1, 2, -1] // "Blue"
    },
    { 
        id: 't5', title: "Around the Grid", bpm: 128, root: ROOTS.A2, scale: SCALES.DORIAN, vibe: 'DEEP', rhythm: 'BROKEN', seed: 505,
        bassSequence: [0, -1, 0, -1, 2, -1, 2, -1, 4, -1, 4, -1, 5, -1, 5, -1] // "Around the World"
    },
    { 
        id: 't6', title: "Sleep Mode", bpm: 128, root: ROOTS.C2, scale: SCALES.MELODIC, vibe: 'ACID', rhythm: 'URGENT', seed: 606,
        bassSequence: [9, -1, -1, -1, 2, -1, -1, -1, 5, -1, -1, -1, 4, -1, 7, -1] // "Insomnia"
    },
    { 
        id: 't7', title: "Calibration", bpm: 128, root: ROOTS.E2, scale: SCALES.MELODIC, vibe: 'MINIMAL', rhythm: 'MINIMAL', seed: 707,
        bassSequence: [0, 0, -1, 0, 0, -1, 1, -1, 0, 0, -1, 0, 0, -1, -1, -1] // "Satisfaction"
    },
    { 
        id: 't8', title: "Kern Grid 400", bpm: 128, root: ROOTS.A2, scale: SCALES.MELODIC, vibe: 'ACID', rhythm: 'STRAIGHT', seed: 808,
        bassSequence: [2, 2, 2, -1, 5, -1, 4, -1, 2, -1, 1, -1, 0, -1, -1, -1] // "Kernkraft 400"
    },
    { 
        id: 't9', title: "Pop Kernel", bpm: 128, root: ROOTS.Bb2, scale: SCALES.MELODIC, vibe: 'FLOAT', rhythm: 'BROKEN', seed: 909,
        bassSequence: [0, -1, 2, -1, 0, -1, 4, -1, 2, -1, 0, -1, 7, -1, -1, -1] // "Popcorn"
    },
    { 
        id: 't10', title: "Bot F", bpm: 128, root: ROOTS.F2, scale: SCALES.MELODIC, vibe: 'FLOAT', rhythm: 'BROKEN', seed: 1010,
        bassSequence: [0, -1, 2, -1, 0, 0, 4, 0, 2, -1, -1, -1, 0, 4, 9, 2] // "Axel F"
    },
    { 
        id: 't11', title: "Offline Alone", bpm: 128, root: ROOTS.E2, scale: SCALES.MELODIC, vibe: 'DUB', rhythm: 'DUB', seed: 1111,
        bassSequence: [4, -1, 3, -1, 4, -1, -1, -1, 4, -1, 3, -1, 4, -1, 0, -1] // "Better Off Alone"
    },
    { 
        id: 't12', title: "Child Process", bpm: 128, root: ROOTS.F2, scale: SCALES.MELODIC, vibe: 'DUB', rhythm: 'DUB', seed: 1212,
        bassSequence: [0, -1, -1, -1, 4, -1, -1, -1, 5, -1, -1, -1, 4, -1, 2, -1] // "Children"
    }
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
      this.delayNode.delayTime.value = 0.351; // ~dotted 8th at 128
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
      console.log(`[Audio] Playing: ${track.title} (${track.bpm} BPM) - ${track.rhythm}`);
      this.generatePatterns(track);
      this.currentTrackStartTime = this.ctx?.currentTime || 0;
      
      // Update delay time to sync with BPM
      if (this.delayNode && this.ctx) {
          const beatTime = 60 / track.bpm;
          // Dotted 8th delay (0.75 of a beat)
          this.delayNode.delayTime.setValueAtTime(beatTime * 0.75, this.ctx.currentTime);
      }
  }

  public nextTrack() {
      // Ensure playlist is ready even if not running
      if (this.playlist.length === 0) this.shufflePlaylist();
      if (!this.ctx) this.init();
      
      this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
      this.loadTrack(this.currentTrackIndex);
  }

  public prevTrack() {
      if (this.playlist.length === 0) this.shufflePlaylist();
      if (!this.ctx) this.init();

      this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
      this.loadTrack(this.currentTrackIndex);
  }

  public getCurrentTrackName(): string {
      if (this.playlist.length === 0) return "Loading...";
      return this.playlist[this.currentTrackIndex].title;
  }

  // Pseudo-random generator for patterns based on Rhythm Type
  private generatePatterns(track: TrackPreset) {
      const rng = (mod: number) => {
          let s = track.seed + Math.random() * 1000;
          return Math.floor((s % 100000 / 100000) * mod);
      };

      // 16-step patterns
      this.currentPatterns = {
          kick: Array(16).fill(false),
          bass: Array(16).fill(-1),
          chord: Array(16).fill(false),
          hat: Array(16).fill(false)
      };

      // 1. Kick Generator based on Rhythm Type
      switch (track.rhythm) {
          case 'STRAIGHT':
          case 'URGENT':
              // Classic 4/4: 0, 4, 8, 12
              [0, 4, 8, 12].forEach(i => this.currentPatterns.kick[i] = true);
              break;
          
          case 'HALF_TIME':
              // Dubstep/Trap feel: Kick on 1. Snare would be on 3 (step 8).
              // We put kick on 0. Maybe a syncopated kick on step 10 or 11.
              this.currentPatterns.kick[0] = true;
              if (rng(10) > 4) this.currentPatterns.kick[10] = true;
              // Snare will be handled by high hat or special noise in playStep
              break;

          case 'BROKEN':
              // Breakbeat / Garage: 0, 3 (maybe), 10
              this.currentPatterns.kick[0] = true;
              this.currentPatterns.kick[10] = true;
              if (Math.random() > 0.5) this.currentPatterns.kick[3] = true; 
              if (Math.random() > 0.7) this.currentPatterns.kick[14] = true;
              break;

          case 'DUB':
              // Sparse, emphasized 1st beat, maybe syncopated later
              this.currentPatterns.kick[0] = true;
              if (Math.random() > 0.3) this.currentPatterns.kick[10] = true;
              if (Math.random() > 0.6) this.currentPatterns.kick[14] = true;
              break;

          case 'MINIMAL':
              // Very sparse or just 1 and 9
              this.currentPatterns.kick[0] = true;
              this.currentPatterns.kick[8] = true;
              break;
      }

      // 2. Hat Generator
      for(let i=0; i<16; i++) {
          if (track.rhythm === 'URGENT') {
              // 16th note hats driving the beat
              this.currentPatterns.hat[i] = true;
          }
          else if (track.rhythm === 'HALF_TIME') {
              // Accentuate the 'Snare' beat (step 8) with a hat if we don't have a snare sample
              if (i === 8) this.currentPatterns.hat[i] = true;
              // Fast rolling hats in between?
              if (i % 2 !== 0 && rng(10) > 3) this.currentPatterns.hat[i] = true;
          }
          else if (track.rhythm === 'MINIMAL') {
              // Minimal: Short noise ticks on random steps
              if (rng(10) > 6) this.currentPatterns.hat[i] = true;
          } else {
              // Standard: Open Hat on off-beats (2, 6, 10, 14) + random shaker
              if (i % 4 === 2) this.currentPatterns.hat[i] = true; // Main open hat
              else if (rng(10) > 7) this.currentPatterns.hat[i] = true; // Ghost ticks
          }
      }

      // 3. Bass Generator (Use provided sequence if available)
      if (track.bassSequence) {
          // Loop or fit 16 step sequence
          for(let i=0; i<16; i++) {
              if (i < track.bassSequence.length) {
                  this.currentPatterns.bass[i] = track.bassSequence[i];
              }
          }
      } else {
          // Procedural Fallback
          for(let i=0; i<16; i++) {
              if (this.currentPatterns.kick[i]) continue;

              if (track.rhythm === 'STRAIGHT' || track.rhythm === 'URGENT') {
                  if (i % 2 !== 0) this.currentPatterns.bass[i] = 0; 
              } else if (track.rhythm === 'BROKEN') {
                  if (rng(10) > 5) this.currentPatterns.bass[i] = rng(3);
              } else if (track.rhythm === 'HALF_TIME') {
                  if (i === 4 || i === 12) this.currentPatterns.bass[i] = 0;
              } else {
                  if (i === 4 || i === 7 || i === 11) {
                      if (rng(10) > 3) this.currentPatterns.bass[i] = 0;
                  }
              }
          }
      }

      // 4. Chord Generator (Dub Stabs)
      // Usually sparse: 7, 11, or 13
      for(let i=0; i<16; i++) {
          // Less chords in minimal
          const threshold = track.rhythm === 'MINIMAL' ? 95 : 85;
          if (rng(100) > threshold) this.currentPatterns.chord[i] = true;
          
          // Force a chord on a typical dub spot if DUB vibe
          if (track.vibe === 'DUB' && (i === 3 || i === 6)) {
              if (rng(10) > 2) this.currentPatterns.chord[i] = true;
          }
      }
  }

  // --- ENGINE ---
  
  public startMusic() {
      if (this.musicRunning) return;
      this.init();
      if (!this.ctx) return;

      this.resumeContext();
      this.musicRunning = true;
      
      // Shuffle only if not yet populated
      if (this.playlist.length === 0) {
          this.shufflePlaylist();
      }
      this.loadTrack(this.currentTrackIndex);
      
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
          // Calculate Frequency with Octave support
          // Note value from pattern is assumed to be scale index + octave offset logic if we want,
          // but here we just map index to scale.
          const rawNote = patterns.bass[step];
          const len = track.scale.length;
          const octave = Math.floor(rawNote / len);
          const scaleIdx = rawNote % len;
          
          // Safety
          const safeScaleIdx = Math.max(0, Math.min(scaleIdx, len - 1));
          
          const semitones = track.scale[safeScaleIdx] + (octave * 12);
          const freq = track.root * Math.pow(2, semitones / 12);
          
          this.playBass(time, freq, track.vibe);
      }

      // 3. Hi-Hats (Shakers/Noise)
      if (patterns.hat[step]) {
          // For HALF_TIME, step 8 acts as a snare accent (louder hat)
          const isAccent = (track.rhythm === 'HALF_TIME' && step === 8);
          // Standard off-beat open hat
          const isOpen = (step % 4 === 2) || isAccent; 
          this.playHat(time, isOpen, isAccent);
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

  private playHat(time: number, open: boolean, accent: boolean = false) {
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
      filter.frequency.value = accent ? 3000 : 6000; // Lower freq for accent ("Snare" feel)

      const gain = this.ctx.createGain();
      
      let vol = 0.05;
      let dur = 0.03;
      
      if (accent) {
          vol = 0.25;
          dur = 0.15;
      } else if (open) {
          vol = 0.15;
          dur = 0.1;
      }

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
