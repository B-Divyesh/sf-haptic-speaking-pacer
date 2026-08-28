import { EnergyPaceEstimator } from './pace';

export interface AudioReading {
  speaking: boolean;
  wpm: number;
}

export class AudioPacer {
  private context?: AudioContext;
  private stream?: MediaStream;
  private frame?: number;
  private analyser?: AnalyserNode;
  private buffer?: Float32Array<ArrayBuffer>;
  private estimator = new EnergyPaceEstimator();

  async start(onReading: (reading: AudioReading) => void): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is not available in this browser.');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      video: false,
    });
    const AudioContextClass = window.AudioContext;
    this.context = new AudioContextClass({ latencyHint: 'interactive' });
    await this.context.resume();
    const source = this.context.createMediaStreamSource(this.stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.2;
    source.connect(this.analyser);
    this.buffer = new Float32Array(this.analyser.fftSize);

    let lastEmit = 0;
    const read = (time: number) => {
      if (!this.analyser || !this.buffer) return;
      this.analyser.getFloatTimeDomainData(this.buffer);
      let sum = 0;
      for (const value of this.buffer) sum += value * value;
      const reading = this.estimator.push(Math.sqrt(sum / this.buffer.length), time);
      if (time - lastEmit >= 500) {
        onReading({ speaking: reading.speaking, wpm: reading.wpm });
        lastEmit = time;
      }
      this.frame = requestAnimationFrame(read);
    };
    this.frame = requestAnimationFrame(read);
  }

  stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close();
    this.frame = undefined;
    this.stream = undefined;
    this.context = undefined;
  }
}
