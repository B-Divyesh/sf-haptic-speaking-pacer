export type PaceState = 'quiet' | 'slow' | 'steady' | 'fast';

export interface PaceSample {
  at: number;
  wpm: number;
  speaking: boolean;
  state: PaceState;
}

export interface SessionRecord {
  id: string;
  startedAt: string;
  durationSeconds: number;
  targetLow: number;
  targetHigh: number;
  inBandPercent: number;
  averageWpm: number;
  samples: PaceSample[];
}

export function classifyPace(wpm: number, speaking: boolean, low: number, high: number): PaceState {
  if (!speaking) return 'quiet';
  if (wpm < low) return 'slow';
  if (wpm > high) return 'fast';
  return 'steady';
}

export function sessionSummary(samples: PaceSample[], low: number, high: number) {
  const spoken = samples.filter((sample) => sample.speaking && sample.wpm > 0);
  if (!spoken.length) return { inBandPercent: 0, averageWpm: 0 };
  const inBand = spoken.filter((sample) => sample.wpm >= low && sample.wpm <= high).length;
  const average = spoken.reduce((sum, sample) => sum + sample.wpm, 0) / spoken.length;
  return {
    inBandPercent: Math.round((inBand / spoken.length) * 100),
    averageWpm: Math.round(average),
  };
}

export function suggestedBand(baseline: number): [number, number] {
  const center = Math.max(80, Math.min(220, Math.round(baseline / 5) * 5));
  return [Math.max(60, center - 15), Math.min(240, center + 15)];
}

export function csvForSessions(sessions: SessionRecord[]): string {
  const rows = ['session_id,started_at,seconds,target_low,target_high,in_band_percent,average_wpm'];
  for (const s of sessions) {
    rows.push([s.id, s.startedAt, s.durationSeconds, s.targetLow, s.targetHigh, s.inBandPercent, s.averageWpm].join(','));
  }
  return `${rows.join('\n')}\n`;
}

/**
 * Estimates word pace from vocal-energy pulses. It never receives or retains
 * microphone audio, only a single RMS energy number per animation frame.
 */
export class EnergyPaceEstimator {
  private noiseFloor = 0.008;
  private smoothed = 0;
  private previous = 0;
  private lastPeak = -Infinity;
  private recentPeaks: number[] = [];
  private activeUntil = 0;

  push(rms: number, nowMs: number): { speaking: boolean; wpm: number; pulse: boolean } {
    const safeRms = Number.isFinite(rms) ? Math.max(0, rms) : 0;
    this.smoothed = this.smoothed * 0.72 + safeRms * 0.28;
    const threshold = Math.max(0.014, this.noiseFloor * 2.35);
    const active = this.smoothed > threshold;
    if (!active) this.noiseFloor = this.noiseFloor * 0.995 + safeRms * 0.005;
    if (active) this.activeUntil = nowMs + 650;

    const rising = this.smoothed > this.previous * 1.055;
    const pulse = active && rising && this.smoothed > threshold * 1.12 && nowMs - this.lastPeak >= 185;
    if (pulse) {
      this.recentPeaks.push(nowMs);
      this.lastPeak = nowMs;
    }
    this.previous = this.smoothed;
    this.recentPeaks = this.recentPeaks.filter((time) => nowMs - time <= 12_000);

    const speaking = nowMs < this.activeUntil;
    if (!speaking || this.recentPeaks.length < 2) return { speaking, wpm: 0, pulse };
    const spanMinutes = Math.max((nowMs - this.recentPeaks[0]) / 60_000, 2 / 60);
    const syllablesPerMinute = this.recentPeaks.length / spanMinutes;
    const wpm = Math.round(Math.min(260, syllablesPerMinute / 1.62));
    return { speaking, wpm, pulse };
  }
}
