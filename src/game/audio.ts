import { PowerUpType } from './rules';

class ChiptuneAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private bgmPlaying: boolean = false;
  private isBossMode: boolean = false;
  private bgmStep: number = 0;
  private bgmTimerId: number | null = null;
  private lastHeatWarningTime: number = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (mute) {
      this.stopMusic();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 0.12,
    freqEnd?: number,
    delay: number = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public playPaddleHit(zone: 'centre' | 'left' | 'right'): void {
    if (zone === 'centre') {
      // Cool, controlled centre catch
      this.playTone(440, 0.07, 'triangle', 0.14, 587.33);
      this.playTone(880, 0.05, 'sine', 0.08, 1046.5, 0.02);
    } else {
      // Hot edge deflection
      this.playTone(260, 0.08, 'sawtooth', 0.13, 390);
      this.playTone(520, 0.06, 'square', 0.09, 310, 0.02);
    }
  }

  public playBrickHit(combo: number, destroyed: boolean, indestructible: boolean = false): void {
    if (indestructible) {
      this.playTone(150, 0.06, 'triangle', 0.12, 110);
      return;
    }
    // Pitch rises with combo
    const semitoneOffset = Math.min(18, combo);
    const baseFreq = 330 * Math.pow(2, semitoneOffset / 12);
    if (destroyed) {
      this.playTone(baseFreq, 0.09, 'square', 0.13, baseFreq * 1.35);
      this.playTone(baseFreq * 1.5, 0.07, 'triangle', 0.08, baseFreq * 2, 0.03);
    } else {
      this.playTone(baseFreq * 0.85, 0.06, 'square', 0.11, baseFreq);
    }
  }

  public playPowerUp(type: PowerUpType): void {
    if (type === 'AFTER_HOURS') {
      // Classic dual-tone emergency telephone ring!
      for (let i = 0; i < 6; i++) {
        this.playTone(880, 0.045, 'square', 0.14, 987.77, i * 0.055);
        this.playTone(1174.66, 0.045, 'square', 0.12, 1318.5, i * 0.055 + 0.025);
      }
      return;
    }
    if (type === 'COOLING') {
      // Frosty descending crystalline chime
      this.playTone(1046.5, 0.08, 'triangle', 0.15, 783.99, 0);
      this.playTone(1318.5, 0.1, 'sine', 0.15, 523.25, 0.06);
      this.playTone(1567.98, 0.14, 'triangle', 0.12, 659.25, 0.12);
      return;
    }
    // Standard arcade power-up arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.07, 'square', 0.12, n * 1.05, idx * 0.055);
    });
  }

  public playBossTelegraph(): void {
    this.playTone(190, 0.18, 'sawtooth', 0.08, 420);
  }

  public playBossZap(): void {
    this.playTone(720, 0.14, 'sawtooth', 0.14, 140);
    this.playTone(480, 0.11, 'square', 0.1, 95, 0.03);
  }

  public playZapHitPlayer(): void {
    this.playTone(180, 0.18, 'sawtooth', 0.18, 75);
    this.playTone(310, 0.15, 'square', 0.15, 90, 0.04);
  }

  public playHeatWarningBuzzer(nowMs: number): void {
    if (nowMs - this.lastHeatWarningTime < 550) return;
    this.lastHeatWarningTime = nowMs;
    this.playTone(880, 0.07, 'sawtooth', 0.09, 620, 0);
    this.playTone(880, 0.07, 'sawtooth', 0.09, 620, 0.11);
  }

  public playFuseBlowGlassShatter(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    // White noise burst + high-pitched crystalline glass shards + low sub boom
    const bufferSize = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.26, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    // Glass tinkle shards
    const shardFreqs = [2100, 2750, 1850, 3200, 1560, 2420];
    shardFreqs.forEach((f, idx) => {
      this.playTone(f, 0.055, 'triangle', 0.11, f * 0.72, idx * 0.045);
    });

    // Low electrical arc pop
    this.playTone(130, 0.28, 'sawtooth', 0.2, 42, 0);
  }

  public playLevelClearJingle(): void {
    const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const durations = [0.09, 0.09, 0.09, 0.16, 0.09, 0.28];
    let offset = 0;
    melody.forEach((freq, i) => {
      this.playTone(freq, durations[i], 'square', 0.13, freq * 1.01, offset);
      this.playTone(freq * 0.5, durations[i], 'triangle', 0.1, freq * 0.5, offset);
      offset += durations[i] + 0.02;
    });
  }

  public playVictoryJingle(): void {
    const notes = [440, 554.37, 659.25, 880, 659.25, 880, 1108.73, 1318.5];
    notes.forEach((n, i) => {
      const dur = i === notes.length - 1 ? 0.36 : 0.1;
      this.playTone(n, dur, 'square', 0.14, n, i * 0.11);
      this.playTone(n * 0.5, dur, 'triangle', 0.1, n * 0.5, i * 0.11);
    });
  }

  public playGameOverJingle(): void {
    const notes = [392.0, 369.99, 349.23, 329.63, 261.63];
    notes.forEach((n, i) => {
      const dur = i === notes.length - 1 ? 0.35 : 0.14;
      this.playTone(n, dur, 'sawtooth', 0.12, n * 0.96, i * 0.15);
    });
  }

  public startMusic(bossMode: boolean): void {
    this.isBossMode = bossMode;
    if (this.muted) return;
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.bgmStep = 0;
    this.scheduleNextTick();
  }

  public setBossMusicMode(bossMode: boolean): void {
    this.isBossMode = bossMode;
  }

  public stopMusic(): void {
    this.bgmPlaying = false;
    if (this.bgmTimerId !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.bgmTimerId);
      this.bgmTimerId = null;
    }
  }

  private scheduleNextTick(): void {
    if (!this.bgmPlaying || this.muted || typeof window === 'undefined') return;

    const normalBass = [110, 110, 146.83, 110, 164.81, 146.83, 130.81, 98];
    const normalArp = [220, 329.63, 440, 329.63, 293.66, 440, 523.25, 392];

    const bossBass = [92.5, 92.5, 110, 92.5, 138.59, 123.47, 110, 87.31];
    const bossArp = [185, 277.18, 370, 440, 370, 277.18, 329.63, 246.94];

    const idx = this.bgmStep % 8;
    const bassFreq = this.isBossMode ? bossBass[idx] : normalBass[idx];
    const arpFreq = this.isBossMode ? bossArp[idx] : normalArp[idx];
    const stepMs = this.isBossMode ? 145 : 195;

    this.playTone(bassFreq, stepMs / 1000 * 0.75, 'triangle', 0.045);
    if (this.bgmStep % 2 === 0 || this.isBossMode) {
      this.playTone(arpFreq, stepMs / 1000 * 0.45, 'square', 0.025);
    }

    this.bgmStep++;
    this.bgmTimerId = window.setTimeout(() => this.scheduleNextTick(), stepMs);
  }
}

export const soundEngine = new ChiptuneAudioEngine();
