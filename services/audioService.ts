
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
  | 'WARNING'
  | 'FIREWORK'
  | 'TELEPORT'
  | 'JACKPOT';

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
  private portalHumNode: { osc: OscillatorNode; lfo: OscillatorNode; filter: BiquadFilterNode; lfoGain: GainNode; gain: GainNode } | null = null;
  private isMusicMuted: boolean = false;
  private isSfxMuted: boolean = false;
  private musicRunning: boolean = false;
  private whiteNoiseBuffer: AudioBuffer | null = null;

  // AI Generative Music State (Lyria integration)
  private aiAudio: HTMLAudioElement | null = null;
  private aiMusicState: {
      status: 'idle' | 'generating' | 'playing' | 'paused' | 'error';
      prompt: string;
      lyrics: string;
      error: string;
      length: 'clip' | 'pro';
  } = {
      status: 'idle',
      prompt: 'Cinematic futuristic electronic track for a deep space exploration game',
      lyrics: '',
      error: '',
      length: 'clip'
  };
  private aiMusicListeners: ((state: any) => void)[] = [];
  
  // Scheduler
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // s
  private nextNoteTime = 0.0;
  private current16thNote = 0;
  private timerID: number | null = null;
  private schedulerId: number = 0; // Generation ID to kill old loops
  private stopTimerID: any = null;

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
      arp: [] as number[],  // Scale degrees
      lead: [] as number[]  // Scale degrees
  };

  constructor() {
      this.handleUnlock = this.handleUnlock.bind(this);
      
      // Safe fallback load of persistent audio settings to avoid initial state mismatch
      try {
          if (typeof window !== 'undefined' && window.localStorage) {
              const raw = localStorage.getItem('hexquest-storage-v4');
              if (raw) {
                  const parsed = JSON.parse(raw);
                  if (parsed && parsed.state) {
                      if (typeof parsed.state.isMusicMuted === 'boolean') {
                          this.isMusicMuted = parsed.state.isMusicMuted;
                      }
                      if (typeof parsed.state.isSfxMuted === 'boolean') {
                          this.isSfxMuted = parsed.state.isSfxMuted;
                      }
                  }
              }
          }
      } catch (e) {
          // localStorage might be unavailable in private browsing or iframe restrictions
          console.warn('AudioService local storage load failed', e);
      }
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
      
      // Precompute a global white noise buffer to prevent CPU-heavy synchronous array generation
      const noiseLength = this.ctx.sampleRate * 2; // 2 seconds of noise
      this.whiteNoiseBuffer = this.ctx.createBuffer(1, noiseLength, this.ctx.sampleRate);
      const noiseData = this.whiteNoiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseLength; i++) {
          noiseData[i] = Math.random() * 2 - 1;
      }
      
      // 1. Master Chain: Compressor -> Master Gain -> Destination
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.value = -8; 
      this.masterCompressor.knee.value = 40;
      this.masterCompressor.ratio.value = 4; 
      this.masterCompressor.attack.value = 0.05; 
      this.masterCompressor.release.value = 0.1;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;

      this.masterCompressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // 2. Buses
      this.musicBus = this.ctx.createGain();
      // Enforce mute state on initialization
      this.musicBus.gain.value = this.isMusicMuted ? 0 : 0.5;
      this.musicBus.connect(this.masterCompressor);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.isSfxMuted ? 0 : 0.5; 
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

  public async preload() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
        try {
            await this.ctx.resume();
        } catch (e) {
            console.warn("Audio Context resume failed during preload", e);
        }
    }
    return Promise.resolve();
  }

  public setMusicMuted(muted: boolean) {
      this.isMusicMuted = muted;
      
      // Update AI Audio volume if exists
      if (this.aiAudio) {
          if (muted) {
              this.aiAudio.volume = 0;
              this.aiAudio.pause();
              this.aiMusicState.status = 'paused';
              this.notifyAiMusic();
          } else {
              this.aiAudio.volume = 0.6;
              this.aiAudio.play().catch(() => {});
              this.aiMusicState.status = 'playing';
              this.notifyAiMusic();
          }
      }

      if (this.musicBus && this.ctx) {
          // Instant mute, smooth unmute
          const time = this.ctx.currentTime;
          if (muted) {
              this.musicBus.gain.setValueAtTime(0, time);
              // Kill the loop to save CPU and ensure clean restart (immediate stop)
              this.stopMusic(true);
          } else {
              this.musicBus.gain.setValueAtTime(0, time);
              this.musicBus.gain.linearRampToValueAtTime(0.5, time + 0.3);
              
              // Only start procedural music if AI music is not playing/loaded
              const isAiMusicActive = this.aiAudio && !this.aiAudio.paused;
              if (!this.musicRunning && !isAiMusicActive) {
                  this.startMusic();
              }
          }
      }
  }

  public setSfxMuted(muted: boolean) {
      this.isSfxMuted = muted;
      if (this.sfxBus && this.ctx) {
          this.sfxBus.gain.setValueAtTime(muted ? 0 : 0.5, this.ctx.currentTime);
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
      for(let i=0; i<16; i+=4) this.patterns.kick[i] = true; // 4/4 base
      if (Math.random() > 0.5) this.patterns.kick[14] = true; // Syncopation

      // Hats: 16ths or 8ths
      this.patterns.hat = new Array(16).fill(false);
      for(let i=2; i<16; i+=4) this.patterns.hat[i] = true; // Offbeat open
      if (this.context.intensity > 0.6) {
           for(let i=0; i<16; i+=2) if (!this.patterns.hat[i]) this.patterns.hat[i] = Math.random() > 0.7; // 8th fill
      }

      // Bass: Follows Root of current chord usually
      this.patterns.bass = new Array(16).fill(-1);
      this.patterns.bass[0] = 0; // Root on 1
      this.patterns.bass[10] = 0; // Root on 3.5
      if (Math.random() > 0.5) this.patterns.bass[14] = 4; // Fifth on end

      // Arp: Clean, melodic arpeggiator walks based on the current scale flavor
      this.patterns.arp = new Array(16).fill(-1);
      for(let i=0; i<16; i++) {
          if (i % 2 === 1 && Math.random() > 0.4) {
              // Pluck on syncopated 16th steps
              const scaleSteps = [0, 2, 4, 7, 9, 11]; // Pentatonic highlights
              this.patterns.arp[i] = scaleSteps[Math.floor(Math.random() * scaleSteps.length)];
          }
      }

      // Lead Melody hook: Memorable pentatonic syncopated riffs that loop and give structure
      this.patterns.lead = new Array(16).fill(-1);
      if (Math.random() > 0.2) {
          const pentatonicDegrees = [0, 2, 4, 5, 7, 9, 11];
          const hookNotes = [
              pentatonicDegrees[Math.floor(Math.random() * pentatonicDegrees.length)],
              pentatonicDegrees[Math.floor(Math.random() * pentatonicDegrees.length)],
              pentatonicDegrees[Math.floor(Math.random() * pentatonicDegrees.length)],
              pentatonicDegrees[Math.floor(Math.random() * pentatonicDegrees.length)]
          ];

          // Place them rhythmically at syncopated placements for high catchiness
          const rhythmicPlacements = [0, 3, 6, 8, 11, 14];
          rhythmicPlacements.forEach((step, idx) => {
              if (Math.random() > 0.2) {
                  this.patterns.lead[step] = hookNotes[idx % hookNotes.length];
              }
          });
      }
  }

  // --- AUDIO SCHEDULER ---

  public startMusic() {
      // If AI music is active or playing, do not start procedural music
      const isAiMusicActive = this.aiAudio && !this.aiAudio.paused;
      if (isAiMusicActive) return;

      // Cancel any pending lazy stop
      if (this.stopTimerID !== null) {
          window.clearTimeout(this.stopTimerID);
          this.stopTimerID = null;
      }

      this.init();
      if (!this.ctx || this.isMusicMuted) return;
      
      // If already running, do NOT restart/regenerate or start a new scheduler
      if (this.musicRunning) {
          if (this.ctx.state === 'suspended') {
              this.ctx.resume().catch(e => console.error("Could not resume audio context", e));
          }
          return;
      }
      
      // If we are resetting completely, gen new track
      if (this.arrangementState.totalBars === 0) {
          this.regenerateComposition();
      }
      
      this.musicRunning = true;
      this.schedulerId++; // Increment ID so pending timeouts from old loops cancel themselves
      const currentId = this.schedulerId;

      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.current16thNote = 0;
      
      this.scheduler(currentId);
  }

  public stopMusic(immediate: boolean = false) {
      if (this.stopTimerID !== null) {
          window.clearTimeout(this.stopTimerID);
          this.stopTimerID = null;
      }

      const triggerStop = () => {
          this.musicRunning = false;
          this.schedulerId++; // Invalidate any pending loops
          if (this.timerID !== null) {
              window.clearTimeout(this.timerID);
              this.timerID = null;
          }
          this.stopTimerID = null;
      };

      if (immediate) {
          triggerStop();
      } else {
          this.stopTimerID = window.setTimeout(triggerStop, 350);
      }
  }

  private scheduler(runId: number) {
      // Must verify musicRunning state AND runId to handle race conditions
      if (!this.musicRunning || !this.ctx || runId !== this.schedulerId) return;

      while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
          this.scheduleNote(this.current16thNote, this.nextNoteTime);
          this.nextNoteTime += 0.25 * 60.0 / this.context.bpm; // Add quarter note / 4
          this.current16thNote++;
          if (this.current16thNote === 16) {
              this.current16thNote = 0;
              this.handleBarChange();
          }
      }
      this.timerID = window.setTimeout(() => this.scheduler(runId), this.lookahead);
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
      if (this.isMusicMuted) return;

      const sect = this.arrangementState.section;

      // 1. KICK (Punchy)
      if ((sect === Section.MAIN || (sect === Section.BUILD && beatNumber % 2 === 0))) {
          if (this.patterns.kick[beatNumber]) {
              this.triggerKick(time);
          }
      }

      // 2. BASS (FM Synthesis)
      if (sect === Section.MAIN || (sect === Section.BUILD && this.arrangementState.barCount > 2)) {
          const bassNote = this.patterns.bass[beatNumber];
          if (bassNote !== -1) {
              const chord = this.context.chordProgression[this.context.currentChordIndex];
              const degree = chord[0]; 
              const freq = this.getFreq(degree, 0); // Bass octave 0
              this.triggerFMBass(time, freq);
          }
      }

      // 3. PAD (Atmospheric Chords)
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
      if (sect !== Section.BUILD) {
          const arpDegree = this.patterns.arp[beatNumber];
          if (arpDegree !== -1) {
              const freq = this.getFreq(arpDegree, 3); // High octave
              this.triggerArp(time, freq);
          }
      }

      // 6. LEAD MELODY (Memorable vocal-like synth hook)
      if (sect === Section.MAIN || sect === Section.BREAKDOWN) {
          const leadDegree = this.patterns.lead[beatNumber];
          if (leadDegree !== -1) {
              const freq = this.getFreq(leadDegree, 3); // Singing register
              const stepDuration = (60 / this.context.bpm) * 0.25;
              this.triggerLeadSynth(time, freq, stepDuration * 1.6);
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
      
      // Punchy sub body sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.15);
      
      gain.gain.setValueAtTime(1.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      // Attack Transient Click Layer
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1100, time);
      clickOsc.frequency.exponentialRampToValueAtTime(110, time + 0.025);
      
      clickGain.gain.setValueAtTime(0.45, time);
      clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

      osc.connect(gain);
      clickOsc.connect(clickGain);
      
      gain.connect(this.musicBus);
      clickGain.connect(this.musicBus);
      
      osc.start(time);
      clickOsc.start(time);
      
      osc.stop(time + 0.25);
      clickOsc.stop(time + 0.04);
      
      osc.onended = () => { 
          osc.disconnect(); 
          gain.disconnect(); 
          clickOsc.disconnect(); 
          clickGain.disconnect(); 
      };
  }

  private triggerFMBass(time: number, freq: number) {
      if (!this.ctx || !this.musicBus) return;
      
      // Carrier - rich sawtooth waves
      const car = this.ctx.createOscillator();
      car.type = 'sawtooth';
      car.frequency.value = freq;

      // Modulator - sine wave harmonizer
      const mod = this.ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.value = freq * 2.0;
      
      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(260, time); 
      modGain.gain.exponentialRampToValueAtTime(1, time + 0.26);

      mod.connect(modGain);
      modGain.connect(car.frequency);

      // Dynamic Filter sweep for fat analog "wub" shape
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 3.5;
      filter.frequency.setValueAtTime(freq * 1.6, time);
      filter.frequency.exponentialRampToValueAtTime(freq * 0.75, time + 0.24);

      // Amp Envelope
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(0, time);
      amp.gain.linearRampToValueAtTime(0.42, time + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

      car.connect(filter);
      filter.connect(amp);
      amp.connect(this.musicBus);

      car.start(time);
      mod.start(time);
      car.stop(time + 0.3);
      mod.stop(time + 0.3);
      
      car.onended = () => { 
          car.disconnect(); 
          mod.disconnect(); 
          modGain.disconnect(); 
          amp.disconnect(); 
          filter.disconnect(); 
      };
  }

  private triggerPadChord(time: number, chordDegrees: number[]) {
      if (!this.ctx || !this.musicBus) return;

      const attack = 1.6;
      const release = 1.6;
      const dur = (60 / this.context.bpm) * 4; // 1 bar

      chordDegrees.forEach((deg, _i) => {
          const freq = this.getFreq(deg, 2); // Mid range
          
          const osc1 = this.ctx!.createOscillator();
          osc1.type = 'sawtooth';
          osc1.frequency.value = freq;
          osc1.detune.value = -12 + (Math.random() * 24);

          const osc2 = this.ctx!.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.value = freq * 0.5; // sub octave warm layer
          osc2.detune.value = -6 + (Math.random() * 12);

          const filter = this.ctx!.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 350 + (Math.random() * 150);
          filter.Q.value = 1.6;

          // Slow organic filter breathing
          const lfo = this.ctx!.createOscillator();
          lfo.frequency.value = 0.16;
          const lfoGain = this.ctx!.createGain();
          lfoGain.gain.value = 160;
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);

          // Simulated rhythmic Sidechain Pumping synced to the 4/4 beats
          const tremolo = this.ctx!.createGain();
          const beatDur = 60 / this.context.bpm;
          for (let b = 0; b < 4; b++) {
              const pumpTime = time + (b * beatDur);
              tremolo.gain.setValueAtTime(0.35, pumpTime);
              tremolo.gain.linearRampToValueAtTime(1.0, pumpTime + (beatDur * 0.42));
              tremolo.gain.setValueAtTime(1.0, pumpTime + beatDur - 0.02);
          }

          const gain = this.ctx!.createGain();
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.05, time + attack);
          gain.gain.setValueAtTime(0.05, time + dur - release);
          gain.gain.linearRampToValueAtTime(0, time + dur);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(tremolo);
          tremolo.connect(gain);
          
          if (this.reverbNode) gain.connect(this.reverbNode);
          else gain.connect(this.musicBus!);

          osc1.start(time);
          osc2.start(time);
          lfo.start(time);
          
          const stopTime = time + dur + 0.1;
          osc1.stop(stopTime);
          osc2.stop(stopTime);
          lfo.stop(stopTime);
          
          osc1.onended = () => { 
              osc1.disconnect(); 
              osc2.disconnect(); 
              lfo.disconnect(); 
              lfoGain.disconnect(); 
              filter.disconnect(); 
              tremolo.disconnect();
              gain.disconnect(); 
          };
      });
  }

  private triggerArp(time: number, freq: number) {
      if (!this.ctx || !this.musicBus) return;

      // FM Bell synthesis
      const car = this.ctx.createOscillator();
      car.type = 'sine';
      car.frequency.value = freq;

      const mod = this.ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.value = freq * 3.5; // crystalline harmonic chime ratio

      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(300, time);
      modGain.gain.exponentialRampToValueAtTime(1, time + 0.1);

      mod.connect(modGain);
      modGain.connect(car.frequency);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.07, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      car.connect(gain);
      if (this.delayNode) gain.connect(this.delayNode);
      if (this.reverbNode) gain.connect(this.reverbNode);
      gain.connect(this.musicBus);

      car.start(time);
      mod.start(time);
      car.stop(time + 0.2);
      mod.stop(time + 0.2);
      
      car.onended = () => { 
          car.disconnect(); 
          mod.disconnect(); 
          modGain.disconnect(); 
          gain.disconnect(); 
      };
  }

  private triggerLeadSynth(time: number, freq: number, duration: number) {
      if (!this.ctx || !this.musicBus) return;

      // EXPRESSIVE SOLO LEAD SYNTH
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      // Melodic pitch vibrato (6Hz)
      const vibrato = this.ctx.createOscillator();
      vibrato.frequency.value = 6.2;
      const vibratoGain = this.ctx.createGain();
      vibratoGain.gain.value = 4.5;
      
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.09, time + 0.04);
      gain.gain.setValueAtTime(0.09, time + duration - 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      if (this.delayNode) gain.connect(this.delayNode);
      if (this.reverbNode) gain.connect(this.reverbNode);
      gain.connect(this.musicBus);

      osc.start(time);
      vibrato.start(time);
      osc.stop(time + duration + 0.05);
      vibrato.stop(time + duration + 0.05);

      osc.onended = () => {
          osc.disconnect();
          vibrato.disconnect();
          vibratoGain.disconnect();
          gain.disconnect();
      };
  }

  private triggerHat(time: number, accent: boolean) {
      if (!this.ctx || !this.musicBus) return;
      
      // Pristine TR-808 style metallic synthesized high-hats
      const oscs: OscillatorNode[] = [];
      const gain = this.ctx.createGain();
      const freqs = [3900, 5100, 6700, 8400, 10300];
      
      freqs.forEach(f => {
          const osc = this.ctx!.createOscillator();
          osc.type = 'square';
          osc.frequency.value = f;
          osc.connect(gain);
          oscs.push(osc);
      });

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7600;
      filter.Q.value = 1.6;

      gain.connect(filter);
      filter.connect(this.musicBus);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(accent ? 0.075 : 0.028, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + (accent ? 0.07 : 0.035));

      oscs.forEach(osc => osc.start(time));
      oscs.forEach(osc => osc.stop(time + (accent ? 0.08 : 0.04)));

      oscs[0].onended = () => {
          oscs.forEach(osc => osc.disconnect());
          gain.disconnect();
          filter.disconnect();
      };
  }

  // --- SFX METHODS ---
  public play(type: SoundType) {
    if (this.isSfxMuted) return;
    this.init();
    if (!this.ctx || !this.sfxBus) return;
    
    const t = this.ctx.currentTime;
    
    const playOsc = (freq: number, type: OscillatorType, dur: number, vol: number, startTime: number = t) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        g.gain.setValueAtTime(vol, startTime);
        g.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
        osc.connect(g);
        g.connect(this.sfxBus!);
        osc.start(startTime);
        osc.stop(startTime + dur);
        
        osc.onended = () => { osc.disconnect(); g.disconnect(); };
    };

    switch (type) {
      case 'UI_CLICK': {
          // Dual frequency organic tick
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
          
          osc1.connect(g);
          osc2.connect(g);
          g.connect(this.sfxBus);
          
          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.06);
          osc2.stop(t + 0.06);
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
          
          osc.connect(g);
          g.connect(this.sfxBus);
          osc.start(t);
          osc.stop(t + 0.05);
          break;
      }
      case 'ERROR': {
          // Low grit warning buzzer
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
          
          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(g);
          g.connect(this.sfxBus);
          
          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.26);
          osc2.stop(t + 0.26);
          break;
      }
      case 'SUCCESS': {
          // Celestial major arpeggio riser
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
              
              osc.connect(g);
              if (this.reverbNode) g.connect(this.reverbNode);
              else g.connect(this.sfxBus!);
              
              osc.start(noteTime);
              osc.stop(noteTime + 0.26);
          });
          break;
      }
      case 'COIN': {
          // Pristine high-tech crystalline credit double-chirp
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
          
          osc1.connect(g);
          osc2.connect(g);
          if (this.reverbNode) g.connect(this.reverbNode);
          else g.connect(this.sfxBus);
          
          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.36);
          osc2.stop(t + 0.36);
          break;
      }
      case 'MOVE': 
        if (this.whiteNoiseBuffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = this.whiteNoiseBuffer;
            const f = this.ctx.createBiquadFilter();
            f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(100, t+0.1);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.1, t); g.gain.linearRampToValueAtTime(0, t+0.1);
            src.connect(f); f.connect(g); g.connect(this.sfxBus); 
            src.start(t);
            src.stop(t + 0.1);
            src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
        }
        break;
      case 'LEVEL_UP':
         playOsc(440, 'triangle', 0.6, 0.1, t);
         playOsc(880, 'triangle', 0.6, 0.1, t + 0.2);
         break;
      case 'COLLAPSE': playOsc(60, 'sawtooth', 0.6, 0.3); break;
      case 'CRACK': playOsc(300, 'square', 0.05, 0.2); break;
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
              
              noise.connect(filter);
              filter.connect(gain);
              gain.connect(this.sfxBus);
              noise.start(t);
              noise.stop(t + 0.5);
              noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
          }
          break;
      }
      case 'TELEPORT': {
         const oscBeam = this.ctx.createOscillator();
         const gainBeam = this.ctx.createGain();
         
         oscBeam.type = 'triangle';
         oscBeam.frequency.setValueAtTime(150, t);
         oscBeam.frequency.exponentialRampToValueAtTime(1800, t + 0.7);
         
         gainBeam.gain.setValueAtTime(0, t);
         gainBeam.gain.linearRampToValueAtTime(0.2, t + 0.15);
         gainBeam.gain.exponentialRampToValueAtTime(0.001, t + 0.82);
         
         const mod = this.ctx.createOscillator();
         mod.frequency.value = 50;
         const modGain = this.ctx.createGain();
         modGain.gain.value = 80;
         mod.connect(modGain);
         modGain.connect(oscBeam.frequency);
         
         oscBeam.connect(gainBeam);
         gainBeam.connect(this.sfxBus);
         
         oscBeam.start(t);
         mod.start(t);
         oscBeam.stop(t + 0.82);
         mod.stop(t + 0.82);
         oscBeam.onended = () => { oscBeam.disconnect(); mod.disconnect(); modGain.disconnect(); gainBeam.disconnect(); };
         
         const chimes = [1046.50, 1318.51, 1567.98, 2093.00];
         chimes.forEach((freq, index) => {
             const chimTime = t + 0.2 + (index * 0.1);
             const oscC = this.ctx!.createOscillator();
             const gainC = this.ctx!.createGain();
             oscC.type = 'sine';
             oscC.frequency.setValueAtTime(freq, chimTime);
             
             gainC.gain.setValueAtTime(0, chimTime);
             gainC.gain.linearRampToValueAtTime(0.12, chimTime + 0.02);
             gainC.gain.exponentialRampToValueAtTime(0.001, chimTime + 0.45);
             
             oscC.connect(gainC);
             if (this.reverbNode) {
                 gainC.connect(this.reverbNode);
             } else {
                 gainC.connect(this.sfxBus!);
             }
             
             oscC.start(chimTime);
             oscC.stop(chimTime + 0.5);
             oscC.onended = () => { oscC.disconnect(); gainC.disconnect(); };
         });
         break;
      }
      case 'JACKPOT': {
         // Grand Casino Jackpot Fanfare Chime with crystalline shimmer
         const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C Major Triad across octaves
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
             
             osc.connect(g);
             if (this.reverbNode) g.connect(this.reverbNode);
             else g.connect(this.sfxBus!);
             
             osc.start(noteTime);
             osc.stop(noteTime + 0.52);
         });
         
         // High-pitched shimmering sparkles
         const sparkles = [2093.00, 2637.02, 3135.96, 4186.01, 5274.04];
         sparkles.forEach((freq, idx) => {
             const noteTime = t + 0.25 + (idx * 0.05);
             const osc = this.ctx!.createOscillator();
             const g = this.ctx!.createGain();
             osc.type = 'sine';
             osc.frequency.setValueAtTime(freq, noteTime);
             g.gain.setValueAtTime(0, noteTime);
             g.gain.linearRampToValueAtTime(0.08, noteTime + 0.01);
             g.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);
             
             osc.connect(g);
             if (this.reverbNode) g.connect(this.reverbNode);
             else g.connect(this.sfxBus!);
             
             osc.start(noteTime);
             osc.stop(noteTime + 0.36);
         });
         break;
      }
    }
  }

  public startPortalHum() {
      if (this.isSfxMuted) return;
      this.init();
      if (!this.ctx || !this.sfxBus) return;
      
      this.stopPortalHum();
      
      const t = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 65.41;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 4;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 60;
      
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 1.2);
      
      osc1.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus);
      
      osc1.start(t);
      lfo.start(t);
      
      this.portalHumNode = { osc: osc1, lfo: lfo, filter, lfoGain, gain };
  }
  
  public stopPortalHum() {
      if (this.portalHumNode) {
          try {
              const { osc, lfo, gain } = this.portalHumNode;
              if (this.ctx) {
                  const t = this.ctx.currentTime;
                  gain.gain.cancelScheduledValues(t);
                  gain.gain.setValueAtTime(gain.gain.value, t);
                  gain.gain.linearRampToValueAtTime(0, t + 0.3);
                  setTimeout(() => {
                      try {
                          osc.stop();
                          lfo.stop();
                          osc.disconnect();
                          lfo.disconnect();
                          gain.disconnect();
                      } catch (e) { /* empty */ }
                  }, 400);
              } else {
                  osc.stop();
                  lfo.stop();
                  osc.disconnect();
                  lfo.disconnect();
                  gain.disconnect();
              }
          } catch (e) {
              console.error("Error stopping portal hum", e);
          }
          this.portalHumNode = null;
      }
  }

  // --- AI GENERATIVE MUSIC (LYRIA INTEGRATION) ---

  public subscribeAiMusic(listener: (state: any) => void) {
      this.aiMusicListeners.push(listener);
      // Immediately notify
      listener({ ...this.aiMusicState });
      return () => {
          this.aiMusicListeners = this.aiMusicListeners.filter(l => l !== listener);
      };
  }

  private notifyAiMusic() {
      this.aiMusicListeners.forEach(l => l({ ...this.aiMusicState }));
  }

  public getAiMusicState() {
      return { ...this.aiMusicState };
  }

  public async generateAiMusic(prompt: string, length: 'clip' | 'pro' = 'clip') {
      this.aiMusicState.status = 'generating';
      this.aiMusicState.prompt = prompt;
      this.aiMusicState.length = length;
      this.aiMusicState.error = '';
      this.notifyAiMusic();

      // Pause regular music if running
      const wasProceduralRunning = this.musicRunning;
      if (wasProceduralRunning) {
          this.stopMusic(true);
      }

      // Stop any existing AI Audio
      this.stopAiMusic();

      try {
          const response = await fetch('/api/music', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, length })
          });

          if (!response.ok) {
              const errData = await response.json().catch(() => ({ error: 'Unknown server error' }));
              throw new Error(errData.error || `HTTP error ${response.status}`);
          }

          const data = await response.json();
          const { audioBase64, lyrics, mimeType } = data;

          if (!audioBase64) {
              throw new Error("No audio data returned from the server.");
          }

          // Decode base64 to Blob URL
          const binary = atob(audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mimeType });
          const audioUrl = URL.createObjectURL(blob);

          this.aiAudio = new Audio(audioUrl);
          this.aiAudio.loop = true;
          this.aiAudio.volume = this.isMusicMuted ? 0 : 0.6;

          this.aiAudio.onplay = () => {
              this.aiMusicState.status = 'playing';
              this.notifyAiMusic();
          };

          this.aiAudio.onpause = () => {
              this.aiMusicState.status = 'paused';
              this.notifyAiMusic();
          };

          this.aiAudio.onerror = (e) => {
              console.error("AI Audio element playback error", e);
              this.aiMusicState.status = 'error';
              this.aiMusicState.error = 'Playback failed';
              this.notifyAiMusic();
          };

          this.aiAudio.onended = () => {
              this.aiMusicState.status = 'idle';
              this.notifyAiMusic();
          };

          this.aiMusicState.lyrics = lyrics || '';
          this.aiMusicState.status = 'playing';
          this.notifyAiMusic();

          await this.aiAudio.play();

      } catch (err: any) {
          console.error("AI Music generation failed:", err);
          this.aiMusicState.status = 'error';
          this.aiMusicState.error = err.message || "Failed to generate AI music";
          this.notifyAiMusic();

          // Resume procedural music if it was running before
          if (wasProceduralRunning && !this.isMusicMuted) {
              this.startMusic();
          }
      }
  }

  public playAiMusic() {
      if (this.aiAudio) {
          // Stop procedural music
          this.stopMusic(true);
          
          this.aiAudio.volume = this.isMusicMuted ? 0 : 0.6;
          this.aiAudio.play()
              .then(() => {
                  this.aiMusicState.status = 'playing';
                  this.notifyAiMusic();
              })
              .catch(err => {
                  console.error("Failed to play AI music", err);
              });
      }
  }

  public pauseAiMusic() {
      if (this.aiAudio) {
          this.aiAudio.pause();
          this.aiMusicState.status = 'paused';
          this.notifyAiMusic();
      }
  }

  public stopAiMusic() {
      if (this.aiAudio) {
          this.aiAudio.pause();
          this.aiAudio.src = '';
          this.aiAudio = null;
      }
      this.aiMusicState.status = 'idle';
      this.notifyAiMusic();
  }
}

export const audioService = new AudioService();
