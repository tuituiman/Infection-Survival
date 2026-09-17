/**
 * audio.js - Web Audio API Procedural Sound Synthesizer
 * Provides atmospheric sounds and disease effects without needing external audio files.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
    this.masterGain = null;
    this.ambientGain = null;
    this.isMuffled = false; // When suffering from Streptococcus suis (หูดับ)
    
    // Ambient loops
    this.rainNode = null;
    this.mosquitoOsc = null;
    this.mosquitoGain = null;
    this.tinnitusOsc = null;
    this.tinnitusGain = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output filter & gain
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 20000; // Normal un-muffled

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.2;
      this.ambientGain.connect(this.filterNode);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not supported or failed to initialize', e);
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.enabled ? 0.5 : 0, this.ctx.currentTime);
    }
    return this.enabled;
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Footstep sound ---
  playFootstep(inWater = false) {
    if (!this.enabled || !this.initialized) return;
    try {
      const now = this.ctx.currentTime;
      if (inWater) {
        // Water splash footstep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.filterNode);

        osc.start(now);
        osc.stop(now + 0.12);
      } else {
        // Normal ground tap
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.filterNode);

        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {}
  }

  // --- UI Click / Item Pickup ---
  playChime(pitch = 520) {
    if (!this.enabled || !this.initialized) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.filterNode);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  // --- Eat / Drink Sound ---
  playConsume(isDrink = false) {
    if (!this.enabled || !this.initialized) return;
    try {
      const now = this.ctx.currentTime;
      if (isDrink) {
        // Gulp
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.filterNode);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        // Crunch
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.filterNode);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (e) {}
  }

  // --- Sizzle / Boil / Craft ---
  playSizzle() {
    if (!this.enabled || !this.initialized) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2200;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.filterNode);

      noise.start();
    } catch (e) {}
  }

  // --- Heartbeat pulse (when HP is low or severe fever) ---
  playHeartbeat() {
    if (!this.enabled || !this.initialized) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      osc.connect(gain);
      gain.connect(this.filterNode);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
  }

  // --- Mosquito Swarm Proximity Sound (High pitch intermittent buzz) ---
  setMosquitoBuzz(proximityIntensity) { // 0 to 1
    if (!this.enabled || !this.initialized) return;
    try {
      const now = this.ctx.currentTime;
      if (proximityIntensity > 0.05) {
        if (!this.mosquitoOsc) {
          this.mosquitoOsc = this.ctx.createOscillator();
          this.mosquitoOsc.type = 'sawtooth';
          this.mosquitoOsc.frequency.value = 680; // High mosquito whine

          // Modulator for jitter
          this.mosquitoLfo = this.ctx.createOscillator();
          this.mosquitoLfo.frequency.value = 14;
          const lfoGain = this.ctx.createGain();
          lfoGain.gain.value = 80;
          this.mosquitoLfo.connect(this.mosquitoOsc.frequency);
          this.mosquitoLfo.start();

          this.mosquitoGain = this.ctx.createGain();
          this.mosquitoGain.gain.value = 0;

          this.mosquitoOsc.connect(this.mosquitoGain);
          this.mosquitoGain.connect(this.filterNode);
          this.mosquitoOsc.start();
        }
        const targetGain = Math.min(0.18, proximityIntensity * 0.15);
        this.mosquitoGain.gain.setTargetAtTime(targetGain, now, 0.1);
      } else if (this.mosquitoGain) {
        this.mosquitoGain.gain.setTargetAtTime(0, now, 0.2);
      }
    } catch (e) {}
  }

  // --- Streptococcus suis effect: Tinnitus (Ear Ringing) & Sound Muffling (หูหนวก/หูดับ) ---
  setHearingLoss(hasHearingLoss) {
    if (!this.initialized) return;
    try {
      const now = this.ctx.currentTime;
      if (hasHearingLoss) {
        // Muffle all external sounds heavily via low-pass filter (simulate deafness)
        this.filterNode.frequency.setTargetAtTime(450, now, 0.2);

        // Start high-pitch tinnitus tone
        if (!this.tinnitusOsc) {
          this.tinnitusOsc = this.ctx.createOscillator();
          this.tinnitusOsc.type = 'sine';
          this.tinnitusOsc.frequency.value = 3800; // Ringing 3.8kHz

          this.tinnitusGain = this.ctx.createGain();
          this.tinnitusGain.gain.value = 0;

          this.tinnitusOsc.connect(this.tinnitusGain);
          // Connect directly to masterGain so it bypasses the muffle filter!
          this.tinnitusGain.connect(this.masterGain);
          this.tinnitusOsc.start();
        }
        this.tinnitusGain.gain.setTargetAtTime(0.18, now, 0.3);
      } else {
        // Restore hearing
        this.filterNode.frequency.setTargetAtTime(20000, now, 0.5);
        if (this.tinnitusGain) {
          this.tinnitusGain.gain.setTargetAtTime(0, now, 0.3);
        }
      }
    } catch (e) {}
  }

  // --- Rain Ambient Loop ---
  setRainAmbient(isRaining) {
    if (!this.initialized) return;
    try {
      const now = this.ctx.currentTime;
      if (isRaining && !this.rainNode) {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.2;
        }

        this.rainNode = this.ctx.createBufferSource();
        this.rainNode.buffer = buffer;
        this.rainNode.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;

        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.value = 0;

        this.rainNode.connect(filter);
        filter.connect(this.rainGain);
        this.rainGain.connect(this.ambientGain);

        this.rainNode.start();
        this.rainGain.gain.setTargetAtTime(0.22, now, 1.0);
      } else if (!isRaining && this.rainGain) {
        this.rainGain.gain.setTargetAtTime(0, now, 0.8);
      }
    } catch (e) {}
  }
}

// Global Sound Instance
window.soundManager = new SoundManager();
