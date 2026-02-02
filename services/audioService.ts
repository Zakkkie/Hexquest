
/**
 * Advanced Procedural Audio Synthesizer for HexQuest
 * Engine: "Nebula V2"
 * Features: FM Synthesis, Generative Arrangement, Chord Progressions, Dynamic Mixing
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

// --- MUSIC THEORY CONSTANTS ---

const ROOT_FREQUENCIES = {
    C2: 65.41,
    Db2: 69.30,
    D2: 73.42,
    Eb2: 77.78,
    E2: 82.41,
    F2: 87.31,
    G2: 98.00,
    Ab2: 103.83,
    A2: 110.00,
    Bb2: 116.54,
    B2: 123.47
};

// Scales defined by semitone intervals
const SCALES = {
    MINOR: [0, 2, 3, 5, 7, 8, 10],      // Aeolian
    DORIAN: [0, 2, 3, 5, 7, 9, 10],     // Sci-Fi / Hopeful
    PHRYGIAN: [0, 1, 3, 5, 7, 8, 10],   // Dark / Tension
    LYDIAN: [0, 2, 4, 6, 7, 9, 11],     // Space / Floating
    HARMONIC_MINOR: [0, 2, 3, 5, 7, 8, 11] // Exotic / Ancient
};

// Arrangement Sections
enum Section {
    INTRO,
    BUILD,
    MAIN,
    BREAKDOWN,
    OUTRO
}

interface MusicalContext {
    rootFreq: number;
    scale: number[];
    bpm: number;
    chordProgression: number[][]; // Array of chord degrees (e.g. [0, 4, 5, 3] relative to scale)
    currentChordIndex: number;
    intensity: number; // 0.0 to 1.0
}

class AudioService {
  private ctx: AudioContext | null = null;
  
  // Mix Buses
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  
  // FX Sends
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  
  // State
  private isMusicMuted: boolean = false;
  private isSfxMuted: boolean = false;
  private musicRunning: boolean = false;
  
  // Scheduler
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // s
  private nextNoteTime = 0.0;
  private current16thNote = 0;
  private timerID: number | null = null;

  // Composition State
  private context: MusicalContext = {
      rootFreq: ROOT_FREQUENCIES.F2,
      scale: SCALES.MINOR,
      bpm: 110,
      chordProgression: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]], // I, VI, IV, V approx
      currentChordIndex: 0,
      intensity: 0.5
  };

  private arrangementState = {
      section: Section.INTRO,
      barCount: 0,
      totalBars: 0
  };

  // Dynamic Pattern State (Regenerated every few bars)
  private patterns = {
      kick: [] as boolean[],
      hat: [] as boolean[],
      perc: [] as boolean[],
      bass: [] as number[], // Scale degrees
      arp: [] as number[]   // Scale degrees
  };

  constructor() {
      this.handleUnlock = this.handleUnlock.bind(this);
  }

  // IOS AUDIO UNLOCK HANDLER
  private handleUnlock() {
      if (this.ctx && this.ctx.state !== 'running') {
          this.ctx.resume().then(() => {
              // Play a silent buffer to physically wake up the iOS audio thread
              const buffer = this.ctx!.createBuffer(1, 1, 22050);
              const source = this.ctx!.createBufferSource();
              source.buffer = buffer;
              source.connect(this.ctx!.destination);
              source.start(0);
          }).catch(e => console.error("Audio resume failed", e));
      }
  }

  private init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // 1. Master Chain: Compressor -> Master Gain -> Destination
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.value = -12;
      this.masterCompressor.knee.value = 30;
      this.masterCompressor.ratio.value = 12;
      this.masterCompressor.attack.value = 0.003;
      this.masterCompressor.release.value = 0.25;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;

      this.masterCompressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // 2. Buses
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.isMusicMuted ? 0 : 0.5;
      this.musicBus.connect(this.masterCompressor);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.isSfxMuted ? 0 : 0.6;
      this.sfxBus.connect(this.masterCompressor);

      // 3. FX: Reverb (Space)
      this.reverbNode = this.ctx.createConvolver();
      const ir = this.createReverbImpulse(3.0);
      if (ir) this.reverbNode.buffer = ir;
      
      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = 0.4;
      this.reverbNode.connect(reverbGain);
      reverbGain.connect(this.musicBus);

      // 4. FX: Stereo Delay (Echo)
      this.delayNode = this.ctx.createDelay(2.0);
      this.delayFeedback = this.ctx.createGain();
      const delayFilter = this.ctx.createBiquadFilter();
      
      this.delayNode.delayTime.value = 60 / this.context.bpm * 0.75; // Dotted 8th
      this.delayFeedback.gain.value = 0.4;
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 2000; // Dark echoes

      this.delayNode.connect(delayFilter);
      delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      
      const delayOutput = this.ctx.createGain();
      delayOutput.gain.value = 0.3;
      this.delayNode.connect(delayOutput);
      delayOutput.connect(this.musicBus);

      // Attach Unlock Listeners for iOS
      const events = ['click', 'touchstart', 'touchend', 'keydown'];
      events.forEach(event => {
          window.addEventListener(event, this.handleUnlock, { passive: true, capture: true });
      });
    }
  }

  // Generate a high-quality impulse response for reverb
  private createReverbImpulse(duration: number) {
      if (!this.ctx) return null;
      const rate = this.ctx.sampleRate;
      const length = rate * duration;
      const impulse = this.ctx.createBuffer(2, length, rate);
      const L = impulse.getChannelData(0);
      const R = impulse.getChannelData(1);

      for (let i = 0; i < length; i++) {
          const n = i / length;
          // Exponential decay with noise
          const env = Math.pow(1 - n, 2.5); 
          L[i] = (Math.random() * 2 - 1) * env;
          R[i] = (Math.random() * 2 - 1) * env;
      }
      return impulse;
  }

  // --- PUBLIC CONTROLS ---

  public setMusicMuted(muted: boolean) {
      this.isMusicMuted = muted;
      if (this.musicBus && this.ctx) {
          this.musicBus.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.3);
      }
      if (!muted && !this.musicRunning) {
          this.startMusic();
      }
  }

  public setSfxMuted(muted: boolean) {
      this.isSfxMuted = muted;
      if (this.sfxBus && this.ctx) {
          this.sfxBus.gain.setTargetAtTime(muted ? 0 : 0.6, this.ctx.currentTime, 0.1);
      }
  }

  public toggleMusic() { this.setMusicMuted(!this.isMusicMuted); }
  public toggleSfx() { this.setSfxMuted(!this.isSfxMuted); }
  
  public updateMusic(credits: number, maxThreshold: number) {
      // Dynamic Intensity based on player wealth/progress
      const ratio = Math.min(1, credits / Math.max(1, maxThreshold));
      // Gradually shift intensity (0.5 to 1.0) based on progress
      this.context.intensity = 0.4 + (ratio * 0.6);
  }
  
  public getCurrentTrackName() { return "Procedural :: Nebula V2"; }
  public playRandomTrack() { this.regenerateComposition(); }
  public nextTrack() { this.regenerateComposition(); }
  public prevTrack() { this.regenerateComposition(); }

  // --- COMPOSITION ENGINE ---

  private regenerateComposition() {
      // Pick a random key
      const roots = Object.values(ROOT_FREQUENCIES);
      const root = roots[Math.floor(Math.random() * roots.length)];
      
      // Pick a scale flavor
      const scaleKeys = Object.keys(SCALES) as (keyof typeof SCALES)[];
      const scaleKey = scaleKeys[Math.floor(Math.random() * scaleKeys.length)];
      const scale = SCALES[scaleKey];

      // Pick BPM (Ambient slow or Driving fast)
      const bpm = 90 + Math.random() * 40;

      // Generate Chord Progression (4 chords, using scale degrees)
      // Simple logic: Start I, move to something else, cadence at end
      const prog = [];
      prog.push([0, 2, 4]); // Tonic triad
      for(let i=0; i<3; i++) {
          const rootDegree = Math.floor(Math.random() * 7);
          prog.push([rootDegree, (rootDegree + 2) % 7, (rootDegree + 4) % 7]);
      }

      this.context = {
          rootFreq: root,
          scale: scale,
          bpm: bpm,
          chordProgression: prog,
          currentChordIndex: 0,
          intensity: 0.5
      };

      // Reset Arrange
      this.arrangementState = { section: Section.INTRO, barCount: 0, totalBars: 0 };
      this.generatePatterns();
      
      if (this.delayNode && this.ctx) {
           this.delayNode.delayTime.setValueAtTime(60 / bpm * 0.75, this.ctx.currentTime);
      }
  }

  private generatePatterns() {
      // Procedural 16-step patterns
      
      // Kick: Euclidean-ish distribution
      this.patterns.kick = new Array(16).fill(false);
      const kickHits = this.context.bpm > 110 ? 4 : 3; // More kicks if faster
      for(let i=0; i<16; i+=4) this.patterns.kick[i] = true; // 4/4 base
      if (Math.random() > 0.5) this.patterns.kick[14] = true; // Syncopation

      // Hats: 16ths or 8ths
      this.patterns.hat = new Array(16).fill(false);
      for(let i=2; i<16; i+=4) this.patterns.hat[i] = true; // Offbeat open
      if (this.context.intensity > 0.6) {
           for(let i=0; i<16; i+=2) if (!this.patterns.hat[i]) this.patterns.hat[i] = Math.random() > 0.7; // 8th fill
      }

      // Bass: Follows Root of current chord usually
      // We store SCALE DEGREES here
      this.patterns.bass = new Array(16).fill(-1);
      this.patterns.bass[0] = 0; // Root on 1
      this.patterns.bass[10] = 0; // Root on 3.5
      if (Math.random() > 0.5) this.patterns.bass[14] = 4; // Fifth on end

      // Arp: Random walk in scale
      this.patterns.arp = new Array(16).fill(-1);
      for(let i=0; i<16; i++) {
          if (Math.random() > 0.6) {
              this.patterns.arp[i] = Math.floor(Math.random() * 7); // Random scale degree
          }
      }
  }

  // --- AUDIO SCHEDULER ---

  public startMusic() {
      if (this.musicRunning) return;
      this.init();
      if (!this.ctx) return;
      
      this.regenerateComposition();
      this.musicRunning = true;
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.current16thNote = 0;
      this.scheduler();
  }

  public stopMusic() {
      this.musicRunning = false;
      if (this.timerID) window.clearTimeout(this.timerID);
  }

  private scheduler() {
      if (!this.musicRunning || !this.ctx) return;

      while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
          this.scheduleNote(this.current16thNote, this.nextNoteTime);
          this.nextNoteTime += 0.25 * 60.0 / this.context.bpm; // Add quarter note / 4
          this.current16thNote++;
          if (this.current16thNote === 16) {
              this.current16thNote = 0;
              this.handleBarChange();
          }
      }
      this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private handleBarChange() {
      this.arrangementState.barCount++;
      this.arrangementState.totalBars++;

      // Change Chord every bar
      this.context.currentChordIndex = (this.context.currentChordIndex + 1) % this.context.chordProgression.length;

      // Arrangement Logic (Simplified Director)
      const bars = this.arrangementState.barCount;
      const section = this.arrangementState.section;

      if (section === Section.INTRO && bars > 4) {
          this.arrangementState.section = Section.BUILD;
          this.arrangementState.barCount = 0;
      } else if (section === Section.BUILD && bars > 4) {
          this.arrangementState.section = Section.MAIN;
          this.arrangementState.barCount = 0;
          this.generatePatterns(); // Fresh patterns for drop
      } else if (section === Section.MAIN && bars > 16) {
          this.arrangementState.section = Section.BREAKDOWN;
          this.arrangementState.barCount = 0;
      } else if (section === Section.BREAKDOWN && bars > 8) {
          this.arrangementState.section = Section.MAIN;
          this.arrangementState.barCount = 0;
          this.generatePatterns(); // Change it up
      }
  }

  // --- SOUND GENERATION ---

  private scheduleNote(beatNumber: number, time: number) {
      const sect = this.arrangementState.section;

      // 1. KICK (Punchy)
      // Only play in Build (rising) or Main
      if ((sect === Section.MAIN || (sect === Section.BUILD && beatNumber % 2 === 0))) {
          if (this.patterns.kick[beatNumber]) {
              this.triggerKick(time);
          }
      }

      // 2. BASS (FM Synthesis)
      // Only in Main and parts of Build
      if (sect === Section.MAIN || (sect === Section.BUILD && this.arrangementState.barCount > 2)) {
          const bassNote = this.patterns.bass[beatNumber];
          if (bassNote !== -1) {
              // Map scale degree relative to current chord root
              const chord = this.context.chordProgression[this.context.currentChordIndex];
              const chordRootDegree = chord[0]; 
              // Simple logic: Play the root of the chord mostly
              const degree = chordRootDegree; 
              const freq = this.getFreq(degree, 0); // Bass octave 0
              this.triggerFMBass(time, freq);
          }
      }

      // 3. PAD (Atmospheric Chords)
      // Always play, controls the mood
      if (beatNumber === 0) { // On downbeat
          const chord = this.context.chordProgression[this.context.currentChordIndex];
          this.triggerPadChord(time, chord);
      }

      // 4. HI-HATS
      if (sect !== Section.INTRO && sect !== Section.BREAKDOWN) {
          if (this.patterns.hat[beatNumber]) {
              const accent = beatNumber % 4 === 2; // Offbeat accent
              this.triggerHat(time, accent);
          }
      }

      // 5. ARP (Plucky)
      // Intro, Breakdown, Main
      if (sect !== Section.BUILD) {
          const arpDegree = this.patterns.arp[beatNumber];
          if (arpDegree !== -1) {
              const freq = this.getFreq(arpDegree, 3); // High octave
              this.triggerArp(time, freq);
          }
      }
  }

  // --- SYNTHESIS ENGINES ---

  private getFreq(scaleDegree: number, octaveOffset: number): number {
      const scaleLen = this.context.scale.length;
      const octave = Math.floor(scaleDegree / scaleLen) + octaveOffset;
      const index = Math.abs(scaleDegree % scaleLen);
      const semitones = this.context.scale[index] + (octave * 12);
      return this.context.rootFreq * Math.pow(2, semitones / 12);
  }

  private triggerKick(time: number) {
      if (!this.ctx || !this.musicBus) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      gain.gain.setValueAtTime(1.0, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

      osc.connect(gain);
      gain.connect(this.musicBus);
      osc.start(time);
      osc.stop(time + 0.5);
      
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  private triggerFMBass(time: number, freq: number) {
      if (!this.ctx || !this.musicBus) return;
      
      // Carrier
      const car = this.ctx.createOscillator();
      car.type = 'sine';
      car.frequency.value = freq;

      // Modulator
      const mod = this.ctx.createOscillator();
      mod.type = 'square'; // Gritty
      mod.frequency.value = freq * 0.5; // Sub-octave mod
      
      const modGain = this.ctx.createGain();
      // FM Index envelope
      modGain.gain.setValueAtTime(500, time); 
      modGain.gain.exponentialRampToValueAtTime(1, time + 0.3);

      mod.connect(modGain);
      modGain.connect(car.frequency);

      // Amp Envelope
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(0, time);
      amp.gain.linearRampToValueAtTime(0.6, time + 0.02);
      amp.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

      // Lowpass Filter for "wub"
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, time);
      filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);

      car.connect(filter);
      filter.connect(amp);
      amp.connect(this.musicBus);

      car.start(time);
      mod.start(time);
      car.stop(time + 0.5);
      mod.stop(time + 0.5);
      
      car.onended = () => { car.disconnect(); mod.disconnect(); modGain.disconnect(); amp.disconnect(); filter.disconnect(); };
  }

  private triggerPadChord(time: number, chordDegrees: number[]) {
      if (!this.ctx || !this.musicBus) return;

      const attack = 1.5;
      const release = 1.5;
      const dur = (60 / this.context.bpm) * 4; // 1 bar

      chordDegrees.forEach((deg, i) => {
          const freq = this.getFreq(deg, 2); // Mid range
          
          const osc1 = this.ctx!.createOscillator();
          osc1.type = 'sawtooth';
          osc1.frequency.value = freq;
          osc1.detune.value = -10 + (Math.random() * 20); // Thick detune

          const osc2 = this.ctx!.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.value = freq;
          osc2.detune.value = -5 + (Math.random() * 10);

          const filter = this.ctx!.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 400 + (Math.random() * 200);
          filter.Q.value = 1;

          // Slight filter movement LFO
          const lfo = this.ctx!.createOscillator();
          lfo.frequency.value = 0.2; // Slow breathe
          const lfoGain = this.ctx!.createGain();
          lfoGain.gain.value = 200;
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);

          const gain = this.ctx!.createGain();
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.08, time + attack);
          gain.gain.setValueAtTime(0.08, time + dur - release);
          gain.gain.linearRampToValueAtTime(0, time + dur);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          
          // Send to Reverb heavily
          if (this.reverbNode) gain.connect(this.reverbNode);
          else gain.connect(this.musicBus!);

          osc1.start(time);
          osc2.start(time);
          lfo.start(time);
          
          const stopTime = time + dur + 0.1;
          osc1.stop(stopTime);
          osc2.stop(stopTime);
          lfo.stop(stopTime);
          
          osc1.onended = () => { osc1.disconnect(); osc2.disconnect(); lfo.disconnect(); lfoGain.disconnect(); filter.disconnect(); gain.disconnect(); };
      });
  }

  private triggerArp(time: number, freq: number) {
      if (!this.ctx || !this.musicBus) return;

      const osc = this.ctx.createOscillator();
      osc.type = 'sine'; // Plucky sine
      osc.frequency.value = freq;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      osc.connect(gain);
      // Send to Delay
      if (this.delayNode) gain.connect(this.delayNode);
      gain.connect(this.musicBus);

      osc.start(time);
      osc.stop(time + 0.25);
      
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  private triggerHat(time: number, accent: boolean) {
      if (!this.ctx || !this.musicBus) return;
      
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(accent ? 0.15 : 0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (accent ? 0.05 : 0.03));

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);
      
      noise.start(time);
      noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  // --- SFX METHODS ---
  public play(type: SoundType) {
    if (this.isSfxMuted) return;
    this.init();
    if (!this.ctx || !this.sfxBus) return;
    
    // SFX implementations (Hover, Click, etc.) using simple synthesis
    // Keeping this part simple to focus on Music upgrade
    const t = this.ctx.currentTime;
    
    const playOsc = (freq: number, type: OscillatorType, dur: number, vol: number) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + dur);
        osc.connect(g);
        g.connect(this.sfxBus!);
        osc.start(t);
        osc.stop(t + dur);
        
        osc.onended = () => { osc.disconnect(); g.disconnect(); };
    };

    switch (type) {
      case 'UI_CLICK': playOsc(800, 'triangle', 0.1, 0.1); break;
      case 'UI_HOVER': playOsc(400, 'sine', 0.05, 0.02); break;
      case 'ERROR': playOsc(150, 'sawtooth', 0.2, 0.1); break;
      case 'SUCCESS': 
        playOsc(523, 'sine', 0.3, 0.1); 
        setTimeout(() => playOsc(659, 'sine', 0.3, 0.1), 100);
        break;
      case 'COIN': playOsc(1200, 'sine', 0.4, 0.05); break;
      case 'MOVE': 
        // Noise swish
        const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        for(let i=0; i<d.length; i++) d[i] = Math.random()*2-1;
        const src = this.ctx.createBufferSource();
        src.buffer = b;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(100, t+0.1);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.1, t); g.gain.linearRampToValueAtTime(0, t+0.1);
        src.connect(f); f.connect(g); g.connect(this.sfxBus); src.start(t);
        src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
        break;
      case 'LEVEL_UP':
         playOsc(440, 'triangle', 0.6, 0.1);
         setTimeout(() => playOsc(880, 'triangle', 0.6, 0.1), 200);
         break;
      case 'COLLAPSE': playOsc(60, 'sawtooth', 0.6, 0.3); break;
    }
  }
}

export const audioService = new AudioService();
