import { describe, expect, it } from 'vitest';
import { classifyPace, csvForSessions, sessionSummary, suggestedBand, type PaceSample, type SessionRecord } from '../src/pace';

describe('pace model', () => {
  it('labels quiet, slow, steady and fast samples without relying on color', () => {
    expect(classifyPace(0, false, 120, 150)).toBe('quiet');
    expect(classifyPace(105, true, 120, 150)).toBe('slow');
    expect(classifyPace(135, true, 120, 150)).toBe('steady');
    expect(classifyPace(165, true, 120, 150)).toBe('fast');
  });

  it('summarizes only speaking samples', () => {
    const samples: PaceSample[] = [
      { at: 0, wpm: 0, speaking: false, state: 'quiet' },
      { at: 1, wpm: 125, speaking: true, state: 'steady' },
      { at: 2, wpm: 145, speaking: true, state: 'steady' },
      { at: 3, wpm: 175, speaking: true, state: 'fast' },
      { at: 4, wpm: 110, speaking: true, state: 'slow' },
    ];
    expect(sessionSummary(samples, 120, 150)).toEqual({ inBandPercent: 50, averageWpm: 139 });
    expect(sessionSummary([], 120, 150)).toEqual({ inBandPercent: 0, averageWpm: 0 });
  });

  it('creates bounded baseline bands', () => {
    expect(suggestedBand(142)).toEqual([125, 155]);
    expect(suggestedBand(30)).toEqual([65, 95]);
    expect(suggestedBand(300)).toEqual([205, 235]);
  });

  it('exports session summaries to interoperable CSV', () => {
    const session: SessionRecord = { id: 'one', startedAt: '2026-08-28T00:00:00.000Z', durationSeconds: 30, targetLow: 120, targetHigh: 150, inBandPercent: 75, averageWpm: 138, samples: [] };
    const csv = csvForSessions([session]);
    expect(csv).toContain('session_id,started_at');
    expect(csv).toContain('one,2026-08-28T00:00:00.000Z,30,120,150,75,138');
  });
});
