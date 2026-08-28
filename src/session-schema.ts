import { classifyPace, sessionSummary, type PaceSample, type PaceState, type SessionRecord } from './pace';

const SESSION_KEYS = ['averageWpm', 'durationSeconds', 'id', 'inBandPercent', 'samples', 'startedAt', 'targetHigh', 'targetLow'];
const SAMPLE_KEYS = ['at', 'speaking', 'state', 'wpm'];
const EXPORT_KEYS = new Set(['exportedAt', 'product', 'sessions', 'settings']);
const SETTINGS_KEYS = new Set(['baseline', 'high', 'low', 'pattern']);
const STATES = new Set<PaceState>(['quiet', 'slow', 'steady', 'fast']);
const PATTERNS = new Set(['ridge', 'double', 'triple']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 30) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isSample(value: unknown, low: number, high: number, duration: number): value is PaceSample {
  if (!isRecord(value) || !hasExactKeys(value, SAMPLE_KEYS)) return false;
  if (!isIntegerBetween(value.at, 0, duration) || !isIntegerBetween(value.wpm, 0, 260)) return false;
  if (typeof value.speaking !== 'boolean' || !STATES.has(value.state as PaceState)) return false;
  if (value.speaking !== (value.wpm > 0)) return false;
  return value.state === classifyPace(value.wpm, value.speaking, low, high);
}

export function isSessionRecord(value: unknown): value is SessionRecord {
  if (!isRecord(value) || !hasExactKeys(value, SESSION_KEYS)) return false;
  if (typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.id) || !isIsoDate(value.startedAt)) return false;
  if (!isIntegerBetween(value.durationSeconds, 1, 86_400)) return false;
  if (!isIntegerBetween(value.targetLow, 60, 210) || value.targetLow % 5 !== 0) return false;
  if (!isIntegerBetween(value.targetHigh, 75, 240) || value.targetHigh % 5 !== 0 || value.targetHigh - value.targetLow < 15) return false;
  if (!isIntegerBetween(value.inBandPercent, 0, 100) || !isIntegerBetween(value.averageWpm, 0, 260)) return false;
  if (!Array.isArray(value.samples) || value.samples.length > value.durationSeconds + 1) return false;

  let previousSecond = -1;
  for (const sample of value.samples) {
    if (!isSample(sample, value.targetLow, value.targetHigh, value.durationSeconds) || sample.at <= previousSecond) return false;
    previousSecond = sample.at;
  }

  const expected = sessionSummary(value.samples, value.targetLow, value.targetHigh);
  return value.inBandPercent === expected.inBandPercent && value.averageWpm === expected.averageWpm;
}

export function validateSessionRecords(value: unknown): SessionRecord[] {
  if (!Array.isArray(value) || value.length > 10_000) throw new Error('Invalid session list.');
  if (!value.every(isSessionRecord)) throw new Error('Invalid session record.');
  const ids = new Set(value.map((session) => session.id));
  if (ids.size !== value.length) throw new Error('Duplicate session identifier.');
  return value;
}

function validateSettings(value: unknown): void {
  if (!isRecord(value) || Object.keys(value).some((key) => !SETTINGS_KEYS.has(key))) throw new Error('Invalid export settings.');
  if (!isIntegerBetween(value.low, 60, 210) || !isIntegerBetween(value.high, 75, 240) || value.high - value.low < 15) throw new Error('Invalid export settings.');
  if (!PATTERNS.has(value.pattern as string)) throw new Error('Invalid export settings.');
  if (value.baseline !== undefined && !isIntegerBetween(value.baseline, 0, 260)) throw new Error('Invalid export settings.');
}

export function sessionsFromImport(value: unknown): SessionRecord[] {
  if (Array.isArray(value)) return validateSessionRecords(value);
  if (!isRecord(value) || !Object.hasOwn(value, 'sessions') || Object.keys(value).some((key) => !EXPORT_KEYS.has(key))) {
    throw new Error('Invalid Pace Trail export.');
  }
  if (value.product !== undefined && value.product !== 'haptic-speaking-pacer') throw new Error('Export belongs to another product.');
  if (value.exportedAt !== undefined && !isIsoDate(value.exportedAt)) throw new Error('Invalid export date.');
  if (value.settings !== undefined) validateSettings(value.settings);
  return validateSessionRecords(value.sessions);
}
