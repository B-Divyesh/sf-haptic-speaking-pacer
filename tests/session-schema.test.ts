import { describe, expect, it } from 'vitest';
import { sessionsFromImport, validateSessionRecords } from '../src/session-schema';
import type { SessionRecord } from '../src/pace';

const validSession: SessionRecord = {
  id: 'session_2026-08-28',
  startedAt: '2026-08-28T08:00:00.000Z',
  durationSeconds: 30,
  targetLow: 120,
  targetHigh: 150,
  inBandPercent: 50,
  averageWpm: 153,
  samples: [
    { at: 0, wpm: 135, speaking: true, state: 'steady' },
    { at: 1, wpm: 170, speaking: true, state: 'fast' },
  ],
};

describe('session import schema', () => {
  it('accepts native exports and raw session arrays', () => {
    expect(validateSessionRecords([validSession])).toEqual([validSession]);
    expect(sessionsFromImport({
      product: 'haptic-speaking-pacer',
      exportedAt: '2026-08-28T08:01:00.000Z',
      settings: { low: 120, high: 150, pattern: 'ridge' },
      sessions: [validSession],
    })).toEqual([validSession]);
  });

  it('rejects executable strings, missing fields and unknown fields', () => {
    expect(() => validateSessionRecords([{ ...validSession, averageWpm: '<img src=x onerror="window.__qaXss=1">' }])).toThrow('Invalid session record');
    expect(() => sessionsFromImport({ sessions: [{ id: 'only-id-and-samples', samples: [] }] })).toThrow('Invalid session record');
    expect(() => validateSessionRecords([{ ...validSession, unexpected: true }])).toThrow('Invalid session record');
  });

  it('rejects semantically inconsistent summaries and samples', () => {
    expect(() => validateSessionRecords([{ ...validSession, inBandPercent: 100 }])).toThrow('Invalid session record');
    expect(() => validateSessionRecords([{ ...validSession, samples: [{ at: 0, wpm: 170, speaking: true, state: 'steady' }] }])).toThrow('Invalid session record');
    expect(() => validateSessionRecords([validSession, validSession])).toThrow('Duplicate session identifier');
  });
});
